"""Timestamped health data from wearable devices."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class HealthReading(SQLModel, table=True):
    __tablename__ = "health_readings"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    device_id: str = Field(foreign_key="devices.id", index=True)
    heart_rate: float
    hrv: float  # heart rate variability in ms
    acceleration: float  # g-force magnitude
    skin_temp: float  # degrees Celsius
    anomaly_score: float | None = None
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
