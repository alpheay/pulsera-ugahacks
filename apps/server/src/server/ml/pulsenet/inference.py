"""
PulseNet Real-Time Inference Service

Loads trained model checkpoint, provides async inference for the backend.
Runs in a ThreadPoolExecutor to avoid blocking the event loop.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import torch

from .model import PulseNet


class PulseNetInferenceService:
    """Real-time inference service for PulseNet anomaly detection."""

    def __init__(self, checkpoint_dir: str = "checkpoints"):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.model: PulseNet | None = None
        self.device: torch.device | None = None
        self.mean: np.ndarray | None = None
        self.std: np.ndarray | None = None
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="pulsenet")
        self._lock = asyncio.Semaphore(2)
        self._loaded = False

    def load(self) -> bool:
        """Load model from checkpoint. Returns True if successful."""
        try:
            if torch.backends.mps.is_available():
                self.device = torch.device("mps")
            elif torch.cuda.is_available():
                self.device = torch.device("cuda")
            else:
                self.device = torch.device("cpu")

            checkpoint_path = self.checkpoint_dir / "pulsenet_best.pt"
            if not checkpoint_path.exists():
                checkpoint_path = self.checkpoint_dir / "pulsenet_final.pt"

            if not checkpoint_path.exists():
                print("No PulseNet checkpoint found. Using random weights for demo.")
                self.model = PulseNet().to(self.device)
                self.mean = np.array([72.0, 50.0, 1.0, 36.5], dtype=np.float32)
                self.std = np.array([15.0, 15.0, 0.5, 0.5], dtype=np.float32)
                self._loaded = True
                return True

            checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
            config = checkpoint.get("config", {})
            self.model = PulseNet(
                seq_len=config.get("seq_len", 60),
                n_features=config.get("n_features", 4),
                d_model=config.get("d_model", 64),
                n_heads=config.get("n_heads", 4),
                n_layers=config.get("n_layers", 3),
                d_ff=config.get("d_ff", 128),
            ).to(self.device)
            self.model.load_state_dict(checkpoint["model_state_dict"])
            self.model.eval()

            mean_path = self.checkpoint_dir / "norm_mean.npy"
            std_path = self.checkpoint_dir / "norm_std.npy"
            if mean_path.exists() and std_path.exists():
                self.mean = np.load(mean_path)
                self.std = np.load(std_path)
            else:
                self.mean = np.array([72.0, 50.0, 1.0, 36.5], dtype=np.float32)
                self.std = np.array([15.0, 15.0, 0.5, 0.5], dtype=np.float32)

            self._loaded = True
            print(f"PulseNet loaded from {checkpoint_path} ({self.model.count_parameters():,} params)")
            return True

        except Exception as e:
            print(f"Failed to load PulseNet: {e}")
            return False

    def _infer_sync(self, window: np.ndarray) -> dict:
        """Synchronous inference on a single window. Called in thread pool."""
        if self.model is None:
            return {"error": "Model not loaded"}

        x = torch.tensor(window, dtype=torch.float32)
        if x.dim() == 2:
            x = x.unsqueeze(0)

        mean_t = torch.tensor(self.mean, dtype=torch.float32, device=self.device)
        std_t = torch.tensor(self.std, dtype=torch.float32, device=self.device)

        x = x.to(self.device)
        x_norm = (x - mean_t) / (std_t + 1e-8)

        with torch.no_grad():
            reconstruction, anomaly_scores, series_attns, prior_attns = self.model(x_norm)
            discrepancy = self.model.compute_association_discrepancy(series_attns, prior_attns)

        recon_np = reconstruction[0].cpu().numpy()
        recon_denorm = recon_np * (self.std + 1e-8) + self.mean

        scores_np = anomaly_scores[0, :, 0].cpu().numpy()
        disc_np = discrepancy[0].cpu().item()

        series_attn_np = series_attns[-1][0].cpu().numpy().mean(axis=0).tolist()
        prior_attn_np = prior_attns[-1][0].cpu().numpy().tolist()

        overall_score = float(np.mean(scores_np))
        max_score = float(np.max(scores_np))
        is_anomaly = max_score > 0.5

        return {
            "overall_score": overall_score,
            "max_score": max_score,
            "is_anomaly": is_anomaly,
            "per_timestep_scores": scores_np.tolist(),
            "reconstruction": recon_denorm.tolist(),
            "association_discrepancy": disc_np,
            "attention_heatmap": series_attn_np,
            "prior_attention": prior_attn_np,
        }

    async def infer(self, window: np.ndarray) -> dict:
        """Async inference — runs in thread pool to avoid blocking."""
        if not self._loaded:
            self.load()
        async with self._lock:
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(self._executor, self._infer_sync, window)

    def infer_batch_sync(self, windows: np.ndarray) -> list[dict]:
        """Synchronous batch inference on multiple windows."""
        if self.model is None:
            return [{"error": "Model not loaded"}] * len(windows)

        x = torch.tensor(windows, dtype=torch.float32).to(self.device)
        mean_t = torch.tensor(self.mean, dtype=torch.float32, device=self.device)
        std_t = torch.tensor(self.std, dtype=torch.float32, device=self.device)
        x_norm = (x - mean_t) / (std_t + 1e-8)

        with torch.no_grad():
            reconstruction, anomaly_scores, series_attns, prior_attns = self.model(x_norm)

        results = []
        for i in range(len(windows)):
            scores_np = anomaly_scores[i, :, 0].cpu().numpy()
            overall = float(np.mean(scores_np))
            max_s = float(np.max(scores_np))
            results.append({
                "overall_score": overall,
                "max_score": max_s,
                "is_anomaly": max_s > 0.5,
                "per_timestep_scores": scores_np.tolist(),
            })
        return results


pulsenet_service = PulseNetInferenceService()
