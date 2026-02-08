"""Wearable device model."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class Device(SQLModel, table=True):
    __tablename__ = "devices"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str = Field(default="Wearable")
    device_type: str = Field(default="watch")  # watch, simulator, phone
    platform: str = Field(default="simulator")  # "apple_watch" | "simulator"
    is_online: bool = Field(default=False)
    last_seen: datetime | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
