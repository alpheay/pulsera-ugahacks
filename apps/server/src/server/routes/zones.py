"""Zone management API routes."""

from fastapi import APIRouter

from ..services.community_engine import community_engine
from ..websocket.connection_manager import connection_manager

router = APIRouter(prefix="/api/zones", tags=["zones"])

DEMO_ZONES = {
    "zone-downtown": {"name": "Downtown", "description": "Downtown community area", "lat": 33.9519, "lng": -83.3576},
    "zone-campus": {"name": "UGA Campus", "description": "University of Georgia campus zone", "lat": 33.9480, "lng": -83.3773},
    "zone-riverside": {"name": "Riverside", "description": "Riverside neighborhood", "lat": 33.9450, "lng": -83.3800},
    "zone-hillcrest": {"name": "Hillcrest", "description": "Hillcrest residential area", "lat": 33.9600, "lng": -83.3650},
}


@router.get("")
async def list_zones():
    """List all community zones with current status."""
    zones = []
    for zone_id, info in DEMO_ZONES.items():
        result = community_engine.compute_zone_score(zone_id)
        zones.append({
            "id": zone_id,
            **info,
            **result,
        })
    return {"zones": zones}


@router.get("/{zone_id}")
async def get_zone(zone_id: str):
    """Get detailed info for a specific zone."""
    info = DEMO_ZONES.get(zone_id, {"name": zone_id, "description": ""})
    result = community_engine.compute_zone_score(zone_id)
    history = community_engine.get_zone_history(zone_id)
    devices = connection_manager.get_devices_in_zone(zone_id)

    return {
        "id": zone_id,
        **info,
        **result,
        "history": history,
        "devices": [
            {
                "device_id": d.device_id,
                "user_id": d.user_id,
                "connected_at": d.connected_at.isoformat(),
            }
            for d in devices
        ],
    }


@router.get("/{zone_id}/history")
async def get_zone_history(zone_id: str, limit: int = 60):
    """Get score history for a zone."""
    return {"zone_id": zone_id, "history": community_engine.get_zone_history(zone_id, limit)}
