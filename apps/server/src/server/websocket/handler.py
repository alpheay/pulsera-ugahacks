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

    elif msg_type == "health-update":
        await handle_health_update(ws, data)

    elif msg_type == "health_batch":
        await handle_health_batch(ws, data)

    elif msg_type == "subscribe-group":
        await handle_subscribe_group(ws, data)

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
    group_ids = data.get("group_ids", [])

    if not device_id or not user_id:
        await ws.send_json({"type": "auth_error", "message": "device_id and user_id required"})
        return

    connection_manager.authenticate_device(ws, device_id, user_id, zone_ids)

    # Auto-subscribe to groups if provided
    for gid in group_ids:
        connection_manager.subscribe_to_group(ws, gid)

    await ws.send_json({
        "type": "authenticated",
        "device_id": device_id,
        "user_id": user_id,
        "zone_ids": zone_ids,
        "group_ids": group_ids,
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

    conn = connection_manager.get_device_connection(device_id)
    user_id = conn.user_id if conn else None

    reading = {
        "device_id": device_id,
        "user_id": user_id,
        "heart_rate": data.get("heart_rate", 0),
        "hrv": data.get("hrv", 0),
        "acceleration": data.get("acceleration", 1.0),
        "skin_temp": data.get("skin_temp", 36.5),
        "timestamp": data.get("timestamp", datetime.utcnow().isoformat()),
    }

    await health_service.ingest_reading(reading)

    result = await anomaly_detection_service.process_reading(device_id, reading)

    if result:
        score = result.get("overall_score", 0)
        status = "critical" if score > 0.8 else "elevated" if score > 0.5 else "normal"

        await ws.send_json({
            "type": "anomaly_result",
            "device_id": device_id,
            "score": score,
            "is_anomaly": result.get("is_anomaly", False),
        })

        dashboard_msg = {
            "type": "health_update",
            "device_id": device_id,
            "userId": user_id,
            "reading": reading,
            "anomaly": result,
        }
        await connection_manager.broadcast_to_dashboards(dashboard_msg)

        # Broadcast to groups this user belongs to
        if user_id and conn:
            group_msg = {
                "type": "group-health-update",
                "userId": user_id,
                "heartRate": reading["heart_rate"],
                "hrv": reading["hrv"],
                "status": status,
                "anomalyScore": score,
            }
            # Broadcast to any group subscribers watching this user
            for gid, subs in connection_manager._group_subscribers.items():
                if subs:
                    await connection_manager.broadcast_to_group(gid, {**group_msg, "groupId": gid})


async def handle_health_update(ws: WebSocket, data: dict):
    """Handle health-update format from Apple Watch / mobile (camelCase)."""
    # Find device connection for this websocket
    device_id = None
    user_id = None
    for did, conn in connection_manager._devices.items():
        if conn.websocket is ws:
            device_id = did
            user_id = conn.user_id
            break

    if not device_id:
        await ws.send_json({"type": "error", "message": "Not authenticated"})
        return

    reading = {
        "device_id": device_id,
        "user_id": user_id,
        "heart_rate": data.get("heartRate", 0),
        "hrv": data.get("hrv", 0),
        "acceleration": data.get("acceleration", 1.0),
        "skin_temp": data.get("skinTemp", 36.5),
        "timestamp": datetime.utcnow().isoformat(),
    }

    await health_service.ingest_reading(reading)

    result = await anomaly_detection_service.process_reading(device_id, reading)

    status = data.get("status", "normal")
    if result:
        score = result.get("overall_score", 0)
        status = "critical" if score > 0.8 else "elevated" if score > 0.5 else "normal"

        await ws.send_json({
            "type": "anomaly_result",
            "device_id": device_id,
            "score": score,
            "status": status,
            "is_anomaly": result.get("is_anomaly", False),
        })

        await connection_manager.broadcast_to_dashboards({
            "type": "health_update",
            "device_id": device_id,
            "userId": user_id,
            "reading": reading,
            "anomaly": result,
        })

        # Broadcast to group subscribers
        if user_id:
            for gid, subs in connection_manager._group_subscribers.items():
                if subs:
                    await connection_manager.broadcast_to_group(gid, {
                        "type": "group-health-update",
                        "groupId": gid,
                        "userId": user_id,
                        "heartRate": reading["heart_rate"],
                        "hrv": reading["hrv"],
                        "status": status,
                        "anomalyScore": score,
                    })


async def handle_subscribe_group(ws: WebSocket, data: dict):
    """Handle mobile app subscribing to a group's updates."""
    group_id = data.get("groupId")
    if not group_id:
        await ws.send_json({"type": "error", "message": "groupId required"})
        return

    connection_manager.subscribe_to_group(ws, group_id)
    await ws.send_json({
        "type": "group-subscribed",
        "groupId": group_id,
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
