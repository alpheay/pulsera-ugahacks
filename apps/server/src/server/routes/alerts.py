"""Alert feed API routes."""

from fastapi import APIRouter
from pydantic import BaseModel

from ..services.alert_service import alert_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class ResolveRequest(BaseModel):
    acknowledged_by: str | None = None


@router.get("")
async def list_alerts(limit: int = 50, active_only: bool = False):
    """Get alert feed."""
    return {"alerts": alert_service.get_alerts(limit=limit, active_only=active_only)}


@router.get("/active")
async def get_active_alerts():
    """Get only active (unresolved) alerts."""
    return {"alerts": alert_service.get_active_alerts()}


@router.get("/zone/{zone_id}")
async def get_zone_alerts(zone_id: str):
    """Get alerts for a specific zone."""
    return {"alerts": alert_service.get_zone_alerts(zone_id)}


@router.post("/{alert_id}/resolve")
async def resolve_alert(alert_id: str, body: ResolveRequest):
    """Resolve/acknowledge an alert."""
    await alert_service.resolve_alert(alert_id, body.acknowledged_by)
    return {"status": "resolved", "alert_id": alert_id}
