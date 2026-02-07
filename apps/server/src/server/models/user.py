"""Community member model."""

from datetime import datetime
from uuid import uuid4

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    name: str
    display_name: str | None = None
    email: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    auth_token: str = Field(default_factory=lambda: uuid4().hex, unique=True, index=True)
    is_responder: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
