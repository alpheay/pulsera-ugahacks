"""
PulseNet Training Script

Minimax training:
  Phase 1 (Minimize): Train to reconstruct normal data well, minimize association discrepancy
  Phase 2 (Maximize): Train to produce high discrepancy on anomalous data

Trains on synthetic data. ~1-2 hours on Apple Silicon MPS.
"""

import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split

from .model import build_pulsenet
from .dataset import PulseNetDataset


def get_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    elif torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def train_pulsenet(
    n_samples: int = 50000,
    batch_size: int = 128,
    n_epochs: int = 30,
    lr: float = 1e-3,
    output_dir: str = "checkpoints",
    seq_len: int = 60,
) -> dict:
    device = get_device()
    print(f"Training on: {device}")

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print("Generating synthetic training data...")
    dataset = PulseNetDataset(n_samples=n_samples, seq_len=seq_len, anomaly_ratio=0.3)
    mean, std = dataset.get_normalization_stats()
    np.save(output_path / "norm_mean.npy", mean)
    np.save(output_path / "norm_std.npy", std)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, drop_last=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

    model = build_pulsenet(seq_len=seq_len).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=n_epochs)
    mse_loss_fn = nn.MSELoss(reduction="none")

    history = {
        "train_loss": [], "val_loss": [],
        "train_recon_loss": [], "val_recon_loss": [],
        "train_anomaly_auc": [], "val_anomaly_auc": [],
    }

    mean_t = torch.tensor(mean, dtype=torch.float32, device=device)
    std_t = torch.tensor(std, dtype=torch.float32, device=device)

    best_val_loss = float("inf")
    start_time = time.time()

    for epoch in range(n_epochs):
        model.train()
        epoch_losses = {"total": 0, "recon": 0, "discrepancy": 0, "anomaly": 0}
        n_batches = 0

        for batch in train_loader:
            x = batch["input"].to(device)
            labels = batch["label"].to(device)
            anomaly_mask = batch["anomaly_mask"].to(device)

            x_norm = (x - mean_t) / (std_t + 1e-8)

            reconstruction, anomaly_scores, series_attns, prior_attns = model(x_norm)

            recon_loss = mse_loss_fn(reconstruction, x_norm).mean(dim=-1)  # [B, T]

            normal_mask_b = (labels == 0).float()  # [B]
            anomaly_mask_b = (labels == 1).float()  # [B]

            # Reconstruction loss: normal samples should be well-reconstructed
            recon_per_sample = recon_loss.mean(dim=-1)  # [B]
            normal_recon = (recon_per_sample * normal_mask_b).sum() / (normal_mask_b.sum() + 1e-8)

            # Anomaly score loss (binary cross-entropy on per-timestep predictions)
            anomaly_target = anomaly_mask.unsqueeze(-1)  # [B, T, 1]
            anomaly_loss = nn.functional.binary_cross_entropy(
                anomaly_scores, anomaly_target, reduction="mean"
            )

            # Association discrepancy: use L1 between series and prior as simpler metric
            disc_loss = torch.tensor(0.0, device=device)
            for series, prior in zip(series_attns, prior_attns):
                series_avg = series.mean(dim=1)  # [B, T, T]
                prior_avg = prior.mean(dim=0).unsqueeze(0).expand_as(series_avg)  # [B, T, T]
                diff = (series_avg - prior_avg).abs().mean(dim=(-1, -2))  # [B]
                # Minimize discrepancy for normal, maximize for anomaly
                normal_d = (diff * normal_mask_b).sum() / (normal_mask_b.sum() + 1e-8)
                anomaly_d = (diff * anomaly_mask_b).sum() / (anomaly_mask_b.sum() + 1e-8)
                disc_loss = disc_loss + normal_d - 0.1 * anomaly_d

            loss = normal_recon + anomaly_loss + 0.1 * disc_loss

            optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            epoch_losses["total"] += loss.item()
            epoch_losses["recon"] += normal_recon.item()
            epoch_losses["discrepancy"] += disc_loss.item()
            epoch_losses["anomaly"] += anomaly_loss.item()
            n_batches += 1

        scheduler.step()

        avg_train_loss = epoch_losses["total"] / n_batches
        avg_recon_loss = epoch_losses["recon"] / n_batches

        model.eval()
        val_total = 0
        val_recon = 0
        val_batches = 0
        all_scores = []
        all_labels = []

        with torch.no_grad():
            for batch in val_loader:
                x = batch["input"].to(device)
                labels = batch["label"].to(device)
                anomaly_mask = batch["anomaly_mask"].to(device)

                x_norm = (x - mean_t) / (std_t + 1e-8)
                reconstruction, anomaly_scores, series_attns, prior_attns = model(x_norm)

                recon_loss = mse_loss_fn(reconstruction, x_norm).mean()
                discrepancy = model.compute_association_discrepancy(series_attns, prior_attns)

                val_total += recon_loss.item() + discrepancy.mean().item()
                val_recon += recon_loss.item()
                val_batches += 1

                window_scores = anomaly_scores.squeeze(-1).mean(dim=-1)
                all_scores.append(window_scores.cpu())
                all_labels.append(labels.cpu())

        avg_val_loss = val_total / val_batches
        avg_val_recon = val_recon / val_batches

        all_scores = torch.cat(all_scores).numpy()
        all_labels = torch.cat(all_labels).numpy()
        auc = _compute_auc(all_scores, all_labels)

        history["train_loss"].append(avg_train_loss)
        history["val_loss"].append(avg_val_loss)
        history["train_recon_loss"].append(avg_recon_loss)
        history["val_recon_loss"].append(avg_val_recon)
        history["val_anomaly_auc"].append(auc)

        elapsed = time.time() - start_time
        print(
            f"Epoch {epoch + 1}/{n_epochs} | "
            f"Train Loss: {avg_train_loss:.4f} | Val Loss: {avg_val_loss:.4f} | "
            f"AUC: {auc:.4f} | Time: {elapsed:.0f}s"
        )

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save({
                "model_state_dict": model.state_dict(),
                "epoch": epoch,
                "val_loss": avg_val_loss,
                "auc": auc,
                "config": {
                    "seq_len": seq_len,
                    "n_features": 4,
                    "d_model": 64,
                    "n_heads": 4,
                    "n_layers": 3,
                    "d_ff": 128,
                },
            }, output_path / "pulsenet_best.pt")
            print(f"  -> Saved best model (val_loss={avg_val_loss:.4f}, AUC={auc:.4f})")

    torch.save({
        "model_state_dict": model.state_dict(),
        "epoch": n_epochs - 1,
        "config": {
            "seq_len": seq_len,
            "n_features": 4,
            "d_model": 64,
            "n_heads": 4,
            "n_layers": 3,
            "d_ff": 128,
        },
    }, output_path / "pulsenet_final.pt")

    with open(output_path / "training_history.json", "w") as f:
        json.dump(history, f, indent=2)

    total_time = time.time() - start_time
    print(f"\nTraining complete in {total_time:.0f}s")
    print(f"Best val loss: {best_val_loss:.4f}")
    print(f"Checkpoints saved to: {output_path}")

    return history


def _compute_auc(scores: np.ndarray, labels: np.ndarray) -> float:
    """Simple AUC computation without sklearn dependency."""
    if len(np.unique(labels)) < 2:
        return 0.5
    pos = scores[labels == 1]
    neg = scores[labels == 0]
    n_pos = len(pos)
    n_neg = len(neg)
    if n_pos == 0 or n_neg == 0:
        return 0.5
    correct = sum((p > n) + 0.5 * (p == n) for p in pos for n in neg)
    return correct / (n_pos * n_neg)


if __name__ == "__main__":
    train_pulsenet(
        n_samples=50000,
        batch_size=128,
        n_epochs=30,
        output_dir="checkpoints",
    )
