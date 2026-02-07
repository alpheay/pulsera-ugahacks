"""WebSocket handler — routes incoming messages from devices and dashboards."""

import json
import logging
from datetime import datetime

import numpy as np
from starlette.websockets import WebSocket, WebSocketDisconnect

from .connection_manager import connection_manager
from ..services.health import health_service
from ..services.anomaly_detection import anomaly_detection_service

logger = logging.getLogger(__name__)


async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connection_manager.add_pending(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            await handle_message(websocket, data)
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        connection_manager.disconnect(websocket)


async def handle_message(ws: WebSocket, data: dict):
    msg_type = data.get("type")

    if msg_type == "authenticate":
        await handle_auth(ws, data)

    elif msg_type == "health_data":
        await handle_health_data(ws, data)

    elif msg_type == "health_batch":
        await handle_health_batch(ws, data)

    elif msg_type == "dashboard_subscribe":
        connection_manager.authenticate_dashboard(ws)
        await ws.send_json({
            "type": "dashboard_subscribed",
            "status": connection_manager.get_status(),
        })

    elif msg_type == "ping":
        await ws.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})

    else:
        logger.warning(f"Unknown message type: {msg_type}")


async def handle_auth(ws: WebSocket, data: dict):
    device_id = data.get("device_id")
    user_id = data.get("user_id")
    zone_ids = data.get("zone_ids", [])

    if not device_id or not user_id:
        await ws.send_json({"type": "auth_error", "message": "device_id and user_id required"})
        return

    connection_manager.authenticate_device(ws, device_id, user_id, zone_ids)

    await ws.send_json({
        "type": "authenticated",
        "device_id": device_id,
        "user_id": user_id,
        "zone_ids": zone_ids,
    })

    await connection_manager.broadcast_to_dashboards({
        "type": "device_connected",
        "device_id": device_id,
        "user_id": user_id,
        "zone_ids": zone_ids,
        "total_devices": connection_manager.active_device_count,
    })


async def handle_health_data(ws: WebSocket, data: dict):
    device_id = data.get("device_id")
    if not device_id:
        return

    reading = {
        "device_id": device_id,
        "heart_rate": data.get("heart_rate", 0),
        "hrv": data.get("hrv", 0),
        "acceleration": data.get("acceleration", 1.0),
        "skin_temp": data.get("skin_temp", 36.5),
        "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
    }

    await health_service.ingest_reading(reading)

    result = await anomaly_detection_service.process_reading(device_id, reading)

    if result:
        await ws.send_json({
            "type": "anomaly_result",
            "device_id": device_id,
            "score": result.get("overall_score", 0),
            "is_anomaly": result.get("is_anomaly", False),
        })

        await connection_manager.broadcast_to_dashboards({
            "type": "health_update",
            "device_id": device_id,
            "reading": reading,
            "anomaly": result,
        })


async def handle_health_batch(ws: WebSocket, data: dict):
    """Handle batch of health readings (full window for direct PulseNet inference)."""
    device_id = data.get("device_id")
    window = data.get("window")

    if not device_id or not window:
        return

    window_np = np.array(window, dtype=np.float32)
    result = await anomaly_detection_service.infer_window(device_id, window_np)

    await ws.send_json({
        "type": "anomaly_result",
        "device_id": device_id,
        **result,
    })

    await connection_manager.broadcast_to_dashboards({
        "type": "inference_result",
        "device_id": device_id,
        "result": result,
    })
