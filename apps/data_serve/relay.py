"""
Event relay server — bridges watch events to mobile notifications.

Watch connects and sends episode events; relay repackages them into
the ring-* format the mobile app already understands and broadcasts
to all connected mobile clients.

    cd apps/data_serve && python relay.py
"""

import asyncio
import json
import logging
from typing import Literal

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("relay")

app = FastAPI(title="Pulsera Event Relay")

# Connected clients keyed by role
clients: dict[Literal["watch", "mobile"], list[WebSocket]] = {
    "watch": [],
    "mobile": [],
}

# Maps watch event types → ring-* types the mobile expects
EVENT_MAP: dict[str, str] = {
    "episode-start": "ring-episode-alert",
    "episode-resolved": "ring-episode-resolved",
    "pulse-checkin": "ring-pulse-checkin",
}


def repackage(msg: dict) -> dict | None:
    """Convert a watch event into the ring-* format mobile expects."""
    event_type = msg.get("type", "")
    ring_type = EVENT_MAP.get(event_type)
    if not ring_type:
        return None

    out: dict = {"type": ring_type, "member_name": "Watch User"}

    if event_type == "episode-start":
        out["heart_rate"] = msg.get("heart_rate")
        out["trigger_type"] = msg.get("trigger", "anomaly")
    elif event_type == "episode-resolved":
        out["resolution"] = msg.get("reason", "resolved")
    elif event_type == "pulse-checkin":
        out["message"] = msg.get("message", "I'm okay!")
        out["photo_url"] = msg.get("photo_url", "")
        out["presage_data"] = msg.get("presage_data")

    out["timestamp"] = msg.get("timestamp", "")
    return out


async def broadcast_to_mobiles(payload: dict):
    """Send a JSON message to every connected mobile client."""
    raw = json.dumps(payload)
    disconnected: list[WebSocket] = []
    for ws in clients["mobile"]:
        try:
            await ws.send_text(raw)
        except Exception:
            disconnected.append(ws)
    for ws in disconnected:
        clients["mobile"].remove(ws)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    role: Literal["watch", "mobile"] | None = None

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            # Handle authenticate — auto-respond so existing client code works
            if msg_type == "authenticate":
                await ws.send_text(json.dumps({"type": "authenticated"}))
                continue

            # Handle registration
            if msg_type == "register":
                role = msg.get("role")
                if role in ("watch", "mobile"):
                    clients[role].append(ws)
                    logger.info("Client registered as %s (total: %d)", role, len(clients[role]))
                continue

            # Relay watch events to mobile clients
            if role == "watch":
                relayed = repackage(msg)
                if relayed:
                    logger.info("Relaying %s → %s", msg_type, relayed["type"])
                    await broadcast_to_mobiles(relayed)

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("WebSocket error: %s", exc)
    finally:
        if role and ws in clients.get(role, []):
            clients[role].remove(ws)
            logger.info("Client (%s) disconnected (remaining: %d)", role, len(clients[role]))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3002)
