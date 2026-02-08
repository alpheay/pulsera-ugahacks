"""Episode REST API endpoints."""

import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.episode_service import episode_service
from ..services.escalation_service import escalation_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/episodes", tags=["episodes"])


# --- Request Models ---

class StartEpisodeRequest(BaseModel):
    device_id: str
    user_id: str
    group_id: Optional[str] = None
    trigger_data: dict[str, Any]


class CalmingResultRequest(BaseModel):
    heart_rate: float = 0
    hrv: float = 0
    acceleration: float = 1.0
    skin_temp: float = 36.5
    status: str = "normal"


class PresageDataRequest(BaseModel):
    visual_heart_rate: float = 0
    breathing_rate: float = 0
    facial_expression: str = "calm"  # calm, distressed, confused, pain
    blink_rate: float = 0
    eye_responsiveness: str = "normal"  # normal, slow, unresponsive
    confidence_score: float = 0.5


class ResolveRequest(BaseModel):
    resolution: str  # calming_resolved, false_positive, caregiver_acknowledged, emergency_dispatched


# --- Endpoints ---

@router.post("/start")
async def start_episode(req: StartEpisodeRequest):
    """Start a new episode from a watch anomaly detection."""
    # Check if device already has an active episode
    existing = episode_service.get_active_episode(req.device_id)
    if existing:
        return existing

    episode = await episode_service.start_episode(
        device_id=req.device_id,
        user_id=req.user_id,
        trigger_data=req.trigger_data,
        group_id=req.group_id,
    )
    return episode


@router.get("/active")
async def get_active_episodes():
    """Get all currently active episodes."""
    return episode_service.get_active_episodes()


@router.get("/history")
async def get_episode_history(limit: int = 50):
    """Get past resolved episodes."""
    return episode_service.get_history(limit)


@router.get("/{episode_id}")
async def get_episode(episode_id: str):
    """Get full episode details including timeline."""
    episode = episode_service.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode


@router.post("/{episode_id}/calming")
async def submit_calming(episode_id: str, req: CalmingResultRequest):
    """Submit post-calming vitals for re-evaluation."""
    episode = episode_service.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    post_vitals = {
        "heart_rate": req.heart_rate,
        "hrv": req.hrv,
        "acceleration": req.acceleration,
        "skin_temp": req.skin_temp,
        "status": req.status,
    }

    result = await episode_service.submit_calming_result(episode_id, post_vitals)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to process calming result")

    # If escalating after calming, start escalation chain
    if result.get("phase") == "escalating":
        await escalation_service.start_escalation(episode_id, result)

    return result


@router.post("/{episode_id}/presage")
async def submit_presage(episode_id: str, req: PresageDataRequest):
    """Submit visual check-in (Presage) data for fusion."""
    episode = episode_service.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    presage_data = {
        "visual_heart_rate": req.visual_heart_rate,
        "breathing_rate": req.breathing_rate,
        "facial_expression": req.facial_expression,
        "blink_rate": req.blink_rate,
        "eye_responsiveness": req.eye_responsiveness,
        "confidence_score": req.confidence_score,
    }

    result = await episode_service.submit_presage_data(episode_id, presage_data)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to process presage data")

    # If fusion decided to escalate, start escalation chain
    if result.get("phase") == "escalating":
        await escalation_service.start_escalation(episode_id, result)
    elif result.get("phase") == "resolved":
        await escalation_service.cancel_escalation(episode_id)

    return result


@router.post("/{episode_id}/resolve")
async def resolve_episode(episode_id: str, req: ResolveRequest):
    """Caregiver acknowledges or resolves an episode."""
    episode = episode_service.get_episode(episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    await escalation_service.cancel_escalation(episode_id)
    result = await episode_service.resolve(episode_id, req.resolution)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to resolve episode")

    return result
