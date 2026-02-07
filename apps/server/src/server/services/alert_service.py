"""Alert generation and dispatch service."""

import logging
from datetime import datetime
from uuid import uuid4

from ..config import settings
from ..websocket.connection_manager import connection_manager
from .community_engine import community_engine

logger = logging.getLogger(__name__)


class AlertService:
    """Generates and dispatches alerts based on anomaly detection results."""

    def __init__(self):
        self._alerts: list[dict] = []
        self._active_alerts: dict[str, dict] = {}

    async def check_and_generate(self, zone_ids: list[str]):
        """Check all zones and generate alerts if thresholds are exceeded."""
        for zone_id in zone_ids:
            zone_result = community_engine.compute_zone_score(zone_id)

            if zone_result.get("is_community_anomaly"):
                await self._create_community_alert(zone_id, zone_result)
            elif zone_result["anomalous_devices"] > 0:
                for device_id, score in zone_result["device_scores"].items():
                    if score > settings.ANOMALY_THRESHOLD:
                        await self._create_individual_alert(device_id, zone_id, score)

    async def check_group_and_generate(self, group_id: str, group_type: str, member_user_ids: list[str]):
        """Check a group and generate alerts based on group type."""
        result = community_engine.compute_group_score(group_id, member_user_ids, group_type)

        if result.get("is_group_anomaly"):
            await self._create_group_alert(group_id, group_type, result)

    async def _create_community_alert(self, zone_id: str, zone_result: dict):
        alert_key = f"community_{zone_id}"
        if alert_key in self._active_alerts:
            self._active_alerts[alert_key]["score"] = zone_result["score"]
            self._active_alerts[alert_key]["updated_at"] = datetime.utcnow().isoformat()
            return

        alert = {
            "id": str(uuid4()),
            "type": "community",
            "severity": "critical",
            "zone_id": zone_id,
            "title": f"Community anomaly detected in zone",
            "description": (
                f"{zone_result['anomalous_devices']} of {zone_result['active_devices']} "
                f"devices showing elevated anomaly scores. Possible environmental hazard "
                f"or coordinated distress event."
            ),
            "score": zone_result["score"],
            "affected_devices": list(zone_result["device_scores"].keys()),
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
        }

        self._alerts.append(alert)
        self._active_alerts[alert_key] = alert

        await connection_manager.broadcast_to_dashboards({
            "type": "alert",
            "alert": alert,
        })
        await connection_manager.broadcast_to_zone(zone_id, {
            "type": "zone_alert",
            "alert": alert,
        })

        logger.warning(f"COMMUNITY ALERT: zone={zone_id}, score={zone_result['score']:.3f}")

    async def _create_group_alert(self, group_id: str, group_type: str, result: dict):
        """Create an alert for a group (family or community)."""
        alert_key = f"group_{group_id}"
        if alert_key in self._active_alerts:
            self._active_alerts[alert_key]["score"] = result["score"]
            self._active_alerts[alert_key]["updated_at"] = datetime.utcnow().isoformat()
            return

        if group_type == "family":
            severity = "critical" if result["max_score"] > 0.8 else "warning"
            title = "Family member in distress"
            description = (
                f"{result['anomalous_members']} family member(s) showing elevated anomaly scores. "
                f"Immediate attention may be needed."
            )
        else:
            severity = "critical"
            title = "Community group anomaly detected"
            description = (
                f"{result['anomalous_members']} of {result['active_members']} members "
                f"showing elevated scores. Possible coordinated event."
            )

        alert = {
            "id": str(uuid4()),
            "type": "group",
            "severity": severity,
            "group_id": group_id,
            "group_type": group_type,
            "title": title,
            "description": description,
            "score": result["score"],
            "affected_devices": list(result["device_scores"].keys()),
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
        }

        self._alerts.append(alert)
        self._active_alerts[alert_key] = alert

        await connection_manager.broadcast_to_dashboards({
            "type": "alert",
            "alert": alert,
        })
        await connection_manager.broadcast_to_group(group_id, {
            "type": "group-alert",
            "groupId": group_id,
            "alert": alert,
        })

        logger.warning(f"GROUP ALERT: group={group_id} ({group_type}), score={result['score']:.3f}")

    async def _create_individual_alert(self, device_id: str, zone_id: str, score: float, group_id: str | None = None):
        alert_key = f"individual_{device_id}"
        if alert_key in self._active_alerts:
            self._active_alerts[alert_key]["score"] = score
            return

        severity = "critical" if score > 0.8 else "warning"
        alert = {
            "id": str(uuid4()),
            "type": "individual",
            "severity": severity,
            "zone_id": zone_id,
            "group_id": group_id,
            "device_id": device_id,
            "title": f"Individual distress detected",
            "description": f"Device {device_id[:8]}... showing anomaly score of {score:.2f}",
            "score": score,
            "affected_devices": [device_id],
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
        }

        self._alerts.append(alert)
        self._active_alerts[alert_key] = alert

        await connection_manager.broadcast_to_dashboards({
            "type": "alert",
            "alert": alert,
        })

        if group_id:
            await connection_manager.broadcast_to_group(group_id, {
                "type": "group-alert",
                "groupId": group_id,
                "alert": alert,
            })

        logger.warning(f"INDIVIDUAL ALERT: device={device_id}, score={score:.3f}")

    async def resolve_alert(self, alert_id: str, acknowledged_by: str | None = None):
        for key, alert in list(self._active_alerts.items()):
            if alert["id"] == alert_id:
                alert["is_active"] = False
                alert["resolved_at"] = datetime.utcnow().isoformat()
                alert["acknowledged_by"] = acknowledged_by
                del self._active_alerts[key]

                await connection_manager.broadcast_to_dashboards({
                    "type": "alert_resolved",
                    "alert_id": alert_id,
                })
                break

    def get_alerts(self, limit: int = 50, active_only: bool = False) -> list[dict]:
        alerts = self._alerts
        if active_only:
            alerts = [a for a in alerts if a.get("is_active")]
        return sorted(alerts, key=lambda a: a["created_at"], reverse=True)[:limit]

    def get_active_alerts(self) -> list[dict]:
        return list(self._active_alerts.values())

    def get_zone_alerts(self, zone_id: str) -> list[dict]:
        return [a for a in self._alerts if a.get("zone_id") == zone_id]

    def get_group_alerts(self, group_id: str) -> list[dict]:
        return [a for a in self._alerts if a.get("group_id") == group_id]


alert_service = AlertService()
