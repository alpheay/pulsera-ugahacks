"""Group model — family or community group."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class Group(SQLModel, table=True):
    __tablename__ = "groups"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    description: str | None = None
    type: str = Field(default="family")  # "family" | "community"
    invite_code: str = Field(default_factory=lambda: uuid4().hex[:8], unique=True)
    created_by: str = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
