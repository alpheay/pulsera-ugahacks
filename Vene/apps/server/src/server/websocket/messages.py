from __future__ import annotations

import json
from typing import Any

from ..agent.agent_manager import agent_manager
from ..services.call import call_service
from ..services.device import device_service
from ..websocket.connection_manager import AuthenticatedConnection, connection_manager

async def handle_message(ws, data: str) -> None:
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError:
        connection_manager.send(ws, {"type": "error", "message": "Invalid JSON"})
        return

    connection = connection_manager.get_connection(ws)
    if not connection:
        connection_manager.send(ws, {"type": "error", "message": "Not authenticated"})
        return

    if isinstance(parsed, dict) and isinstance(parsed.get("type"), str):
        await route_message(ws, parsed["type"], parsed, connection)


async def route_message(
    ws,
    message_type: str,
    parsed: dict,
    connection: AuthenticatedConnection,
) -> None:
    if message_type == "command":
        if connection.device_type != "watch" or not connection.device_id:
            connection_manager.send(ws, {"type": "error", "message": "Commands must come from a watch"})
            return
        await agent_manager.handle_patient_command(connection)
        return

    if message_type == "caregiver-event":
        if connection.device_type != "phone":
            connection_manager.send(ws, {"type": "error", "message": "Only caregivers can send events"})
            return
        event = parsed.get("event")
        if not isinstance(event, str):
            connection_manager.send(ws, {"type": "error", "message": "Missing event type"})
            return
        payload: dict[str, Any] = parsed.get("payload") if isinstance(parsed.get("payload"), dict) else {}
        await agent_manager.handle_caregiver_event(connection, event, payload)
        return

    if message_type == "caregiver-call-start":
        if connection.device_type != "phone":
            connection_manager.send(ws, {"type": "error", "message": "Only caregivers can start calls"})
            return
        await call_service.start_call(ws)
        return

    if message_type == "caregiver-call-end":
        if connection.device_type != "phone":
            connection_manager.send(ws, {"type": "error", "message": "Only caregivers can end calls"})
            return
        await call_service.end_call(ws)
        return

    if message_type == "cancel-pairing":
        pairing_code = parsed.get("pairingCode")
        if not isinstance(pairing_code, str):
            connection_manager.send(ws, {"type": "error", "message": "Missing pairingCode"})
            return

        await device_service.cancel_pairing(pairing_code)

        if connection.device_type == "phone":
            watch_ws = connection_manager.get_pending_pairing_connection(pairing_code)
            if watch_ws:
                connection_manager.send(
                    watch_ws,
                    {
                        "type": "pairing-cancelled",
                        "pairingCode": pairing_code,
                        "cancelledBy": "phone",
                    },
                )
                connection_manager.remove_pending_pairing(pairing_code)
                await watch_ws.close(code=4003, reason="Pairing cancelled by caregiver")
        else:
            connection_manager.send_to_user(
                connection.user_id,
                {
                    "type": "pairing-cancelled",
                    "pairingCode": pairing_code,
                    "cancelledBy": "watch",
                },
            )
            connection_manager.remove_pending_pairing(pairing_code)
        return

    if message_type == "reconnect-request":
        if connection.device_type != "watch" or not connection.device_id:
            connection_manager.send(ws, {"type": "error", "message": "Only watches can request reconnection"})
            return
        connection_manager.send(ws, {"type": "reconnect-approved"})
        return

    if message_type == "reconnect-approve":
        if connection.device_type != "phone":
            connection_manager.send(ws, {"type": "error", "message": "Only caregivers can approve reconnection"})
            return
        device_id = parsed.get("deviceId")
        if not isinstance(device_id, str):
            connection_manager.send(ws, {"type": "error", "message": "Missing deviceId"})
            return
        connection_manager.send_to_device(device_id, {"type": "reconnect-approved"})
        return

    if message_type == "reconnect-reject":
        if connection.device_type != "phone":
            connection_manager.send(ws, {"type": "error", "message": "Only caregivers can reject reconnection"})
            return
        device_id = parsed.get("deviceId")
        if not isinstance(device_id, str):
            connection_manager.send(ws, {"type": "error", "message": "Missing deviceId"})
            return
        connection_manager.send_to_device(device_id, {"type": "reconnect-rejected"})
        return

    if message_type == "deadman-cancel":
        if connection.device_type != "watch" or not connection.device_id:
            connection_manager.send(ws, {"type": "error", "message": "Only watches can cancel"})
            return
        pending_id = parsed.get("pendingId")
        if not isinstance(pending_id, str) or not pending_id.strip():
            connection_manager.send(ws, {"type": "error", "message": "Missing pendingId"})
            return
        await agent_manager.handle_deadman_cancel(connection, pending_id.strip())
        return

    if message_type == "media-event":
        if connection.device_type != "watch" or not connection.device_id:
            connection_manager.send(ws, {"type": "error", "message": "Only watches can send media events"})
            return
        event = parsed.get("event")
        if not isinstance(event, str) or not event.strip():
            connection_manager.send(ws, {"type": "error", "message": "Missing event"})
            return
        payload: dict[str, Any] = parsed.get("payload") if isinstance(parsed.get("payload"), dict) else {}
        await agent_manager.handle_media_event(connection, event.strip(), payload)
        return

    if message_type == "tts-playback-complete":
        if connection.device_type != "watch" or not connection.device_id:
            return
        agent_manager.handle_tts_playback_complete(connection)
        return

    if message_type == "pulse-checkin":
        if connection.device_type != "watch" or not connection.device_id:
            connection_manager.send(ws, {"type": "error", "message": "Only watches can send pulse check-ins"})
            return
        photo_url = parsed.get("photo_url", "")
        message_text = parsed.get("message", "I'm okay!")
        connection_manager.send_to_paired_caregiver(connection.device_id, {
            "type": "ring-pulse-checkin",
            "member_name": connection.user_id,
            "device_id": connection.device_id,
            "photo_url": photo_url,
            "message": message_text,
        })
        return
