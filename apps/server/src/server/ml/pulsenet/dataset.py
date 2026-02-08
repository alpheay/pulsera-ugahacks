"""
Synthetic data generator for PulseNet training.

Generates realistic wearable health data windows:
  - heart_rate (BPM)
  - hrv (ms)
  - acceleration (g-force magnitude)
  - skin_temp (°C)

Includes normal patterns, exercise patterns, and injected anomalies.
"""

import numpy as np
import torch
from torch.utils.data import Dataset


class PulseNetDataset(Dataset):
    """Synthetic wearable health data for anomaly detection training.

    Args:
        n_samples: Number of windows to generate
        seq_len: Timesteps per window (default: 60)
        anomaly_ratio: Fraction of windows that contain anomalies
        seed: Random seed for reproducibility
    """

    def __init__(
        self,
        n_samples: int = 50000,
        seq_len: int = 60,
        anomaly_ratio: float = 0.3,
        seed: int = 42,
    ):
        self.n_samples = n_samples
        self.seq_len = seq_len
        self.anomaly_ratio = anomaly_ratio
        self.rng = np.random.RandomState(seed)

        self.data, self.labels, self.anomaly_masks = self._generate()

    def _generate(self) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        n_normal = int(self.n_samples * (1 - self.anomaly_ratio))
        n_anomaly = self.n_samples - n_normal

        normal_data = np.stack([self._gen_normal() for _ in range(n_normal)])
        normal_labels = np.zeros(n_normal, dtype=np.float32)
        normal_masks = np.zeros((n_normal, self.seq_len), dtype=np.float32)

        anomaly_data = []
        anomaly_labels = []
        anomaly_masks = []
        for _ in range(n_anomaly):
            window, mask = self._gen_anomaly()
            anomaly_data.append(window)
            anomaly_labels.append(1.0)
            anomaly_masks.append(mask)

        anomaly_data = np.stack(anomaly_data)
        anomaly_labels = np.array(anomaly_labels, dtype=np.float32)
        anomaly_masks = np.stack(anomaly_masks)

        data = np.concatenate([normal_data, anomaly_data], axis=0)
        labels = np.concatenate([normal_labels, anomaly_labels], axis=0)
        masks = np.concatenate([normal_masks, anomaly_masks], axis=0)

        shuffle_idx = self.rng.permutation(len(data))
        return data[shuffle_idx], labels[shuffle_idx], masks[shuffle_idx]

    def _gen_normal(self) -> np.ndarray:
        """Generate a normal health data window."""
        pattern = self.rng.choice(["resting", "light_activity", "exercise", "sleep"])
        t = np.arange(self.seq_len, dtype=np.float32)

        if pattern == "resting":
            hr = self.rng.uniform(62, 78) + self.rng.randn(self.seq_len) * 2
            hrv = self.rng.uniform(40, 70) + self.rng.randn(self.seq_len) * 5
            accel = self.rng.uniform(0.95, 1.05, self.seq_len)
            temp = self.rng.uniform(36.2, 36.8) + self.rng.randn(self.seq_len) * 0.1

        elif pattern == "light_activity":
            hr = self.rng.uniform(80, 100) + np.sin(t * 0.1) * 3 + self.rng.randn(self.seq_len) * 3
            hrv = self.rng.uniform(30, 50) + self.rng.randn(self.seq_len) * 4
            accel = self.rng.uniform(1.0, 1.5, self.seq_len) + np.sin(t * 0.3) * 0.2
            temp = self.rng.uniform(36.5, 37.0) + self.rng.randn(self.seq_len) * 0.1

        elif pattern == "exercise":
            ramp = np.linspace(0, 1, self.seq_len)
            hr = 80 + ramp * 60 + self.rng.randn(self.seq_len) * 4
            hrv = 50 - ramp * 20 + self.rng.randn(self.seq_len) * 3
            accel = 1.0 + ramp * 2.0 + np.sin(t * 0.5) * 0.3 + self.rng.randn(self.seq_len) * 0.2
            temp = 36.5 + ramp * 0.8 + self.rng.randn(self.seq_len) * 0.1

        else:  # sleep
            hr = self.rng.uniform(55, 65) + np.sin(t * 0.05) * 3 + self.rng.randn(self.seq_len) * 1.5
            hrv = self.rng.uniform(50, 80) + self.rng.randn(self.seq_len) * 4
            accel = self.rng.uniform(0.95, 1.02, self.seq_len)
            temp = self.rng.uniform(35.8, 36.5) + self.rng.randn(self.seq_len) * 0.1

        return np.stack([hr, hrv, accel, temp], axis=-1).astype(np.float32)

    def _gen_anomaly(self) -> tuple[np.ndarray, np.ndarray]:
        """Generate a window with injected anomaly. Returns (window, anomaly_mask)."""
        window = self._gen_normal()
        mask = np.zeros(self.seq_len, dtype=np.float32)

        anomaly_type = self.rng.choice([
            "hr_spike", "hr_drop", "hr_flatline", "hr_irregular",
            "multi_signal", "sudden_collapse", "stress_response",
        ])

        start = self.rng.randint(5, self.seq_len - 15)
        duration = self.rng.randint(5, min(15, self.seq_len - start))
        end = start + duration
        mask[start:end] = 1.0

        if anomaly_type == "hr_spike":
            window[start:end, 0] += self.rng.uniform(30, 60)
            window[start:end, 1] -= self.rng.uniform(15, 30)

        elif anomaly_type == "hr_drop":
            window[start:end, 0] -= self.rng.uniform(20, 40)
            window[start:end, 1] += self.rng.uniform(10, 30)

        elif anomaly_type == "hr_flatline":
            flat_val = window[start, 0]
            window[start:end, 0] = flat_val
            window[start:end, 1] = 0

        elif anomaly_type == "hr_irregular":
            window[start:end, 0] += self.rng.randn(duration) * 20
            window[start:end, 1] = self.rng.uniform(5, 15, duration)

        elif anomaly_type == "multi_signal":
            window[start:end, 0] += self.rng.uniform(20, 50)
            window[start:end, 2] += self.rng.uniform(1, 3)
            window[start:end, 3] += self.rng.uniform(0.5, 1.5)

        elif anomaly_type == "sudden_collapse":
            window[start:end, 0] = self.rng.uniform(30, 45, duration)
            window[start:end, 2] += self.rng.uniform(3, 8)
            window[start:end, 3] -= self.rng.uniform(0.5, 1.0)

        elif anomaly_type == "stress_response":
            ramp = np.linspace(0, 1, duration)
            window[start:end, 0] += ramp * self.rng.uniform(25, 45)
            window[start:end, 1] -= ramp * self.rng.uniform(15, 25)
            window[start:end, 3] += ramp * self.rng.uniform(0.3, 0.8)

        return window, mask

    def get_normalization_stats(self) -> tuple[np.ndarray, np.ndarray]:
        """Compute mean and std for normalization."""
        mean = self.data.reshape(-1, 4).mean(axis=0)
        std = self.data.reshape(-1, 4).std(axis=0)
        return mean, std

    def __len__(self) -> int:
        return self.n_samples

    def __getitem__(self, idx: int) -> dict:
        return {
            "input": torch.tensor(self.data[idx], dtype=torch.float32),
            "label": torch.tensor(self.labels[idx], dtype=torch.float32),
            "anomaly_mask": torch.tensor(self.anomaly_masks[idx], dtype=torch.float32),
        }


