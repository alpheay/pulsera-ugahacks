"""Gemini 'Chief Medical Officer' — AI-powered episode fusion analysis."""

import json
import logging
from typing import Any

from ..config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Chief Medical Officer for Pulsera, a community health monitoring system.
You analyze biometric data from smartwatches combined with visual check-in data from phone cameras
to determine whether a detected health anomaly is a genuine medical event requiring escalation,
or a false positive (e.g., exercise, stress, excitement).

You must return a JSON object with exactly these fields:
- decision: "escalate" | "false_positive" | "ambiguous"
- severity_score: float 0.0-1.0
- confidence: float 0.0-1.0
- reasoning: string (2-3 sentence clinical reasoning)
- caregiver_report: string (1-2 sentence plain-English summary for a family caregiver)
- likely_cause: string (short label like "exercise", "panic_attack", "cardiac_event", "stress", "unknown")
"""


def _build_analysis_prompt(episode: dict[str, Any]) -> str:
    trigger = episode.get("trigger_data", {})
    post_vitals = episode.get("re_evaluation_result", {})
    presage = episode.get("presage_data", {})

    parts = ["Analyze this episode:\n"]

    parts.append("## Watch Biometrics (trigger)")
    parts.append(f"- Heart Rate: {trigger.get('heartRate', trigger.get('heart_rate', 'N/A'))} bpm")
    parts.append(f"- HRV: {trigger.get('hrv', 'N/A')} ms")
    parts.append(f"- Acceleration: {trigger.get('acceleration', 'N/A')} g")
    parts.append(f"- Skin Temperature: {trigger.get('skinTemp', trigger.get('skin_temp', 'N/A'))} C")
    parts.append(f"- Anomaly Type: {trigger.get('anomalyType', trigger.get('anomaly_type', 'N/A'))}")
    parts.append(f"- Anomaly Score: {trigger.get('anomaly_score', 'N/A')}")

    if post_vitals:
        parts.append("\n## Post-Calming Vitals")
        parts.append(f"- Heart Rate: {post_vitals.get('heartRate', post_vitals.get('heart_rate', 'N/A'))} bpm")
        parts.append(f"- HRV: {post_vitals.get('hrv', 'N/A')} ms")

    if presage:
        parts.append("\n## Visual Check-In (Presage Camera)")
        parts.append(f"- Facial Expression: {presage.get('facial_expression', presage.get('facialExpression', 'N/A'))}")
        parts.append(f"- Eye Responsiveness: {presage.get('eye_responsiveness', presage.get('eyeResponsiveness', 'N/A'))}")
        parts.append(f"- Visual Heart Rate: {presage.get('visual_heart_rate', presage.get('visualHeartRate', 'N/A'))} bpm")
        parts.append(f"- Breathing Rate: {presage.get('breathing_rate', presage.get('breathingRate', 'N/A'))}")
        parts.append(f"- Confidence: {presage.get('confidence_score', presage.get('confidenceScore', 'N/A'))}")
    else:
        parts.append("\n## Visual Check-In: Not available")

    parts.append("\nReturn your analysis as JSON.")
    return "\n".join(parts)


async def analyze_episode(episode: dict[str, Any]) -> dict[str, Any] | None:
    """Use Gemini to analyze an episode. Returns structured result or None if unavailable."""
    if not settings.GEMINI_API_KEY:
        logger.debug("Gemini API key not configured — skipping AI analysis")
        return None

    try:
        from google import genai

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = _build_analysis_prompt(episode)

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        result = json.loads(response.text)

        # Validate required fields
        required = {"decision", "severity_score", "confidence", "reasoning", "caregiver_report", "likely_cause"}
        if not required.issubset(result.keys()):
            logger.warning(f"Gemini response missing fields: {required - result.keys()}")
            return None

        # Validate decision value
        if result["decision"] not in ("escalate", "false_positive", "ambiguous"):
            logger.warning(f"Gemini returned invalid decision: {result['decision']}")
            return None

        logger.info(
            f"Gemini analysis: decision={result['decision']}, "
            f"severity={result['severity_score']}, cause={result['likely_cause']}"
        )
        return result

    except Exception as e:
        logger.error(f"Gemini analysis failed: {e}")
        return None
