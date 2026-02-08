"""PulseNet model API — for the judge-killer visualizer screen."""

import json
from pathlib import Path

import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel

from ..ml.pulsenet.inference import pulsenet_service
from ..ml.pulsenet.dataset import PulseNetDataset
from ..services.anomaly_detection import anomaly_detection_service

router = APIRouter(prefix="/api/pulsenet", tags=["pulsenet"])


class InferRequest(BaseModel):
    window: list[list[float]]  # 60x4 array


@router.get("/status")
async def model_status():
    """Get PulseNet model status and info."""
    if pulsenet_service.model is None:
        return {"loaded": False}
    return {
        "loaded": True,
        "parameters": pulsenet_service.model.count_parameters(),
        "device": str(pulsenet_service.device),
        "checkpoint_dir": str(pulsenet_service.checkpoint_dir),
    }


@router.post("/infer")
async def run_inference(body: InferRequest):
    """Run PulseNet inference on a provided window. Returns full visualization data."""
    window = np.array(body.window, dtype=np.float32)
    result = await pulsenet_service.infer(window)
    return result


@router.get("/demo")
async def demo_inference():
    """Generate a random demo window and run inference — for live demos."""
    dataset = PulseNetDataset(n_samples=2, seq_len=60, anomaly_ratio=0.5, seed=None)
    sample = dataset[0]
    window = sample["input"].numpy()
    label = sample["label"].item()
    anomaly_mask = sample["anomaly_mask"].numpy().tolist()

    result = await pulsenet_service.infer(window)
    return {
        "input": window.tolist(),
        "ground_truth_label": label,
        "ground_truth_mask": anomaly_mask,
        **result,
    }


@router.get("/training-history")
async def training_history():
    """Get training history for visualization."""
    history_path = Path(pulsenet_service.checkpoint_dir) / "training_history.json"
    if not history_path.exists():
        return {"available": False}
    with open(history_path) as f:
        return {"available": True, "history": json.load(f)}


@router.get("/architecture")
async def architecture():
    """Return PulseNet architecture details for display."""
    return {
        "name": "PulseNet",
        "type": "Anomaly Detection Transformer",
        "parameters": pulsenet_service.model.count_parameters() if pulsenet_service.model else 0,
        "layers": [
            {"name": "Input Projection", "type": "Linear", "shape": "4 → 64"},
            {"name": "Positional Embedding", "type": "Learnable", "shape": "60 × 64"},
            {"name": "Anomaly Attention Layer 1", "type": "AnomalyAttention", "components": [
                "Prior-Association (Gaussian kernel)",
                "Series-Association (QKV self-attention)",
                "Feed-Forward (64→128→64, GELU)",
                "LayerNorm + Residual",
            ]},
            {"name": "Anomaly Attention Layer 2", "type": "AnomalyAttention", "components": [
                "Prior-Association (Gaussian kernel)",
                "Series-Association (QKV self-attention)",
                "Feed-Forward (64→128→64, GELU)",
                "LayerNorm + Residual",
            ]},
            {"name": "Anomaly Attention Layer 3", "type": "AnomalyAttention", "components": [
                "Prior-Association (Gaussian kernel)",
                "Series-Association (QKV self-attention)",
                "Feed-Forward (64→128→64, GELU)",
                "LayerNorm + Residual",
            ]},
            {"name": "Reconstruction Head", "type": "Linear", "shape": "64 → 4"},
            {"name": "Anomaly Head", "type": "MLP", "shape": "64 → 32 → 1, Sigmoid"},
        ],
        "training": {
            "loss": "MSE reconstruction + KL divergence (association discrepancy)",
            "strategy": "Minimax — minimize discrepancy on normal, maximize on anomalies",
            "data": "Synthetic + PhysioNet (50K windows)",
            "optimizer": "AdamW (lr=1e-3, weight_decay=1e-4)",
            "scheduler": "CosineAnnealing",
        },
        "pretrained_weights": False,
        "fine_tuned": False,
        "tagline": "No pre-trained weights. No fine-tuning. Every parameter learned from our pipeline.",
    }
