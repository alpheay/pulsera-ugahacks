"""Community alerts generated from anomaly events."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Column, Field, SQLModel
from sqlalchemy import JSON


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    zone_id: str | None = Field(default=None, foreign_key="zones.id", index=True)
    group_id: str | None = Field(default=None, foreign_key="groups.id", index=True)
    alert_type: str = Field(default="individual")  # individual, community, environmental
    severity: str = Field(default="warning")  # info, warning, critical
    title: str
    description: str
    ai_summary: str | None = None
    affected_devices: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    score: float = 0.0
    is_active: bool = Field(default=True)
    acknowledged_by: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    resolved_at: datetime | None = None
