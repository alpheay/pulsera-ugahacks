"""Group management routes — create, join, list groups."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db import get_session
from ..models.group import Group
from ..models.group_member import GroupMember
from ..models.user import User
from ..services.health import health_service
from ..services.anomaly_detection import anomaly_detection_service
from .auth import get_current_user

router = APIRouter(prefix="/api/groups", tags=["groups"])


class CreateGroupRequest(BaseModel):
    name: str
    description: str | None = None
    type: str = "family"  # "family" | "community"


class JoinGroupRequest(BaseModel):
    invite_code: str


class GroupResponse(BaseModel):
    id: str
    name: str
    description: str | None
    type: str
    invite_code: str
    created_by: str
    created_at: str
    member_count: int = 0


class MemberHealth(BaseModel):
    user_id: str
    name: str
    display_name: str | None
    heart_rate: float | None = None
    hrv: float | None = None
    status: str = "unknown"
    anomaly_score: float = 0.0
    last_updated: str | None = None


class GroupDetailResponse(BaseModel):
    id: str
    name: str
    description: str | None
    type: str
    invite_code: str
    created_by: str
    created_at: str
    members: list[MemberHealth]


@router.post("", response_model=GroupResponse)
async def create_group(
    req: CreateGroupRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if req.type not in ("family", "community"):
        raise HTTPException(status_code=400, detail="Type must be 'family' or 'community'")

    group = Group(
        name=req.name,
        description=req.description,
        type=req.type,
        created_by=user.id,
    )
    session.add(group)
    await session.flush()

    membership = GroupMember(
        group_id=group.id,
        user_id=user.id,
        role="owner",
    )
    session.add(membership)
    await session.commit()
    await session.refresh(group)

    return GroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        type=group.type,
        invite_code=group.invite_code,
        created_by=group.created_by,
        created_at=group.created_at.isoformat(),
        member_count=1,
    )


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(GroupMember).where(GroupMember.user_id == user.id)
    )
    memberships = result.all()
    group_ids = [m.group_id for m in memberships]

    if not group_ids:
        return []

    result = await session.exec(select(Group).where(Group.id.in_(group_ids)))
    groups = result.all()

    responses = []
    for g in groups:
        count_result = await session.exec(
            select(GroupMember).where(GroupMember.group_id == g.id)
        )
        count = len(count_result.all())
        responses.append(GroupResponse(
            id=g.id,
            name=g.name,
            description=g.description,
            type=g.type,
            invite_code=g.invite_code,
            created_by=g.created_by,
            created_at=g.created_at.isoformat(),
            member_count=count,
        ))

    return responses


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Verify membership
    result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id,
        )
    )
    if not result.first():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Get members with health data
    result = await session.exec(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    memberships = result.all()

    members = []
    for m in memberships:
        user_result = await session.exec(select(User).where(User.id == m.user_id))
        member_user = user_result.first()
        if not member_user:
            continue

        # Get latest health from in-memory service
        latest = _get_user_health(m.user_id)
        members.append(MemberHealth(
            user_id=m.user_id,
            name=member_user.name,
            display_name=member_user.display_name,
            heart_rate=latest.get("heart_rate"),
            hrv=latest.get("hrv"),
            status=latest.get("status", "unknown"),
            anomaly_score=latest.get("anomaly_score", 0.0),
            last_updated=latest.get("timestamp"),
        ))

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        type=group.type,
        invite_code=group.invite_code,
        created_by=group.created_by,
        created_at=group.created_at.isoformat(),
        members=members,
    )


@router.post("/{group_id}/join")
async def join_group(
    group_id: str,
    req: JoinGroupRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(Group).where(Group.id == group_id, Group.invite_code == req.invite_code)
    )
    group = result.first()
    if not group:
        # Try finding by invite code alone
        result = await session.exec(
            select(Group).where(Group.invite_code == req.invite_code)
        )
        group = result.first()
        if not group:
            raise HTTPException(status_code=404, detail="Invalid invite code")

    # Check if already a member
    result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group.id,
            GroupMember.user_id == user.id,
        )
    )
    if result.first():
        return {"message": "Already a member", "group_id": group.id}

    membership = GroupMember(
        group_id=group.id,
        user_id=user.id,
        role="member",
    )
    session.add(membership)
    await session.commit()

    return {"message": "Joined group", "group_id": group.id, "group_name": group.name}


@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    # Only allow self-removal or owner removal
    if user_id != user.id:
        result = await session.exec(
            select(GroupMember).where(
                GroupMember.group_id == group_id,
                GroupMember.user_id == user.id,
                GroupMember.role == "owner",
            )
        )
        if not result.first():
            raise HTTPException(status_code=403, detail="Only owners can remove other members")

    result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    membership = result.first()
    if not membership:
        raise HTTPException(status_code=404, detail="Member not found")

    await session.delete(membership)
    await session.commit()
    return {"message": "Member removed"}


@router.get("/{group_id}/pulse")
async def group_pulse(
    group_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Real-time group health summary."""
    result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id,
        )
    )
    if not result.first():
        raise HTTPException(status_code=403, detail="Not a member")

    result = await session.exec(select(Group).where(Group.id == group_id))
    group = result.first()

    result = await session.exec(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    memberships = result.all()

    member_health = []
    total_anomalous = 0
    for m in memberships:
        health = _get_user_health(m.user_id)
        score = health.get("anomaly_score", 0.0)
        if score > 0.5:
            total_anomalous += 1
        member_health.append({
            "user_id": m.user_id,
            "heart_rate": health.get("heart_rate"),
            "status": health.get("status", "unknown"),
            "anomaly_score": score,
        })

    # Determine group status
    n_members = len(memberships)
    if group and group.type == "family":
        # Family: alert on any individual anomaly
        if total_anomalous > 0:
            status = "critical" if total_anomalous > 1 else "warning"
        else:
            status = "safe"
    else:
        # Community: alert on pattern (3+)
        if total_anomalous >= 3:
            status = "critical"
        elif total_anomalous >= 1:
            status = "elevated"
        else:
            status = "safe"

    return {
        "group_id": group_id,
        "group_name": group.name if group else "",
        "group_type": group.type if group else "community",
        "status": status,
        "total_members": n_members,
        "anomalous_members": total_anomalous,
        "members": member_health,
        "timestamp": datetime.utcnow().isoformat(),
    }


def _get_user_health(user_id: str) -> dict:
    """Get latest health data for a user from in-memory service."""
    all_latest = health_service.get_all_latest()
    for device_id, reading in all_latest.items():
        if reading.get("user_id") == user_id:
            score = anomaly_detection_service.get_device_score(device_id)
            status = "critical" if score > 0.8 else "elevated" if score > 0.5 else "normal"
            return {
                "heart_rate": reading.get("heart_rate"),
                "hrv": reading.get("hrv"),
                "acceleration": reading.get("acceleration"),
                "skin_temp": reading.get("skin_temp"),
                "status": status,
                "anomaly_score": score,
                "timestamp": reading.get("timestamp"),
            }
    return {}
