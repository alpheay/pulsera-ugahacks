"""Community zone model — neighborhood, building, campus area, etc."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class Zone(SQLModel, table=True):
    __tablename__ = "zones"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_m: float | None = None  # zone radius in meters
    status: str = Field(default="safe")  # safe, elevated, warning, critical
    anomaly_score: float = Field(default=0.0)
    active_devices: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