class CommunityAnomalyDataset(Dataset):
    """Generates correlated anomaly windows across multiple simulated community members.
    Used to train/validate community-level pattern detection."""

    def __init__(
        self,
        n_samples: int = 5000,
        n_members: int = 5,
        seq_len: int = 60,
        seed: int = 123,
    ):
        self.n_samples = n_samples
        self.n_members = n_members
        self.seq_len = seq_len
        self.rng = np.random.RandomState(seed)

        self.data, self.labels = self._generate()

    def _generate(self) -> tuple[np.ndarray, np.ndarray]:
        base_gen = PulseNetDataset(
            n_samples=self.n_samples * self.n_members,
            seq_len=self.seq_len,
            anomaly_ratio=0.0,
            seed=self.rng.randint(0, 100000),
        )

        data = []
        labels = []

        for i in range(self.n_samples):
            members = []
            for j in range(self.n_members):
                idx = i * self.n_members + j
                members.append(base_gen.data[idx].copy())

            is_community_anomaly = self.rng.random() < 0.3
            if is_community_anomaly:
                start = self.rng.randint(10, self.seq_len - 20)
                duration = self.rng.randint(8, 15)
                n_affected = self.rng.randint(3, self.n_members + 1)
                affected = self.rng.choice(self.n_members, n_affected, replace=False)
                for m_idx in affected:
                    delay = self.rng.randint(0, 5)
                    s = min(start + delay, self.seq_len - duration)
                    members[m_idx][s:s + duration, 0] += self.rng.uniform(15, 35)
                    members[m_idx][s:s + duration, 1] -= self.rng.uniform(10, 20)
                labels.append(1.0)
            else:
                labels.append(0.0)

            data.append(np.stack(members))

        return np.array(data, dtype=np.float32), np.array(labels, dtype=np.float32)

    def __len__(self) -> int:
        return self.n_samples

    def __getitem__(self, idx: int) -> dict:
        return {
            "members": torch.tensor(self.data[idx], dtype=torch.float32),
            "label": torch.tensor(self.labels[idx], dtype=torch.float32),
        }
