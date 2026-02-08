"""ElevenLabs Conversational AI calming voice service for Pulsera episodes."""

import asyncio
import base64
import json
import logging
from typing import Any

import websockets

from ..config import settings
from ..websocket.connection_manager import connection_manager

logger = logging.getLogger(__name__)


class CalmingSession:
    """A single ElevenLabs ConvAI session that streams calming audio to a watch."""

    def __init__(self, episode_id: str, device_id: str, member_name: str = "the wearer"):
        self.episode_id = episode_id
        self.device_id = device_id
        self.member_name = member_name
        self._ws: Any = None
        self._task: asyncio.Task | None = None
        self._running = False

    async def start(self):
        if not settings.ELEVENLABS_API_KEY or not settings.ELEVENLABS_AGENT_ID:
            logger.warning("ElevenLabs not configured — skipping calming voice")
            return

        self._running = True
        self._task = asyncio.create_task(self._run())

    async def stop(self):
        self._running = False
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass
        logger.info(f"Calming session stopped for episode {self.episode_id}")

    async def _run(self):
        url = f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={settings.ELEVENLABS_AGENT_ID}"
        try:
            async with websockets.connect(
                url,
                additional_headers={"xi-api-key": settings.ELEVENLABS_API_KEY},
            ) as ws:
                self._ws = ws
                logger.info(f"ElevenLabs connected for episode {self.episode_id}")

                # Send conversation initiation
                init_msg = {
                    "type": "conversation_initiation_client_data",
                    "conversation_initiation_client_data": {
                        "conversation_config_override": {
                            "agent": {
                                "first_message": (
                                    f"Hey, I'm here with you. Let's take a slow breath together. "
                                    f"Breathe in through your nose... hold... and slowly breathe out. "
                                    f"You're doing great. Let's keep going."
                                ),
                            },
                            "tts": {
                                "voice_id": None,  # use agent default
                            },
                        },
                        "dynamic_variables": {
                            "member_name": self.member_name,
                            "episode_id": self.episode_id,
                        },
                    },
                }
                await ws.send(json.dumps(init_msg))

                async for raw in ws:
                    if not self._running:
                        break

                    try:
                        msg = json.loads(raw)
                    except (json.JSONDecodeError, TypeError):
                        continue

                    msg_type = msg.get("type", "")

                    if msg_type == "audio":
                        audio_b64 = msg.get("audio_event", {}).get("audio_base_64", "")
                        if audio_b64:
                            pcm_data = base64.b64decode(audio_b64)
                            await connection_manager.send_binary_to_device(
                                self.device_id, pcm_data
                            )

                    elif msg_type == "ping":
                        ping_event = msg.get("ping_event", {})
                        event_id = ping_event.get("event_id")
                        if event_id:
                            await ws.send(json.dumps({
                                "type": "pong",
                                "event_id": event_id,
                            }))

                    elif msg_type == "agent_response":
                        text = msg.get("agent_response_event", {}).get("agent_response", "")
                        if text:
                            logger.debug(f"ElevenLabs agent: {text[:80]}")

                    elif msg_type == "conversation_initiation_metadata":
                        logger.info(f"ElevenLabs conversation started for episode {self.episode_id}")

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"ElevenLabs session error for episode {self.episode_id}: {e}")


class ElevenLabsService:
    """Manages calming voice sessions per episode."""

    def __init__(self):
        self._sessions: dict[str, CalmingSession] = {}

    async def start_calming(self, episode_id: str, device_id: str, member_name: str = "the wearer"):
        if episode_id in self._sessions:
            return

        session = CalmingSession(episode_id, device_id, member_name)
        self._sessions[episode_id] = session
        await session.start()

    async def stop_calming(self, episode_id: str):
        session = self._sessions.pop(episode_id, None)
        if session:
            await session.stop()


elevenlabs_service = ElevenLabsService()
