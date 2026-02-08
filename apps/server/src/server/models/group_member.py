"""Group membership model."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class GroupMember(SQLModel, table=True):
    __tablename__ = "group_members"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    group_id: str = Field(foreign_key="groups.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    role: str = Field(default="member")  # "owner" | "admin" | "member"
    joined_at: datetime = Field(default_factory=datetime.utcnow)
