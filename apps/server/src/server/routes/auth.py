"""Authentication routes — simple token-based auth."""

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db import get_session
from ..models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    display_name: str | None = None
    email: str | None = None


class LoginRequest(BaseModel):
    email: str | None = None
    token: str | None = None


class AuthResponse(BaseModel):
    user_id: str
    name: str
    display_name: str | None
    token: str


async def get_current_user(
    authorization: str | None = Header(None),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    token = authorization.replace("Bearer ", "")
    result = await session.exec(select(User).where(User.auth_token == token))
    user = result.first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, session: AsyncSession = Depends(get_session)):
    user = User(
        name=req.name,
        display_name=req.display_name or req.name,
        email=req.email,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return AuthResponse(
        user_id=user.id,
        name=user.name,
        display_name=user.display_name,
        token=user.auth_token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, session: AsyncSession = Depends(get_session)):
    if req.token:
        result = await session.exec(select(User).where(User.auth_token == req.token))
    elif req.email:
        result = await session.exec(select(User).where(User.email == req.email))
    else:
        raise HTTPException(status_code=400, detail="Provide email or token")
    user = result.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return AuthResponse(
        user_id=user.id,
        name=user.name,
        display_name=user.display_name,
        token=user.auth_token,
    )


@router.get("/me", response_model=AuthResponse)
async def me(
    user: User = Depends(get_current_user),
):
    return AuthResponse(
        user_id=user.id,
        name=user.name,
        display_name=user.display_name,
        token=user.auth_token,
    )
