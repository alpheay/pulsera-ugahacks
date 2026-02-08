"""Detected anomaly events from PulseNet."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Column, Field, SQLModel
from sqlalchemy import JSON


class AnomalyEvent(SQLModel, table=True):
    __tablename__ = "anomaly_events"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    device_id: str = Field(foreign_key="devices.id", index=True)
    zone_id: str | None = Field(default=None, foreign_key="zones.id", index=True)
    anomaly_type: str = Field(default="individual")  # individual, community
    severity: str = Field(default="warning")  # info, warning, critical
    score: float = 0.0
    details: dict = Field(default_factory=dict, sa_column=Column(JSON))
    resolved: bool = Field(default=False)
    timestamp: datetime = Field(default_factory=datetime.utcnow, index=True)
