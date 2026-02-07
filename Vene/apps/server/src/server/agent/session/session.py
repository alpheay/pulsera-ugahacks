from __future__ import annotations

import asyncio
import base64
from typing import Any, Literal

from ...config import settings
from ...services.agent_session import agent_session_service
from ...services.device import device_service
from ...services.event_log import event_log_service
from ...websocket.connection_manager import connection_manager
from ...models.enums import EventType
from ..elevenlabs import ElevenLabsConversation
from ..elevenlabs_tts import ElevenLabsTTS
from ..inference import InferenceClient
from .audio_gate import AudioGate
from .deadman_switch import DeadmanCancelReason, DeadmanSwitch
from .media_automation import MediaAutomationController, MediaStartAction, MediaStopAction
from .tool_handler import ToolContext, handle_tool_call, should_handle_tool
from .constants import (
    DEFAULT_DISTRESS_START_REASON,
    DEFAULT_REGULAR_START_REASON,
    DEFAULT_SESSION_ENDED_REASON,
    DEFAULT_USER_REQUESTED_END_SESSION_REASON,
    DEFAULT_USER_SPEECH_START_REASON,
    DEFAULT_WATCH_DISCONNECTED_REASON,
    VAD_START_FRAMES,
    VAD_STOP_FRAMES,
)
from .json import safe_json_parse
from .session_context import build_session_logs
from .vad_processor import PendingVadChunk, VadProcessor
from ...services.agent_messages import (
    generate_conversation_opener,
    generate_conversation_refresher,
)


LOGGED_TOOL_CALLS = {
    "media_control",
    "transfer_to_caregiver",
    "transfer_to_regular",
    "transfer_to_distress",
}
SessionMode = Literal["normal", "distress"]


