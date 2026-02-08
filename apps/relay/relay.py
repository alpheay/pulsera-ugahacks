#!/usr/bin/env python3
"""Lightweight WebSocket relay bridging watch ↔ mobile for Pulsera demo."""

import asyncio
import json
import uuid
from datetime import datetime, timezone

import websockets

PORT = 8765
clients: dict[websockets.WebSocketServerProtocol, dict] = {}


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def broadcast_to_mobiles(group: str, message: dict):
    """Send a message to every mobile client subscribed to *group*."""
    payload = json.dumps(message)
    for ws, info in clients.items():
        if info.get("role") == "mobile" and group in info.get("groups", set()):
            asyncio.ensure_future(ws.send(payload))
    log(f"  → broadcast {message['type']} to mobiles in group '{group}'")


async def handler(ws, path=None):
    # Register with default info
    clients[ws] = {"device_id": None, "user_id": None, "role": None, "groups": set()}
    log(f"+ connection from {ws.remote_address}")

    try:
        async for raw in ws:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            mtype = msg.get("type")

            # --- authenticate ---
            if mtype == "authenticate":
                clients[ws]["device_id"] = msg.get("device_id")
                clients[ws]["user_id"] = msg.get("user_id")
                for gid in msg.get("group_ids", []):
                    clients[ws]["groups"].add(gid)
                await ws.send(json.dumps({"type": "authenticated", "device_id": clients[ws]["device_id"]}))
                log(f"  auth: device={clients[ws]['device_id']}  user={clients[ws]['user_id']}")

            # --- register role ---
            elif mtype == "register":
                clients[ws]["role"] = msg.get("role")
                log(f"  role: {clients[ws]['role']}")

            # --- subscribe-group ---
            elif mtype == "subscribe-group":
                gid = msg.get("groupId") or msg.get("group_id")
                if gid:
                    clients[ws]["groups"].add(gid)
                    await ws.send(json.dumps({"type": "group-subscribed", "groupId": gid}))
                    log(f"  subscribed to group '{gid}'")

            # --- ping / pong ---
            elif mtype == "ping":
                await ws.send(json.dumps({"type": "pong"}))

            # --- episode-start → ring-episode-alert ---
            elif mtype == "episode-start":
                trigger = msg.get("trigger_data", {})
                group = msg.get("group_id", "family-demo")
                alert = {
                    "type": "ring-episode-alert",
                    "episode_id": str(uuid.uuid4()),
                    "member_name": msg.get("member_name", "Watch Wearer"),
                    "heart_rate": trigger.get("heartRate", 0),
                    "trigger_type": trigger.get("anomalyType", "elevated_hr"),
                    "phase": "anomaly_detected",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                log(f"⚡ episode-start  HR={alert['heart_rate']}")
                broadcast_to_mobiles(group, alert)

            # --- pulse-checkin → ring-pulse-checkin ---
            elif mtype == "pulse-checkin":
                group = msg.get("group_id", "family-demo")
                checkin = {
                    "type": "ring-pulse-checkin",
                    "member_name": msg.get("member_name", "Watch Wearer"),
                    "photo_url": msg.get("photo_url", ""),
                    "message": msg.get("message", ""),
                    "presage_data": msg.get("presage_data"),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                log(f"💜 pulse-checkin  msg='{checkin['message']}'")
                broadcast_to_mobiles(group, checkin)

            else:
                log(f"  (ignored type '{mtype}')")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        del clients[ws]
        log(f"- disconnected {ws.remote_address}")


async def main():
    log(f"Pulsera relay listening on 0.0.0.0:{PORT}")
    async with websockets.serve(handler, "0.0.0.0", PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    asyncio.run(main())
