"""
PulseNet — Ground-up Anomaly Detection Transformer (~150K params)
Built entirely from scratch in raw PyTorch. No pre-trained weights.
No fine-tuning. Every parameter learned from our pipeline.

Architecture:
  Input: Sliding window of [heart_rate, hrv, acceleration, skin_temp]
         60 timesteps (5 min at 12-sec intervals), 4 features
  Encoder: Input projection → Positional embeddings → 3x AnomalyAttention layers
  Output: Per-timestep anomaly score + reconstructed signal
"""

import math
import torch
import torch.nn as nn
import torch.nn.functional as F


class PriorAssociation(nn.Module):
    """Learnable Gaussian kernel representing expected attention distribution.
    Models the prior belief that nearby timesteps should attend to each other."""

    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        self.n_heads = n_heads
        self.sigma = nn.Parameter(torch.ones(n_heads) * 1.0)

    def forward(self, seq_len: int, device: torch.device) -> torch.Tensor:
        positions = torch.arange(seq_len, dtype=torch.float32, device=device)
        distances = (positions.unsqueeze(0) - positions.unsqueeze(1)).abs()
        sigma = self.sigma.clamp(min=0.1).view(self.n_heads, 1, 1)
        prior = torch.exp(-0.5 * (distances / sigma) ** 2)
        prior = prior / prior.sum(dim=-1, keepdim=True)
        return prior


class SeriesAssociation(nn.Module):
    """Standard QKV self-attention (actual learned attention pattern)."""

    def __init__(self, d_model: int, n_heads: int):
        super().__init__()
        self.n_heads = n_heads
        self.d_k = d_model // n_heads
        self.W_q = nn.Linear(d_model, d_model)
        self.W_k = nn.Linear(d_model, d_model)
        self.W_v = nn.Linear(d_model, d_model)
        self.W_o = nn.Linear(d_model, d_model)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        B, T, _ = x.shape
        q = self.W_q(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        k = self.W_k(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)
        v = self.W_v(x).view(B, T, self.n_heads, self.d_k).transpose(1, 2)

        scale = math.sqrt(self.d_k)
        attn_scores = torch.matmul(q, k.transpose(-2, -1)) / scale
        attn_weights = F.softmax(attn_scores, dim=-1)

        out = torch.matmul(attn_weights, v)
        out = out.transpose(1, 2).contiguous().view(B, T, -1)
        out = self.W_o(out)
        return out, attn_weights


class AnomalyAttentionLayer(nn.Module):
    """Single anomaly attention block combining prior and series associations.

    The discrepancy between prior (expected) and series (learned) attention
    patterns is what signals anomalies."""

    def __init__(self, d_model: int, n_heads: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.prior_association = PriorAssociation(d_model, n_heads)
        self.series_association = SeriesAssociation(d_model, n_heads)
        self.ff = nn.Sequential(
            nn.Linear(d_model, d_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_ff, d_model),
            nn.Dropout(dropout),
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        residual = x
        x_norm = self.norm1(x)
        attn_out, series_attn = self.series_association(x_norm)
        x = residual + self.dropout(attn_out)

        residual = x
        x = residual + self.ff(self.norm2(x))

        prior_attn = self.prior_association(x.size(1), x.device)
        return x, series_attn, prior_attn


class PulseNet(nn.Module):
    """PulseNet Anomaly Detection Transformer.

    A lightweight transformer trained from scratch for real-time
    wearable health signal anomaly detection.

    Args:
        n_features: Number of input features (default: 4 — HR, HRV, accel, temp)
        seq_len: Sequence length (default: 60 — 5 min at 12-sec intervals)
        d_model: Model dimension (default: 64)
        n_heads: Number of attention heads (default: 4)
        n_layers: Number of anomaly attention layers (default: 3)
        d_ff: Feed-forward hidden dimension (default: 128)
        dropout: Dropout rate (default: 0.1)
    """

    def __init__(
        self,
        n_features: int = 4,
        seq_len: int = 60,
        d_model: int = 64,
        n_heads: int = 4,
        n_layers: int = 3,
        d_ff: int = 128,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.n_features = n_features
        self.seq_len = seq_len
        self.d_model = d_model
        self.n_layers = n_layers

        self.input_projection = nn.Linear(n_features, d_model)
        self.positional_embedding = nn.Parameter(
            torch.randn(1, seq_len, d_model) * 0.02
        )
        self.input_dropout = nn.Dropout(dropout)

        self.layers = nn.ModuleList([
            AnomalyAttentionLayer(d_model, n_heads, d_ff, dropout)
            for _ in range(n_layers)
        ])

        self.reconstruction_head = nn.Linear(d_model, n_features)
        self.anomaly_head = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Linear(d_model // 2, 1),
        )

        self._init_weights()

    def _init_weights(self):
        for p in self.parameters():
            if p.dim() > 1:
                nn.init.xavier_uniform_(p)

    def forward(
        self, x: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, list[torch.Tensor], list[torch.Tensor]]:
        """
        Args:
            x: Input tensor of shape (batch, seq_len, n_features)

        Returns:
            reconstruction: Reconstructed input (batch, seq_len, n_features)
            anomaly_scores: Per-timestep anomaly scores (batch, seq_len, 1)
            series_attentions: List of series attention weights per layer
            prior_attentions: List of prior attention weights per layer
        """
        h = self.input_projection(x) + self.positional_embedding[:, :x.size(1), :]
        h = self.input_dropout(h)

        series_attentions = []
        prior_attentions = []

        for layer in self.layers:
            h, series_attn, prior_attn = layer(h)
            series_attentions.append(series_attn)
            prior_attentions.append(prior_attn)

        reconstruction = self.reconstruction_head(h)
        anomaly_scores = torch.sigmoid(self.anomaly_head(h))

        return reconstruction, anomaly_scores, series_attentions, prior_attentions

    def compute_association_discrepancy(
        self, series_attentions: list[torch.Tensor], prior_attentions: list[torch.Tensor]
    ) -> torch.Tensor:
        """Compute KL divergence between series and prior attention (association discrepancy).
        High discrepancy = anomalous timestep."""
        total_kl = 0.0
        for series, prior in zip(series_attentions, prior_attentions):
            # series: [B, n_heads, T, T], prior: [n_heads, T, T]
            series_mean = series.mean(dim=1)  # [B, T, T]
            prior_mean = prior.mean(dim=0)  # [T, T]
            prior_expanded = prior_mean.unsqueeze(0).expand_as(series_mean)  # [B, T, T]
            kl = F.kl_div(
                (series_mean + 1e-8).log(),
                prior_expanded,
                reduction="none",
            ).sum(dim=-1)
            total_kl = total_kl + kl.mean(dim=-1)
        return total_kl / len(series_attentions)

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


def build_pulsenet(**kwargs) -> PulseNet:
    """Factory function to create a PulseNet model."""
    model = PulseNet(**kwargs)
    print(f"PulseNet created: {model.count_parameters():,} trainable parameters")
    return model
