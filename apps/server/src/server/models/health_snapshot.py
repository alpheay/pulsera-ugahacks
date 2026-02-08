"""Health snapshot model — stores periodic health readings."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class HealthSnapshot(SQLModel, table=True):
    __tablename__ = "health_snapshots"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    device_id: str = Field(foreign_key="devices.id", index=True)
    heart_rate: float = 0.0
    hrv: float = 0.0
    acceleration: float = 1.0
    skin_temp: float = 36.5
    status: str = Field(default="normal")  # "normal" | "elevated" | "critical"
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
