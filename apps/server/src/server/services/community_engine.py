"""Community aggregation engine — detects zone-level and group-level anomaly patterns."""

import logging
from datetime import datetime
from collections import defaultdict

from ..config import settings
from .anomaly_detection import anomaly_detection_service
from ..websocket.connection_manager import connection_manager

logger = logging.getLogger(__name__)


class CommunityEngine:
    """Aggregates individual anomaly scores into zone-level and group-level patterns.

    Detects correlated anomalies (e.g., multiple members in the same zone
    showing elevated stress simultaneously — possible environmental hazard).

    Group types:
    - Family: alert on ANY individual anomaly (lower threshold)
    - Community: alert on pattern (>=3 members with elevated scores)
    """

    def __init__(self):
        self._zone_scores: dict[str, float] = {}
        self._zone_status: dict[str, str] = {}
        self._zone_history: dict[str, list[dict]] = defaultdict(list)
        self._group_scores: dict[str, float] = {}
        self._group_status: dict[str, str] = {}
        self._community_alerts: list[dict] = []

    def compute_zone_score(self, zone_id: str) -> dict:
        """Aggregate anomaly scores for all devices in a zone."""
        devices = connection_manager.get_devices_in_zone(zone_id)
        if not devices:
            return {
                "zone_id": zone_id,
                "score": 0.0,
                "status": "safe",
                "active_devices": 0,
                "anomalous_devices": 0,
                "device_scores": {},
            }

        device_scores = {}
        for conn in devices:
            score = anomaly_detection_service.get_device_score(conn.device_id)
            device_scores[conn.device_id] = score

        scores = list(device_scores.values())
        avg_score = sum(scores) / len(scores) if scores else 0
        max_score = max(scores) if scores else 0
        anomalous = sum(1 for s in scores if s > settings.ANOMALY_THRESHOLD)

        is_community_anomaly = (
            anomalous >= settings.COMMUNITY_MIN_AFFECTED
            and avg_score > settings.COMMUNITY_ANOMALY_THRESHOLD
        )

        if is_community_anomaly:
            status = "critical"
        elif anomalous >= 2 or max_score > 0.7:
            status = "warning"
        elif anomalous >= 1 or avg_score > 0.3:
            status = "elevated"
        else:
            status = "safe"

        self._zone_scores[zone_id] = avg_score
        self._zone_status[zone_id] = status

        result = {
            "zone_id": zone_id,
            "score": round(avg_score, 4),
            "max_score": round(max_score, 4),
            "status": status,
            "active_devices": len(devices),
            "anomalous_devices": anomalous,
            "is_community_anomaly": is_community_anomaly,
            "device_scores": {k: round(v, 4) for k, v in device_scores.items()},
            "timestamp": datetime.utcnow().isoformat(),
        }

        self._zone_history[zone_id].append(result)
        if len(self._zone_history[zone_id]) > 300:
            self._zone_history[zone_id] = self._zone_history[zone_id][-300:]

        return result

    def compute_group_score(self, group_id: str, member_user_ids: list[str], group_type: str = "community") -> dict:
        """Aggregate anomaly scores for all members in a group."""
        from .health import health_service

        device_scores = {}
        for user_id in member_user_ids:
            device_ids = connection_manager.get_user_device_ids(user_id)
            for did in device_ids:
                score = anomaly_detection_service.get_device_score(did)
                device_scores[did] = score

        scores = list(device_scores.values())
        avg_score = sum(scores) / len(scores) if scores else 0
        max_score = max(scores) if scores else 0
        anomalous = sum(1 for s in scores if s > settings.ANOMALY_THRESHOLD)

        if group_type == "family":
            # Family: alert on ANY individual anomaly
            if anomalous > 0 and max_score > 0.8:
                status = "critical"
            elif anomalous > 0:
                status = "warning"
            else:
                status = "safe"
            is_group_anomaly = anomalous > 0
        else:
            # Community: alert on pattern (3+ members)
            is_group_anomaly = (
                anomalous >= settings.COMMUNITY_MIN_AFFECTED
                and avg_score > settings.COMMUNITY_ANOMALY_THRESHOLD
            )
            if is_group_anomaly:
                status = "critical"
            elif anomalous >= 2 or max_score > 0.7:
                status = "warning"
            elif anomalous >= 1:
                status = "elevated"
            else:
                status = "safe"

        self._group_scores[group_id] = avg_score
        self._group_status[group_id] = status

        return {
            "group_id": group_id,
            "group_type": group_type,
            "score": round(avg_score, 4),
            "max_score": round(max_score, 4),
            "status": status,
            "active_members": len(scores),
            "anomalous_members": anomalous,
            "is_group_anomaly": is_group_anomaly,
            "device_scores": {k: round(v, 4) for k, v in device_scores.items()},
            "timestamp": datetime.utcnow().isoformat(),
        }

    def compute_all_zones(self, zone_ids: list[str]) -> list[dict]:
        """Compute scores for all zones."""
        return [self.compute_zone_score(z) for z in zone_ids]

    def get_zone_score(self, zone_id: str) -> float:
        return self._zone_scores.get(zone_id, 0.0)

    def get_zone_status(self, zone_id: str) -> str:
        return self._zone_status.get(zone_id, "safe")

    def get_group_status(self, group_id: str) -> str:
        return self._group_status.get(group_id, "safe")

    def get_zone_history(self, zone_id: str, limit: int = 60) -> list[dict]:
        return self._zone_history.get(zone_id, [])[-limit:]

    def get_community_summary(self, zone_ids: list[str]) -> dict:
        """Get a summary of the entire community status."""
        results = self.compute_all_zones(zone_ids)
        total_devices = sum(r["active_devices"] for r in results)
        total_anomalous = sum(r["anomalous_devices"] for r in results)
        community_anomalies = sum(1 for r in results if r.get("is_community_anomaly"))

        if community_anomalies > 0:
            overall_status = "critical"
        elif total_anomalous >= 3:
            overall_status = "warning"
        elif total_anomalous >= 1:
            overall_status = "elevated"
        else:
            overall_status = "safe"

        return {
            "overall_status": overall_status,
            "total_devices": total_devices,
            "total_anomalous": total_anomalous,
            "community_anomalies": community_anomalies,
            "zones": results,
            "timestamp": datetime.utcnow().isoformat(),
        }


community_engine = CommunityEngine()