class Session:
    def __init__(self, device_id: str, user_id: str) -> None:
        self.device_id = device_id
        self.user_id = user_id

        self.agent_ws: ElevenLabsConversation | None = None
        self.agent_ws_state: str = "inactive"
        self.last_conversation_start_reason = "unknown"
        self.should_silence_on_init = False
        self.suppress_session_end_on_close = False
        self._pending_first_message: str | None = None
        self._connection_ready_event: asyncio.Event | None = None
        self._precomputed_init_payload: dict[str, Any] | None = None

        self.session_id: str | None = None
        self.session_init_task: asyncio.Task | None = None
        self.dynamic_variables: dict[str, Any] = {}
        self.session_mode: SessionMode = "normal"
        self.had_conversation_in_session = False
        # Track pending tool calls - cleared on session end to prevent memory leaks
        self.tool_call_names: dict[str, str] = {}
        self._max_pending_tool_calls = 100  # Safety limit
        self.patient_name = "Patient"
        self.caregiver_name = "Caregiver"
        self.profile_loaded = False

        self.audio_chunk_count = 0
        self.vad_speech_streak = 0
        self.vad_silence_streak = 0
        self.last_vad_probability = 0.0
        self.last_processed_vad_chunk_id = 0

        self._tts_complete_event: asyncio.Event | None = None

        self.inference_client = InferenceClient()
        self.audio_gate = AudioGate(
            send_audio=self._send_audio_to_agent,
            is_agent_ready=self._is_agent_ready,
            on_idle_timeout=self._handle_speech_idle_timeout,
        )
        self.vad_processor = VadProcessor(
            inference_client=self.inference_client,
            on_decision=self._process_vad_decision,
        )

        async def play_media_tts(text: str) -> None:
            api_key = settings.elevenlabs_api_key
            voice_id = settings.elevenlabs_tts_voice_id
            if not api_key or not voice_id:
                return

            self._tts_complete_event = asyncio.Event()

            tts = ElevenLabsTTS(
                api_key=api_key,
                voice_id=voice_id,
                model_id=settings.elevenlabs_tts_model_id,
                output_format=settings.elevenlabs_tts_output_format,
            )
            await tts.stream_pcm(text=text, on_audio_chunk=self.send_binary_to_watch)

            self.send_to_watch({"type": "tts-end-marker"})

            try:
                await asyncio.wait_for(self._tts_complete_event.wait(), timeout=3.0)
            except asyncio.TimeoutError:
                print("[Server][TTS] Playback completion timeout, proceeding anyway")
            finally:
                self._tts_complete_event = None

        self.deadman = DeadmanSwitch(
            send_to_watch=self.send_to_watch,
            get_session_id=lambda: self.session_id,
            is_user_speaking=lambda: bool(self.audio_gate.speech_active),
        )

        self.media_automation = MediaAutomationController(
            device_id=self.device_id,
            get_session_id=lambda: self.session_id,
            send_to_watch=self.send_to_watch,
            pause_conversation=self.pause_conversation,
            is_user_speaking=lambda: bool(self.audio_gate.speech_active),
            is_deadman_pending=self.deadman.is_pending,
            play_tts=play_media_tts,
            on_media_exhausted=self._handle_media_exhausted,
        )

    def has_active_session(self) -> bool:
        return self.session_id is not None

    def has_active_conversation(self) -> bool:
        return self.agent_ws_state in {"active", "connecting"}

    def set_session_mode(self, mode: SessionMode, reason: str | None = None) -> None:
        if mode == self.session_mode:
            return
        previous = self.session_mode
        self.session_mode = mode
        if self.session_id:
            asyncio.create_task(
                event_log_service.log_event(
                    device_id=self.device_id,
                    event_type=EventType.SESSION_MODE_CHANGE,
                    data={"from": previous, "to": mode, "reason": reason},
                    session_id=self.session_id,
                )
            )

    def set_conversation_start_reason(self, reason: str) -> None:
        self.dynamic_variables["conversation_start_reason"] = reason

    async def ensure_profile_loaded(self) -> None:
        if self.profile_loaded:
            return
        self.profile_loaded = True

        try:
            device = await device_service.get_device_by_id(self.device_id)
        except Exception:
            device = None

        if device and device.patient_name:
            self.patient_name = device.patient_name

        try:
            from ...db import async_session_maker
            from ...models.user import User

            async with async_session_maker() as session:
                user = await session.get(User, self.user_id)
        except Exception:
            user = None

        if user and user.name:
            self.caregiver_name = user.name

    def _select_agent_id(self) -> str:
        if self.session_mode == "distress" and settings.elevenlabs_distress_agent_id:
            return settings.elevenlabs_distress_agent_id
        agent_id = settings.elevenlabs_agent_id
        if not agent_id:
            raise ValueError("Missing ELEVENLABS_AGENT_ID")
        return agent_id

    def send_contextual_update(self, text: str) -> None:
        if not self.agent_ws or not self.agent_ws.is_open:
            return
        self.agent_ws.send_json({"type": "contextual_update", "text": text})

    async def log_contextual_update(self, text: str) -> None:
        if not self.session_id:
            return
        await event_log_service.log_event(
            device_id=self.device_id,
            event_type=EventType.CONTEXTUAL_UPDATE,
            data={"text": text},
            session_id=self.session_id,
        )

    async def _handle_media_exhausted(self, media_type: str) -> None:
        message = f"The {media_type} playlist has finished."

        await self.log_contextual_update(f"Media exhausted: {media_type}")

        if self.agent_ws and self.agent_ws.is_open:
            self.send_contextual_update(message)
        else:
            self.set_conversation_start_reason(message)
            await self.ensure_conversation_active()

    def handle_tts_playback_complete(self) -> None:
        if self._tts_complete_event:
            self._tts_complete_event.set()

    async def transfer_session(
        self,
        mode: str,
        reason: str | None,
        first_message: str | None = None,
    ) -> None:
        target_mode: SessionMode = "distress" if mode == "distress" else "normal"
        if target_mode == self.session_mode and not self.has_active_conversation():
            return

        normalized_reason = reason.strip() if isinstance(reason, str) and reason.strip() else None
        effective_reason = normalized_reason
        if not effective_reason:
            effective_reason = (
                DEFAULT_DISTRESS_START_REASON
                if target_mode == "distress"
                else DEFAULT_REGULAR_START_REASON
            )

        self.set_session_mode(target_mode, effective_reason)
        self.set_conversation_start_reason(effective_reason)

        if first_message and first_message.strip():
            self._pending_first_message = first_message.strip()

        mode_label = "distress support" if target_mode == "distress" else "regular support"
        await self.log_contextual_update(f"Switched to {mode_label}. {effective_reason}")

        if self.has_active_conversation():
            close_reason = (
                "Switching to distress support"
                if target_mode == "distress"
                else "Switching to regular support"
            )
            self.pause_conversation(close_reason, preserve_pending=True)

        await self.ensure_conversation_active()

    def send_to_watch(self, message: Any) -> None:
        connection_manager.send_to_device(self.device_id, message)

    def send_binary_to_watch(self, data: bytes) -> None:
        connection_manager.send_binary_to_device(self.device_id, data)

    async def start_media_now(
        self,
        tool_call_id: str,
        action: MediaStartAction,
        vibe: str,
    ) -> None:
        pending = self.deadman.pending
        if pending and pending.action == "start_call":
            raise ValueError("Cannot start media while a call is pending")

        self.media_automation.on_new_start_requested()
        await self.media_automation.start_media(
            tool_call_id=tool_call_id,
            action=action,
            vibe=vibe,
            send_tool_result=self._send_tool_result_to_agent,
        )


    async def transfer_to_caregiver(
        self,
        tool_call_id: str,
        context: str | None,
        command: bool,
    ) -> None:
        normalized_context = context.strip() if isinstance(context, str) and context.strip() else None

        async def delayed_pause() -> None:
            await asyncio.sleep(0.15)
            self.pause_conversation("Handing off to caregiver")

        log_text = (
            f"Asked the caregiver to step in. Context: {normalized_context}"
            if normalized_context
            else "Asked the caregiver to step in."
        )

        tool_result_message = (
            f"Notified the caregiver to step in. Context: {normalized_context}"
            if normalized_context
            else "Notified the caregiver to step in."
        )

        if command:
            await self.log_contextual_update(log_text)
            self._send_tool_result_to_agent(tool_call_id, tool_result_message, False)
            # Log CALL_START event so watch receives call-start notification
            await event_log_service.log_call_event(
                self.device_id,
                EventType.CALL_START,
                {"context": normalized_context},
            )
            asyncio.create_task(delayed_pause())
            return

        async def on_commit() -> None:
            await self.log_contextual_update(log_text)
            self._send_tool_result_to_agent(tool_call_id, tool_result_message, False)
            # Log CALL_START event so watch receives call-start notification
            await event_log_service.log_call_event(
                self.device_id,
                EventType.CALL_START,
                {"context": normalized_context},
            )
            asyncio.create_task(delayed_pause())

        async def on_cancel(reason: DeadmanCancelReason) -> None:
            message: str
            if reason == "cancelled":
                message = "User cancelled contacting caregiver."
            elif reason == "superseded":
                message = "Caregiver transfer superseded."
            elif reason == "stopped":
                message = "Caregiver transfer stopped."
            else:
                message = "Caregiver transfer failed."

            self._send_tool_result_to_agent(tool_call_id, message, True)

        await self.deadman.arm_start(
            action="start_call",
            on_commit=on_commit,
            on_cancel=on_cancel,
        )

    async def arm_media_deadman(
        self,
        tool_call_id: str,
        action: MediaStartAction,
        vibe: str,
    ) -> str:
        pending = self.deadman.pending
        if pending and pending.action == "start_call":
            raise ValueError("Cannot start media while a call is pending")

        self.media_automation.on_new_start_requested()

        async def on_commit() -> None:
            await self.media_automation.start_media(
                tool_call_id=tool_call_id,
                action=action,
                vibe=vibe,
                send_tool_result=self._send_tool_result_to_agent,
            )


        async def on_cancel(reason: DeadmanCancelReason) -> None:
            message: str
            if reason == "cancelled":
                message = "User cancelled starting media."
            elif reason == "superseded":
                message = "Media request superseded."
            elif reason == "stopped":
                message = "Media request stopped."
            else:
                message = "Media start failed."

            self._send_tool_result_to_agent(tool_call_id, message, True)

        return await self.deadman.arm_start(action=str(action), on_commit=on_commit, on_cancel=on_cancel)

    async def stop_media(self, action: MediaStopAction) -> None:
        was_music = self.media_automation.is_music_playing
        was_images = self.media_automation.is_images_displaying

        await self.deadman.cancel_if_action("play_music", reason="stopped")
        await self.deadman.cancel_if_action("display_images", reason="stopped")
        await self.media_automation.stop(action)


    async def cancel_deadman(self, pending_id: str) -> bool:
        return await self.deadman.cancel(pending_id)

    async def handle_media_event(self, event: str, payload: dict[str, Any]) -> None:
        self.media_automation.on_media_event(event, payload)

    async def ensure_session_started(
        self,
        reason: str,
        trigger_type: str,
        reason_data: dict[str, Any] | None = None,
    ) -> None:
        if self.session_id:
            return
        if self.session_init_task:
            await self.session_init_task
            return

        await self.ensure_profile_loaded()

        async def init() -> None:
            self.session_id = await agent_session_service.start_session(
                device_id=self.device_id,
                reason=reason,
                trigger_type=trigger_type,
                reason_data=reason_data,
                initial_mode=self.session_mode,
            )

        self.session_init_task = asyncio.create_task(init())
        await self.session_init_task
        self.session_init_task = None

    async def end_session(self, reason: str) -> None:
        # Notify paired caregiver immediately — before any async cleanup
        connection_manager.send_to_paired_caregiver(self.device_id, {
            "type": "ring-episode-resolved",
            "device_id": self.device_id,
            "member_name": self.user_id,
            "resolution": reason,
        })

        session_init_task = self.session_init_task
        if session_init_task:
            await session_init_task
        self.session_init_task = None

        session_id = self.session_id
        ending_mode = self.session_mode

        self.media_automation.deactivate()
        await self.deadman.cancel_if_action("play_music", reason="stopped")
        await self.deadman.cancel_if_action("display_images", reason="stopped")

        self.suppress_session_end_on_close = True
        self.pause_conversation(reason)

        self.session_id = None
        self.dynamic_variables = {}
        self.session_mode = "normal"
        self.last_processed_vad_chunk_id = 0
        self.should_silence_on_init = False
        self.had_conversation_in_session = False
        self._pending_first_message = None
        self.tool_call_names.clear()  # Clear to prevent memory leaks

        self.vad_processor.close()
        self.vad_processor.reset()
        self.vad_speech_streak = 0
        self.vad_silence_streak = 0
        self.last_vad_probability = 0.0

        self.audio_gate.reset()

        resolved_session_id = session_id
        if not resolved_session_id:
            resolved_session_id = await agent_session_service.get_active_session_id(self.device_id)

        if resolved_session_id:
            await agent_session_service.end_session(
                session_id=resolved_session_id,
                reason=reason,
                ending_mode=ending_mode,
            )

    async def ensure_conversation_active(self, silence_on_init: bool = False) -> bool:
        """Ensure ElevenLabs conversation is active. Returns True when ready."""
        if not self.session_id:
            return False
        if self.agent_ws_state in {"active", "connecting"}:
            if self._connection_ready_event:
                await self._connection_ready_event.wait()
            return self.agent_ws_state == "active"

        self.last_conversation_start_reason = self.dynamic_variables.get("conversation_start_reason")
        self.suppress_session_end_on_close = False
        self.should_silence_on_init = silence_on_init
        self.agent_ws_state = "connecting"

        # PRE-COMPUTE before connecting (the key fix for delay/restart issue)
        self._precomputed_init_payload = await self._precompute_init_payload(silence_on_init)
        self._connection_ready_event = asyncio.Event()

        try:
            conversation = ElevenLabsConversation(
                agent_id=self._select_agent_id(),
                on_event=self.handle_agent_event,
            )
        except Exception:
            self.agent_ws = None
            self.agent_ws_state = "inactive"
            self._connection_ready_event.set()
            return False

        self.agent_ws = conversation
        conversation.connect()

        await self._connection_ready_event.wait()
        return self.agent_ws_state == "active"

    def pause_conversation(self, reason: str, preserve_pending: bool = False) -> None:
        self.suppress_session_end_on_close = True
        if self.agent_ws:
            self.agent_ws.close(1000, reason)
        self.agent_ws = None
        self.agent_ws_state = "inactive"
        if not preserve_pending:
            self.audio_gate.pending_audio_to_agent = []

    def _is_agent_ready(self) -> bool:
        return self.agent_ws is not None and self.agent_ws.is_open

    def _send_audio_to_agent(self, base64_chunk: str) -> None:
        if self.agent_ws and self.agent_ws.is_open:
            self.agent_ws.send_audio_chunk(base64_chunk)

    def _handle_speech_idle_timeout(self) -> None:
        if self.audio_gate.speech_active:
            self.end_speech(self.last_vad_probability)

    def _send_tool_result_to_agent(self, tool_call_id: str, result: str, is_error: bool = False) -> None:
        tool_name = self.tool_call_names.pop(tool_call_id, None)
        if not tool_name and "_" in tool_call_id:
            tool_name = tool_call_id.rsplit("_", 1)[0]
        if not is_error and self.session_id and tool_name in LOGGED_TOOL_CALLS:
            asyncio.create_task(
                event_log_service.log_event(
                    device_id=self.device_id,
                    event_type=EventType.TOOL_RESULT,
                    data={
                        "toolName": tool_name,
                        "toolCallId": tool_call_id,
                        "result": result,
                    },
                    session_id=self.session_id,
                )
            )

        if not self.agent_ws or not self.agent_ws.is_open:
            return
        payload = {
            "type": "client_tool_result",
            "tool_call_id": tool_call_id,
            "result": result,
            "is_error": is_error,
        }
        self.agent_ws.send_json(payload)

    async def _build_init_dynamic_variables(self) -> dict[str, Any]:
        variables: dict[str, Any] = {}
        variables.update(self.dynamic_variables)

        variables.setdefault("patient_name", self.patient_name)
        variables.setdefault("caregiver_name", self.caregiver_name)

        variables["music_playing"] = self.media_automation.is_music_playing
        variables["images_displaying"] = self.media_automation.is_images_displaying

        if "conversation_start_reason" not in variables:
            fallback_reason = self.last_conversation_start_reason
            if not isinstance(fallback_reason, str) or not fallback_reason.strip() or fallback_reason == "unknown":
                fallback_reason = DEFAULT_USER_SPEECH_START_REASON
            variables["conversation_start_reason"] = fallback_reason

        try:
            logs = await event_log_service.get_recent_entries(self.device_id, 30, 30)
            variables["session_logs"] = build_session_logs(logs)
        except Exception:
            variables.setdefault("session_logs", "(no recent events)")

        return variables

    async def _precompute_init_payload(self, silence_on_init: bool) -> dict[str, Any]:
        """Pre-compute init payload BEFORE connecting to ElevenLabs."""
        init_payload: dict[str, Any] = {
            "type": "conversation_initiation_client_data",
            "user_input_audio_format": "pcm_s16le_16000",
        }

        variables = await self._build_init_dynamic_variables()

        if silence_on_init:
            first_message = ""
        elif self._pending_first_message:
            first_message = self._pending_first_message
            self._pending_first_message = None
        else:
            first_message = await self._generate_first_message(variables)

        if first_message is not None:
            init_payload["conversation_config_override"] = {
                "agent": {"first_message": first_message}
            }

        if variables:
            init_payload["dynamic_variables"] = variables

        return init_payload

    async def _generate_first_message(self, variables: dict[str, Any]) -> str | None:
        """Generate first message for agent.

        Returns:
            str: Generated message (or "" for silence)
            None: Use agent's default first message
        """
        if self.should_silence_on_init:
            return ""

        if self._pending_first_message:
            first_message = self._pending_first_message
            self._pending_first_message = None
            return first_message

        reason = variables.get("conversation_start_reason", "")
        session_logs = variables.get("session_logs", "")

        if not self.had_conversation_in_session:
            return await generate_conversation_opener(
                patient_name=self.patient_name,
                reason=reason,
                session_mode=self.session_mode,
            )
        else:
            return await generate_conversation_refresher(
                patient_name=self.patient_name,
                reason=reason,
                session_mode=self.session_mode,
                session_logs=session_logs,
            )

    def _send_conversation_init_payload_sync(self) -> None:
        """Send pre-computed init payload. Called synchronously from 'open' handler."""
        if not self.agent_ws or not self.agent_ws.is_open:
            return

        if self._precomputed_init_payload:
            self.agent_ws.send_json(self._precomputed_init_payload)
            self._precomputed_init_payload = None

        self.dynamic_variables.pop("conversation_start_reason", None)
        self.should_silence_on_init = False
        self.had_conversation_in_session = True

        self.audio_gate.flush_pending_audio()

        if self._connection_ready_event:
            self._connection_ready_event.set()

    def handle_agent_event(self, event: dict[str, Any]) -> None:
        event_type = event.get("type")

        if event_type == "open":
            self.agent_ws_state = "active"
            print(f"[Server][Agent] conversation start reason={self.last_conversation_start_reason}")
            self._send_conversation_init_payload_sync()  # Sync, not async task
            return

        if event_type == "message":
            self.handle_agent_message(event.get("text", ""))
            return

        if event_type == "close":
            self.agent_ws_state = "inactive"
            self.agent_ws = None
            self.audio_gate.stop_silence_fill()
            self.audio_gate.pending_audio_to_agent = []

            # Signal ready event in case connection closed before "open" was received
            if self._connection_ready_event:
                self._connection_ready_event.set()

            info = event.get("info", {})
            code = info.get("code", 0)
            reason = info.get("reason", "unknown")
            print(f"[Server][Agent] conversation end code={code} reason={reason}")
            return

        if event_type == "error":
            self.audio_gate.stop_silence_fill()

    def handle_agent_message(self, text: str) -> None:
        payload = safe_json_parse(text)
        if not payload:
            return

        message_type = payload.get("type") if isinstance(payload.get("type"), str) else None

        if message_type == "ping":
            ping_event = payload.get("ping_event")
            event_id = ping_event.get("event_id") if isinstance(ping_event, dict) else None
            delay_ms = ping_event.get("ping_ms") if isinstance(ping_event, dict) else 0

            def send_pong() -> None:
                if not self.agent_ws or not self.agent_ws.is_open:
                    return
                if not event_id:
                    return
                self.agent_ws.send_json({"type": "pong", "event_id": event_id})

            if isinstance(delay_ms, (int, float)) and delay_ms > 0:
                asyncio.get_running_loop().call_later(delay_ms / 1000, send_pong)
            else:
                send_pong()
            return

        if message_type == "audio":
            audio_event = payload.get("audio_event")
            event_id = audio_event.get("event_id") if isinstance(audio_event, dict) else None
            base64_audio = audio_event.get("audio_base_64") if isinstance(audio_event, dict) else None
            if not isinstance(base64_audio, str) or not base64_audio:
                return
            try:
                pcm = base64.b64decode(base64_audio)
                self.audio_chunk_count += 1
                print(
                    f"[Server][AgentAudio] chunk={self.audio_chunk_count} event_id={event_id or '?'} bytes={len(pcm)}"
                )
                if pcm:
                    self.send_binary_to_watch(pcm)
                    self.media_automation.on_agent_audio_chunk()
            except Exception as e:
                print(f"[Server][AgentAudio] Failed to decode audio chunk: {e}")
            return

        if message_type == "client_tool_call":
            call = payload.get("client_tool_call")
            if isinstance(call, dict):
                tool_name = call.get("tool_name") if isinstance(call.get("tool_name"), str) else None
                tool_call_id = call.get("tool_call_id") if isinstance(call.get("tool_call_id"), str) else None
                parameters_value = call.get("parameters")
                parameters = parameters_value if isinstance(parameters_value, dict) else {}

                if tool_name and tool_call_id:
                    print(f"[Server][Tool] call name={tool_name} id={tool_call_id}")
                    # Store tool call name with safety limit to prevent memory leaks
                    if len(self.tool_call_names) >= self._max_pending_tool_calls:
                        # Remove oldest entries if limit exceeded (FIFO cleanup)
                        oldest_keys = list(self.tool_call_names.keys())[: len(self.tool_call_names) // 2]
                        for key in oldest_keys:
                            self.tool_call_names.pop(key, None)
                        print(f"[Server][Tool] Cleaned up {len(oldest_keys)} stale tool call entries")
                    self.tool_call_names[tool_call_id] = tool_name
                    if should_handle_tool(tool_name):
                        context = ToolContext(
                            device_id=self.device_id,
                            session_id=self.session_id,
                            send_tool_result=self._send_tool_result_to_agent,
                            pause_conversation=self.pause_conversation,
                            end_session=self.end_session,
                            transfer_session=self.transfer_session,
                            transfer_to_caregiver=self.transfer_to_caregiver,
                            arm_media_deadman=self.arm_media_deadman,
                            start_media_now=self.start_media_now,
                            stop_media=self.stop_media,
                        )
                        asyncio.create_task(
                            handle_tool_call(
                                context,
                                tool_name,
                                tool_call_id,
                                parameters,
                            )
                        )
                        return


    async def handle_user_audio_chunk(self, chunk: str | bytes) -> None:
        if not self.session_id:
            await self.ensure_session_started(
                reason="User audio received from the watch.",
                trigger_type="user_audio",
            )
        if not self.session_id:
            return

        self.audio_gate.mark_audio_activity()

        pcm16 = bytes(chunk)
        if not pcm16:
            return

        base64_chunk = base64.b64encode(pcm16).decode()

        self.vad_processor.enqueue(pcm16, base64_chunk)

    def _process_vad_decision(self, chunk: PendingVadChunk, vad: dict[str, Any]) -> None:
        try:
            self.last_processed_vad_chunk_id = int(chunk.chunk_id)
        except ValueError:
            pass
        self.last_vad_probability = float(vad.get("probability") or 0.0)

        if not self.audio_gate.speech_active:
            self.audio_gate.queue_pre_roll(chunk.base64, len(chunk.pcm16))

        if vad.get("isSpeech"):
            self.vad_speech_streak += 1
            self.vad_silence_streak = 0
        else:
            self.vad_silence_streak += 1
            self.vad_speech_streak = 0

        if not self.audio_gate.speech_active and self.vad_speech_streak >= VAD_START_FRAMES:
            self.start_speech(chunk.pcm16, self.last_vad_probability)
            self.audio_gate.flush_pre_roll()
            return

        if self.audio_gate.speech_active:
            if self.agent_ws_state not in {"active", "connecting"}:
                dynamic_reason = self.dynamic_variables.get("conversation_start_reason")
                if not isinstance(dynamic_reason, str) or not dynamic_reason.strip():
                    self.set_conversation_start_reason(DEFAULT_USER_SPEECH_START_REASON)
                asyncio.create_task(self.ensure_conversation_active(silence_on_init=True))

            self.audio_gate.queue_audio_to_agent(chunk.base64)

            if self.vad_silence_streak >= VAD_STOP_FRAMES:
                self.end_speech(self.last_vad_probability)

    def start_speech(self, first_pcm16_chunk: bytes, probability: float) -> None:
        if self.audio_gate.speech_active or not self.session_id:
            return
        self.audio_gate.speech_active = True
        self.audio_gate.stop_silence_fill()
        self.media_automation.on_user_speech_start()
        asyncio.create_task(
            event_log_service.log_event(
                device_id=self.device_id,
                event_type=EventType.USER_SPEECH_START,
                data={"vad": probability},
                session_id=self.session_id,
            )
        )

        if self.agent_ws_state != "active":
            dynamic_reason = self.dynamic_variables.get("conversation_start_reason")
            if not isinstance(dynamic_reason, str) or not dynamic_reason.strip():
                self.set_conversation_start_reason(DEFAULT_USER_SPEECH_START_REASON)
            asyncio.create_task(self.ensure_conversation_active(silence_on_init=True))

    def end_speech(self, probability: float) -> None:
        if not self.audio_gate.speech_active or not self.session_id:
            return
        self.audio_gate.speech_active = False
        self.vad_speech_streak = 0
        self.vad_silence_streak = 0
        self.audio_gate.pre_roll_chunks = []
        asyncio.create_task(
            event_log_service.log_event(
                device_id=self.device_id,
                event_type=EventType.USER_SPEECH_END,
                data={"vad": probability},
                session_id=self.session_id,
            )
        )
        self.audio_gate.send_silence_tail()
        self.audio_gate.start_silence_fill()
        self.media_automation.on_user_speech_end()

    async def on_watch_disconnected(self) -> None:
        await self.deadman.cancel_any(reason="stopped")
        await self.end_session(DEFAULT_WATCH_DISCONNECTED_REASON)
