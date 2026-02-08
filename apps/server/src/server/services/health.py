"""Health data ingestion service — buffers readings and maintains sliding windows."""

import logging
from collections import defaultdict, deque
from datetime import datetime

import numpy as np

logger = logging.getLogger(__name__)

WINDOW_SIZE = 60  # 5 minutes at 12-sec intervals


class HealthService:
    """Manages health data ingestion and sliding window buffers per device."""

    def __init__(self):
        self._buffers: dict[str, deque] = defaultdict(lambda: deque(maxlen=WINDOW_SIZE))
        self._latest: dict[str, dict] = {}

    async def ingest_reading(self, reading: dict):
        device_id = reading["device_id"]
        entry = [
            reading.get("heart_rate", 0),
            reading.get("hrv", 0),
            reading.get("acceleration", 1.0),
            reading.get("skin_temp", 36.5),
        ]
        self._buffers[device_id].append(entry)
        self._latest[device_id] = reading

    def get_window(self, device_id: str) -> np.ndarray | None:
        buf = self._buffers.get(device_id)
        if buf is None or len(buf) < WINDOW_SIZE:
            return None
        return np.array(list(buf), dtype=np.float32)

    def get_partial_window(self, device_id: str) -> np.ndarray | None:
        buf = self._buffers.get(device_id)
        if buf is None or len(buf) == 0:
            return None
        data = np.array(list(buf), dtype=np.float32)
        if len(data) < WINDOW_SIZE:
            pad = np.zeros((WINDOW_SIZE - len(data), 4), dtype=np.float32)
            pad[:, 0] = data[0, 0]  # pad with first reading
            pad[:, 1] = data[0, 1]
            pad[:, 2] = data[0, 2]
            pad[:, 3] = data[0, 3]
            data = np.concatenate([pad, data], axis=0)
        return data

    def get_latest(self, device_id: str) -> dict | None:
        return self._latest.get(device_id)

    def get_all_latest(self) -> dict[str, dict]:
        return dict(self._latest)

    def get_active_devices(self) -> list[str]:
        return list(self._buffers.keys())

    def get_buffer_sizes(self) -> dict[str, int]:
        return {did: len(buf) for did, buf in self._buffers.items()}


health_service = HealthService()
