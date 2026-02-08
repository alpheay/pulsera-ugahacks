"""Device-to-Zone membership."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class ZoneMember(SQLModel, table=True):
    __tablename__ = "zone_members"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    zone_id: str = Field(foreign_key="zones.id", index=True)
    device_id: str = Field(foreign_key="devices.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    joined_at: datetime = Field(default_factory=datetime.utcnow)
