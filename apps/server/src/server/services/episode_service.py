"""Episode lifecycle service — manages detection-to-resolution episodes."""

import logging
from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

logger = logging.getLogger(__name__)


class EpisodeService:
    """In-memory episode lifecycle manager for the hackathon demo."""

    def __init__(self):
        self._active_episodes: dict[str, dict] = {}  # device_id -> episode
        self._episode_by_id: dict[str, dict] = {}  # episode_id -> episode
        self._episode_history: list[dict] = []

    async def start_episode(
        self, device_id: str, user_id: str, trigger_data: dict[str, Any], group_id: str | None = None
    ) -> dict:
        episode_id = uuid4().hex[:12]
        now = datetime.utcnow().isoformat()

        episode = {
            "id": episode_id,
            "device_id": device_id,
            "user_id": user_id,
            "group_id": group_id,
            "phase": "anomaly_detected",
            "trigger_data": trigger_data,
            "calming_started_at": None,
            "calming_ended_at": None,
            "re_evaluation_result": None,
            "presage_data": None,
            "fusion_result": None,
            "fusion_decision": None,
            "escalation_level": 0,
            "severity_score": trigger_data.get("anomaly_score", 0.5),
            "timeline": [
                {"phase": "anomaly_detected", "timestamp": now, "data": trigger_data}
            ],
            "resolved_at": None,
            "resolution": None,
            "created_at": now,
        }

        self._active_episodes[device_id] = episode
        self._episode_by_id[episode_id] = episode

        logger.info(f"Episode {episode_id} started for device {device_id}")
        return episode

    async def update_phase(self, episode_id: str, new_phase: str, data: dict[str, Any] | None = None) -> dict | None:
        episode = self._episode_by_id.get(episode_id)
        if not episode:
            return None

        now = datetime.utcnow().isoformat()
        episode["phase"] = new_phase
        episode["timeline"].append({
            "phase": new_phase,
            "timestamp": now,
            "data": data or {},
        })

        if new_phase == "calming":
            episode["calming_started_at"] = now

        logger.info(f"Episode {episode_id} → {new_phase}")
        return episode

    async def submit_calming_result(self, episode_id: str, post_vitals: dict[str, Any]) -> dict | None:
        episode = self._episode_by_id.get(episode_id)
        if not episode:
            return None

        now = datetime.utcnow().isoformat()
        episode["calming_ended_at"] = now
        episode["re_evaluation_result"] = post_vitals

        # Check if calming resolved the issue
        heart_rate = post_vitals.get("heart_rate", post_vitals.get("heartRate", 0))
        hrv = post_vitals.get("hrv", 0)

        # If HR returned to normal range, calming worked
        if heart_rate < 100 and hrv > 30:
            episode["phase"] = "resolved"
            episode["resolved_at"] = now
            episode["resolution"] = "calming_resolved"
            episode["severity_score"] = 0.1
            episode["timeline"].append({
                "phase": "resolved",
                "timestamp": now,
                "data": {"reason": "calming_resolved", "post_vitals": post_vitals},
            })
            # Move to history
            self._move_to_history(episode)
            logger.info(f"Episode {episode_id} resolved via calming")
        else:
            # Calming didn't resolve — move to visual check
            episode["phase"] = "visual_check"
            episode["timeline"].append({
                "phase": "re_evaluating",
                "timestamp": now,
                "data": {"post_vitals": post_vitals, "result": "still_elevated"},
            })
            episode["timeline"].append({
                "phase": "visual_check",
                "timestamp": now,
                "data": {"reason": "post_calming_still_elevated"},
            })
            logger.info(f"Episode {episode_id} → visual_check (calming insufficient)")

        return episode

    async def submit_presage_data(self, episode_id: str, presage_result: dict[str, Any]) -> dict | None:
        episode = self._episode_by_id.get(episode_id)
        if not episode:
            return None

        now = datetime.utcnow().isoformat()
        episode["presage_data"] = presage_result
        episode["phase"] = "fusing"
        episode["timeline"].append({
            "phase": "fusing",
            "timestamp": now,
            "data": {"presage_data": presage_result},
        })

        # Auto-run fusion
        return await self.run_fusion(episode_id)

    async def run_fusion(self, episode_id: str) -> dict | None:
        episode = self._episode_by_id.get(episode_id)
        if not episode:
            return None

        now = datetime.utcnow().isoformat()

        # Try Gemini AI analysis first, fall back to threshold
        gemini_result = await self._try_gemini_fusion(episode)

        if gemini_result:
            fusion_result = self._build_gemini_fusion_result(episode, gemini_result)
            decision = gemini_result["decision"]
            combined_score = gemini_result["severity_score"]
        else:
            fusion_result = self._run_threshold_fusion(episode)
            decision = fusion_result["decision"]
            combined_score = fusion_result["combined_score"]

        episode["fusion_result"] = fusion_result
        episode["fusion_decision"] = decision
        episode["severity_score"] = round(combined_score, 3)

        episode["timeline"].append({
            "phase": "fusion_complete",
            "timestamp": now,
            "data": fusion_result,
        })

        if decision == "escalate":
            episode["phase"] = "escalating"
            episode["escalation_level"] = 1
            episode["timeline"].append({
                "phase": "escalating",
                "timestamp": now,
                "data": {"level": 1, "reason": "fusion_escalate"},
            })
            logger.info(f"Episode {episode_id} → escalating (severity={combined_score:.2f})")
        elif decision == "false_positive":
            episode["phase"] = "resolved"
            episode["resolved_at"] = now
            episode["resolution"] = "false_positive"
            episode["timeline"].append({
                "phase": "resolved",
                "timestamp": now,
                "data": {"reason": "false_positive"},
            })
            self._move_to_history(episode)
            logger.info(f"Episode {episode_id} resolved as false positive")
        else:
            # Ambiguous — escalate with lower priority
            episode["phase"] = "escalating"
            episode["escalation_level"] = 1
            episode["timeline"].append({
                "phase": "escalating",
                "timestamp": now,
                "data": {"level": 1, "reason": "ambiguous_escalation"},
            })
            logger.info(f"Episode {episode_id} → escalating (ambiguous)")

        return episode

    async def _try_gemini_fusion(self, episode: dict) -> dict | None:
        try:
            from .gemini_service import analyze_episode
            return await analyze_episode(episode)
        except Exception as e:
            logger.warning(f"Gemini fusion unavailable: {e}")
            return None

    def _build_gemini_fusion_result(self, episode: dict, gemini: dict) -> dict:
        """Build a fusion_result dict from Gemini's analysis."""
        trigger = episode.get("trigger_data", {})
        heart_rate = trigger.get("heart_rate", trigger.get("heartRate", 80))
        hrv = trigger.get("hrv", 50)
        hr_score = min(1.0, max(0.0, (heart_rate - 80) / 80))
        hrv_score = min(1.0, max(0.0, (50 - hrv) / 40))
        watch_score = hr_score * 0.7 + hrv_score * 0.3

        return {
            "decision": gemini["decision"],
            "watch_score": round(watch_score, 3),
            "presage_score": None,
            "combined_score": round(gemini["severity_score"], 3),
            "explanation": gemini["reasoning"],
            "caregiver_report": gemini["caregiver_report"],
            "likely_cause": gemini["likely_cause"],
            "confidence": gemini["confidence"],
            "analysis_engine": "gemini",
        }

    def _run_threshold_fusion(self, episode: dict) -> dict:
        """Original threshold-based fusion as fallback."""
        trigger = episode.get("trigger_data", {})
        heart_rate = trigger.get("heart_rate", trigger.get("heartRate", 80))
        hrv = trigger.get("hrv", 50)

        hr_score = min(1.0, max(0.0, (heart_rate - 80) / 80))
        hrv_score = min(1.0, max(0.0, (50 - hrv) / 40))
        watch_score = hr_score * 0.7 + hrv_score * 0.3

        presage = episode.get("presage_data")

        if presage:
            expression = presage.get("facial_expression", presage.get("facialExpression", "calm"))
            eye_resp = presage.get("eye_responsiveness", presage.get("eyeResponsiveness", "normal"))
            confidence = presage.get("confidence_score", presage.get("confidenceScore", 0.5))

            expression_scores = {"calm": 0.1, "confused": 0.4, "distressed": 0.8, "pain": 0.95}
            eye_scores = {"normal": 0.1, "slow": 0.5, "unresponsive": 0.95}

            presage_score = (
                expression_scores.get(expression, 0.5) * 0.6
                + eye_scores.get(eye_resp, 0.3) * 0.4
            ) * confidence

            combined_score = watch_score * 0.5 + presage_score * 0.5

            if combined_score >= 0.6:
                decision = "escalate"
            elif combined_score <= 0.3:
                decision = "false_positive"
            else:
                decision = "ambiguous"

            explanations = {
                "escalate": f"Watch vitals elevated (HR={heart_rate}) and visual check shows {expression} expression with {eye_resp} eye response. Combined severity {combined_score:.1%} warrants escalation.",
                "false_positive": f"Despite elevated watch readings, visual check shows {expression} expression with normal responsiveness. Likely exercise or stress — not a medical event.",
                "ambiguous": f"Mixed signals: watch score {watch_score:.1%}, visual score {presage_score:.1%}. Monitoring recommended.",
            }

            return {
                "decision": decision,
                "watch_score": round(watch_score, 3),
                "presage_score": round(presage_score, 3),
                "combined_score": round(combined_score, 3),
                "explanation": explanations[decision],
                "analysis_engine": "threshold",
            }
        else:
            combined_score = watch_score
            if watch_score >= 0.7:
                decision = "ambiguous"
            else:
                decision = "false_positive"

            return {
                "decision": decision,
                "watch_score": round(watch_score, 3),
                "presage_score": None,
                "combined_score": round(combined_score, 3),
                "explanation": f"No visual check-in data available. Watch score: {watch_score:.1%}. {'Recommending escalation due to sustained elevated vitals.' if decision == 'ambiguous' else 'Watch-only data suggests false positive.'}",
                "analysis_engine": "threshold",
            }

    async def escalate(self, episode_id: str, level: int) -> None:
        episode = self._episode_by_id.get(episode_id)
        if not episode:
            return

        now = datetime.utcnow().isoformat()
        episode["escalation_level"] = level
        episode["timeline"].append({
            "phase": "escalation_upgrade",
            "timestamp": now,
            "data": {"level": level},
        })
        logger.info(f"Episode {episode_id} escalated to level {level}")

    async def resolve(self, episode_id: str, resolution: str) -> dict | None:
        episode = self._episode_by_id.get(episode_id)
        if not episode:
            return None

        now = datetime.utcnow().isoformat()
        episode["phase"] = "resolved"
        episode["resolved_at"] = now
        episode["resolution"] = resolution
        episode["timeline"].append({
            "phase": "resolved",
            "timestamp": now,
            "data": {"resolution": resolution},
        })

        self._move_to_history(episode)
        logger.info(f"Episode {episode_id} resolved: {resolution}")
        return episode

    def get_active_episode(self, device_id: str) -> dict | None:
        return self._active_episodes.get(device_id)

    def get_episode(self, episode_id: str) -> dict | None:
        return self._episode_by_id.get(episode_id)

    def get_active_episodes(self) -> list[dict]:
        return list(self._active_episodes.values())

    def get_history(self, limit: int = 50) -> list[dict]:
        return self._episode_history[-limit:]

    def _move_to_history(self, episode: dict):
        device_id = episode["device_id"]
        self._active_episodes.pop(device_id, None)
        self._episode_history.append(episode)
        # Keep history bounded
        if len(self._episode_history) > 200:
            self._episode_history = self._episode_history[-100:]


# Singleton
episode_service = EpisodeService()
