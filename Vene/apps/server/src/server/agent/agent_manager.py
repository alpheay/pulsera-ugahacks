from __future__ import annotations

import asyncio
from typing import Any

from .session.constants import DEFAULT_WATCH_DISCONNECTED_REASON
from .session.session import Session, SessionMode
from ..models.enums import EventType
from ..services.agent_session import agent_session_service
from ..services.device import device_service
from ..services.event_log import event_log_service
from ..websocket.connection_manager import AuthenticatedConnection, connection_manager

class AgentManager:
    def __init__(self) -> None:
        self._sessions: dict[str, Session] = {}
        self._monitoring_state: dict[str, bool] = {}

    def is_actively_monitored(self, device_id: str) -> bool:
        return self._monitoring_state.get(device_id, False)

    def set_monitoring_state(self, device_id: str, is_active: bool) -> None:
        self._monitoring_state[device_id] = is_active

    def _get_or_create(self, device_id: str, user_id: str) -> Session:
        existing = self._sessions.get(device_id)
        if existing:
            return existing
        created = Session(device_id, user_id)
        self._sessions[device_id] = created
        return created

    def _get(self, device_id: str) -> Session | None:
        return self._sessions.get(device_id)

    def get_or_create_session(self, device_id: str, user_id: str) -> Session:
        return self._get_or_create(device_id, user_id)

    def get_session(self, device_id: str) -> Session | None:
        return self._get(device_id)

    async def handle_watch_audio_buffer(self, connection: AuthenticatedConnection, pcm16: bytes) -> None:
        if connection.device_type != "watch" or not connection.device_id:
            return
        session = self._get_or_create(connection.device_id, connection.user_id)
        await session.handle_user_audio_chunk(pcm16)

    async def handle_deadman_cancel(self, connection: AuthenticatedConnection, pending_id: str) -> None:
        if connection.device_type != "watch" or not connection.device_id:
            return
        session = self._get(connection.device_id)
        if not session:
            return
        await session.cancel_deadman(pending_id)

    async def handle_media_event(
        self,
        connection: AuthenticatedConnection,
        event: str,
        payload: dict[str, Any],
    ) -> None:
        if connection.device_type != "watch" or not connection.device_id:
            return
        session = self._get(connection.device_id)
        if not session:
            return
        await session.handle_media_event(event, payload)

    def handle_tts_playback_complete(self, connection: AuthenticatedConnection) -> None:
        if connection.device_type != "watch" or not connection.device_id:
            return
        session = self._get(connection.device_id)
        if session:
            session.handle_tts_playback_complete()

    async def handle_caregiver_event(
        self,
        connection: AuthenticatedConnection,
        event: str,
        payload: dict[str, Any],
    ) -> None:
        if connection.device_type != "phone":
            return
        if event not in {"check_in", "noise", "health", "active_monitoring"}:
            connection_manager.send(
                connection.ws,
                {"type": "error", "message": "Unknown caregiver event"},
            )
            return

        device = await device_service.get_device_for_user(connection.user_id)
        if not device:
            connection_manager.send(
                connection.ws,
                {"type": "error", "message": "No paired device found"},
            )
            return

        device_id = device.id

        if event == "active_monitoring":
            await self._handle_active_monitoring(device_id, payload)
            return

        context_text, mode = build_event_context(event, payload)
        session = self._get_or_create(device_id, connection.user_id)

        db_active_session_id = await agent_session_service.get_active_session_id(device_id)
        if session.session_id and not db_active_session_id:
            print(
                f"[Server][CaregiverEvent] WARNING: stale in-memory session_id={session.session_id} "
                f"but no active session in DB for device_id={device_id}; clearing session"
            )
            session.session_id = None

        had_active_session = session.has_active_session()
        had_active_conversation = session.has_active_conversation()

        if session.has_active_session():
            if session.has_active_conversation():
                session.send_contextual_update(context_text)
            else:
                session.set_conversation_start_reason(context_text)
                await session.ensure_conversation_active()
            await session.log_contextual_update(context_text)
            return
        
        if mode:
            session.set_session_mode(mode, reason=context_text)
        await session.ensure_session_started(
            reason=context_text,
            trigger_type=event,
            reason_data=payload,
        )

        await session.log_contextual_update(context_text)
        session.set_conversation_start_reason(context_text)
        await session.ensure_conversation_active()

    async def _handle_active_monitoring(
        self,
        device_id: str,
        payload: dict[str, Any],
    ) -> None:
        action = payload.get("action")
        if action not in {"start", "stop"}:
            return

        if action == "start":
            self.set_monitoring_state(device_id, True)
            await event_log_service.log_event(
                device_id=device_id,
                event_type=EventType.MONITORING_START,
            )
            return

        session = self._get(device_id)
        if session and session.has_active_session():
            await session.end_session("Active monitoring ended by caregiver")

        self.set_monitoring_state(device_id, False)
        await event_log_service.log_event(
            device_id=device_id,
            event_type=EventType.MONITORING_END,
        )

    async def handle_patient_command(self, connection: AuthenticatedConnection) -> None:
        if connection.device_type != "watch" or not connection.device_id:
            return
        session = self._get(connection.device_id)
        if session and session.has_active_session():
            return

        # Notify paired caregiver immediately — before any async DB/AI work
        connection_manager.send_to_paired_caregiver(connection.device_id, {
            "type": "ring-episode-alert",
            "device_id": connection.device_id,
            "member_name": connection.user_id,
            "trigger_type": "command",
            "phase": "session_started",
        })

        session = self._get_or_create(connection.device_id, connection.user_id)
        session.set_session_mode("normal")
        await session.ensure_session_started(
            reason="The patient wanted to initially tell you something.",
            trigger_type="command",
        )
        session.set_conversation_start_reason("The patient wanted to initially tell you something.")
        await session.ensure_conversation_active(silence_on_init=True)

    def on_watch_disconnected(self, device_id: str) -> None:
        session = self._sessions.get(device_id)

        async def cleanup() -> None:
            if session:
                await session.on_watch_disconnected()
                return
            active_session_id = await agent_session_service.get_active_session_id(device_id)
            if active_session_id:
                await agent_session_service.end_session(
                    session_id=active_session_id,
                    reason=DEFAULT_WATCH_DISCONNECTED_REASON,
                    ending_mode=None,
                )

        asyncio.create_task(cleanup())
        self._sessions.pop(device_id, None)


def build_event_context(event: str, payload: dict[str, Any]) -> tuple[str, SessionMode | None]:
    if event == "check_in":
        instruction = payload.get("instruction")
        if isinstance(instruction, str) and instruction.strip():
            return (
                f"Your job is to check in with the person about this: {instruction.strip()}.",
                "normal",
            )
        return ("Your job is to check in with the person about this.", "normal")

    if event == "noise":
        noise = payload.get("noise")
        distress = payload.get("distress")
        mode: SessionMode | None = "distress" if distress is True else "normal"
        if isinstance(noise, str) and noise.strip():
            return (
                "This noise happened just now and you need to figure out if everything's alright: "
                f"{noise.strip()}.",
                mode,
            )
        return (
            "This noise happened just now and you need to figure out if everything's alright.",
            mode,
        )

    if event == "health":
        description = payload.get("description")
        distress = payload.get("distress")
        mode = "distress" if distress is True else "normal"
        if isinstance(description, str) and description.strip():
            return (
                f"This health event just happened: {description.strip()}.",
                mode,
            )
        return ("This health event just happened", mode)

    return ("New caregiver event received.", None)


agent_manager = AgentManager()
