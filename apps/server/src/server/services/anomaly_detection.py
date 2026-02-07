"""Anomaly detection service — orchestrates PulseNet inference on health data."""

import logging
from datetime import datetime

import numpy as np

from ..config import settings
from ..ml.pulsenet.inference import pulsenet_service
from .health import health_service

logger = logging.getLogger(__name__)


class AnomalyDetectionService:
    """Orchestrates PulseNet inference on incoming health data."""

    def __init__(self):
        self._device_scores: dict[str, float] = {}
        self._device_results: dict[str, dict] = {}

    async def initialize(self):
        pulsenet_service.load()

    async def process_reading(self, device_id: str, reading: dict) -> dict | None:
        """Process a new reading. Returns inference result if window is full."""
        window = health_service.get_window(device_id)
        if window is None:
            window = health_service.get_partial_window(device_id)
            if window is None:
                return None

        result = await pulsenet_service.infer(window)

        self._device_scores[device_id] = result.get("overall_score", 0)
        self._device_results[device_id] = result

        return result

    async def infer_window(self, device_id: str, window: np.ndarray) -> dict:
        """Run inference on an explicit window (e.g., from batch upload)."""
        result = await pulsenet_service.infer(window)
        self._device_scores[device_id] = result.get("overall_score", 0)
        self._device_results[device_id] = result
        return result

    def get_device_score(self, device_id: str) -> float:
        return self._device_scores.get(device_id, 0.0)

    def get_device_result(self, device_id: str) -> dict | None:
        return self._device_results.get(device_id)

    def get_all_scores(self) -> dict[str, float]:
        return dict(self._device_scores)

    def get_anomalous_devices(self, threshold: float | None = None) -> list[str]:
        thresh = threshold or settings.ANOMALY_THRESHOLD
        return [did for did, score in self._device_scores.items() if score > thresh]


anomaly_detection_service = AnomalyDetectionService()
