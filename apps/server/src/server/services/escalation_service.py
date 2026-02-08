"""Escalation service — timed escalation chain for episodes."""

import asyncio
import logging
from datetime import datetime

from .episode_service import episode_service

logger = logging.getLogger(__name__)


class EscalationService:
    """Manages timed escalation for active episodes."""

    def __init__(self):
        self._escalation_timers: dict[str, asyncio.Task] = {}  # episode_id -> timer task

    async def start_escalation(self, episode_id: str, episode_data: dict):
        """Begin the escalation chain for an episode."""
        await self.cancel_escalation(episode_id)

        current_level = episode_data.get("escalation_level", 1)
        logger.info(f"Starting escalation chain for episode {episode_id} at level {current_level}")

        # Notify primary caregiver immediately
        await self.notify_caregiver(episode_data, current_level)

        # Schedule next escalation level
        if current_level < 3:
            delay = 120 if current_level == 1 else 300  # 2min → level 2, 5min → level 3
            task = asyncio.create_task(
                self._escalation_timer(episode_id, delay, current_level + 1)
            )
            self._escalation_timers[episode_id] = task

    async def _escalation_timer(self, episode_id: str, delay_seconds: int, next_level: int):
        """Wait and then escalate to the next level if not resolved."""
        try:
            await asyncio.sleep(delay_seconds)
        except asyncio.CancelledError:
            logger.info(f"Escalation timer cancelled for episode {episode_id}")
            return

        episode = episode_service.get_episode(episode_id)
        if not episode or episode.get("phase") == "resolved":
            return

        # Escalate
        await episode_service.escalate(episode_id, next_level)
        episode = episode_service.get_episode(episode_id)
        if episode:
            await self.notify_caregiver(episode, next_level)

        # Schedule next level
        if next_level < 3:
            delay = 300  # 5 minutes to emergency
            task = asyncio.create_task(
                self._escalation_timer(episode_id, delay, next_level + 1)
            )
            self._escalation_timers[episode_id] = task

    async def cancel_escalation(self, episode_id: str):
        """Cancel any pending escalation timer."""
        task = self._escalation_timers.pop(episode_id, None)
        if task and not task.done():
            task.cancel()
            logger.info(f"Cancelled escalation for episode {episode_id}")

    async def notify_caregiver(self, episode: dict, level: int):
        """Broadcast caregiver alert via WebSocket."""
        level_labels = {
            1: "Primary Contact",
            2: "Secondary Contacts",
            3: "Emergency Services",
        }

        alert_msg = {
            "type": "caregiver-alert",
            "episode_id": episode["id"],
            "user_id": episode["user_id"],
            "device_id": episode["device_id"],
            "escalation_level": level,
            "level_label": level_labels.get(level, f"Level {level}"),
            "severity_score": episode.get("severity_score", 0),
            "phase": episode.get("phase"),
            "trigger_data": episode.get("trigger_data"),
            "fusion_result": episode.get("fusion_result"),
            "timeline_count": len(episode.get("timeline", [])),
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Broadcast to group subscribers and dashboards
        try:
            from ..websocket.connection_manager import connection_manager

            group_id = episode.get("group_id")
            if group_id:
                await connection_manager.broadcast_to_group(group_id, alert_msg)
            await connection_manager.broadcast_to_dashboards(alert_msg)
        except Exception as e:
            logger.error(f"Failed to broadcast caregiver alert: {e}")

        logger.info(
            f"Caregiver alert sent for episode {episode['id']} "
            f"(level={level}, severity={episode.get('severity_score', 0):.2f})"
        )


# Singleton
escalation_service = EscalationService()
