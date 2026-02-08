"""Community dashboard API routes."""

from fastapi import APIRouter

from ..services.community_engine import community_engine
from ..services.anomaly_detection import anomaly_detection_service
from ..services.health import health_service
from ..websocket.connection_manager import connection_manager

router = APIRouter(prefix="/api/community", tags=["community"])

DEMO_ZONE_IDS = ["zone-downtown", "zone-campus", "zone-riverside", "zone-hillcrest"]


@router.get("/summary")
async def get_community_summary():
    """Get full community status summary."""
    return community_engine.get_community_summary(DEMO_ZONE_IDS)


@router.get("/devices")
async def get_active_devices():
    """Get all active device connections and their latest readings."""
    devices = []
    for device_id in connection_manager.device_ids:
        latest = health_service.get_latest(device_id)
        score = anomaly_detection_service.get_device_score(device_id)
        conn = connection_manager.get_device_connection(device_id)
        devices.append({
            "device_id": device_id,
            "user_id": conn.user_id if conn else None,
            "zones": conn.zone_ids if conn else [],
            "latest_reading": latest,
            "anomaly_score": round(score, 4),
            "buffer_size": health_service.get_buffer_sizes().get(device_id, 0),
        })
    return {"devices": devices, "total": len(devices)}


@router.get("/scores")
async def get_all_scores():
    """Get anomaly scores for all devices."""
    return {
        "scores": anomaly_detection_service.get_all_scores(),
        "anomalous": anomaly_detection_service.get_anomalous_devices(),
    }


@router.get("/pulse")
async def get_community_pulse():
    """Real-time community pulse — lightweight endpoint for frequent polling."""
    zones = []
    for zone_id in DEMO_ZONE_IDS:
        status = community_engine.get_zone_status(zone_id)
        score = community_engine.get_zone_score(zone_id)
        device_count = connection_manager.get_zone_device_count(zone_id)
        zones.append({
            "zone_id": zone_id,
            "status": status,
            "score": round(score, 4),
            "active_devices": device_count,
        })
    return {
        "zones": zones,
        "total_devices": connection_manager.active_device_count,
    }
