"""Health data routes — query user and group health data."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ..db import get_session
from ..models.user import User
from ..models.group_member import GroupMember
from ..services.health import health_service
from ..services.anomaly_detection import anomaly_detection_service
from .auth import get_current_user

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/{user_id}/latest")
async def get_latest_health(
    user_id: str,
    user: User = Depends(get_current_user),
):
    """Get latest health snapshot for a user."""
    all_latest = health_service.get_all_latest()
    for device_id, reading in all_latest.items():
        if reading.get("user_id") == user_id:
            score = anomaly_detection_service.get_device_score(device_id)
            return {
                "user_id": user_id,
                "device_id": device_id,
                "heart_rate": reading.get("heart_rate", 0),
                "hrv": reading.get("hrv", 0),
                "acceleration": reading.get("acceleration", 1.0),
                "skin_temp": reading.get("skin_temp", 36.5),
                "anomaly_score": score,
                "status": "critical" if score > 0.8 else "elevated" if score > 0.5 else "normal",
                "timestamp": reading.get("timestamp"),
            }
    return {
        "user_id": user_id,
        "status": "no_data",
        "message": "No health data available",
    }


@router.get("/{user_id}/history")
async def get_health_history(
    user_id: str,
    limit: int = 60,
    user: User = Depends(get_current_user),
):
    """Get recent health history for a user (from in-memory buffer)."""
    all_latest = health_service.get_all_latest()
    device_id = None
    for did, reading in all_latest.items():
        if reading.get("user_id") == user_id:
            device_id = did
            break

    if not device_id:
        return {"user_id": user_id, "history": []}

    buf = health_service._buffers.get(device_id)
    if not buf:
        return {"user_id": user_id, "history": []}

    history = []
    for entry in list(buf)[-limit:]:
        history.append({
            "heart_rate": entry[0],
            "hrv": entry[1],
            "acceleration": entry[2],
            "skin_temp": entry[3],
        })

    return {"user_id": user_id, "device_id": device_id, "history": history}


@router.get("/groups/{group_id}/health")
async def get_group_health(
    group_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all members' latest health for a group."""
    # Verify membership
    result = await session.exec(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user.id,
        )
    )
    if not result.first():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    result = await session.exec(
        select(GroupMember).where(GroupMember.group_id == group_id)
    )
    memberships = result.all()

    all_latest = health_service.get_all_latest()
    members_health = []

    for m in memberships:
        member_data = {"user_id": m.user_id, "status": "no_data"}
        for device_id, reading in all_latest.items():
            if reading.get("user_id") == m.user_id:
                score = anomaly_detection_service.get_device_score(device_id)
                member_data = {
                    "user_id": m.user_id,
                    "device_id": device_id,
                    "heart_rate": reading.get("heart_rate", 0),
                    "hrv": reading.get("hrv", 0),
                    "anomaly_score": score,
                    "status": "critical" if score > 0.8 else "elevated" if score > 0.5 else "normal",
                    "timestamp": reading.get("timestamp"),
                }
                break
        members_health.append(member_data)

    return {"group_id": group_id, "members": members_health}
