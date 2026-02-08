"""Multi-device WebSocket connection manager for Pulsera community network."""

import logging
from dataclasses import dataclass, field
from datetime import datetime

from starlette.websockets import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class DeviceConnection:
    websocket: WebSocket
    device_id: str
    user_id: str
    zone_ids: list[str] = field(default_factory=list)
    connected_at: datetime = field(default_factory=datetime.utcnow)
    last_reading: datetime | None = None


class ConnectionManager:
    """Manages WebSocket connections for all community devices and dashboard clients."""

    def __init__(self):
        self._devices: dict[str, DeviceConnection] = {}  # device_id -> connection
        self._user_devices: dict[str, set[str]] = {}  # user_id -> set of device_ids
        self._dashboard_clients: set[WebSocket] = set()
        self._pending: set[WebSocket] = set()
        self._group_subscribers: dict[str, set[WebSocket]] = {}  # group_id -> set of websockets

    @property
    def active_device_count(self) -> int:
        return len(self._devices)

    @property
    def device_ids(self) -> list[str]:
        return list(self._devices.keys())

    def add_pending(self, ws: WebSocket):
        self._pending.add(ws)

    def authenticate_device(self, ws: WebSocket, device_id: str, user_id: str, zone_ids: list[str] | None = None):
        self._pending.discard(ws)
        conn = DeviceConnection(
            websocket=ws,
            device_id=device_id,
            user_id=user_id,
            zone_ids=zone_ids or [],
        )
        self._devices[device_id] = conn

        if user_id not in self._user_devices:
            self._user_devices[user_id] = set()
        self._user_devices[user_id].add(device_id)

        logger.info(f"Device {device_id} authenticated (user={user_id}, zones={zone_ids})")

    def authenticate_dashboard(self, ws: WebSocket):
        self._pending.discard(ws)
        self._dashboard_clients.add(ws)
        logger.info(f"Dashboard client connected (total={len(self._dashboard_clients)})")

    def subscribe_to_group(self, ws: WebSocket, group_id: str):
        if group_id not in self._group_subscribers:
            self._group_subscribers[group_id] = set()
        self._group_subscribers[group_id].add(ws)
        logger.info(f"Client subscribed to group {group_id}")

    def disconnect(self, ws: WebSocket):
        self._pending.discard(ws)
        self._dashboard_clients.discard(ws)

        # Remove from group subscribers
        for group_id in list(self._group_subscribers.keys()):
            self._group_subscribers[group_id].discard(ws)
            if not self._group_subscribers[group_id]:
                del self._group_subscribers[group_id]

        device_id = None
        for did, conn in self._devices.items():
            if conn.websocket is ws:
                device_id = did
                break
        if device_id:
            conn = self._devices[device_id]
            user_id = conn.user_id
            del self._devices[device_id]
            if user_id in self._user_devices:
                self._user_devices[user_id].discard(device_id)
                if not self._user_devices[user_id]:
                    del self._user_devices[user_id]
            logger.info(f"Device {device_id} disconnected")

    def get_device_connection(self, device_id: str) -> DeviceConnection | None:
        return self._devices.get(device_id)

    def get_user_device_ids(self, user_id: str) -> list[str]:
        return list(self._user_devices.get(user_id, []))

    def get_devices_in_zone(self, zone_id: str) -> list[DeviceConnection]:
        return [c for c in self._devices.values() if zone_id in c.zone_ids]

    async def send_to_device(self, device_id: str, message: dict):
        conn = self._devices.get(device_id)
        if conn:
            try:
                await conn.websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to device {device_id}: {e}")

    async def send_binary_to_device(self, device_id: str, data: bytes):
        conn = self._devices.get(device_id)
        if conn:
            try:
                await conn.websocket.send_bytes(data)
            except Exception as e:
                logger.error(f"Failed to send binary to device {device_id}: {e}")

    async def broadcast_to_zone(self, zone_id: str, message: dict):
        connections = self.get_devices_in_zone(zone_id)
        for conn in connections:
            try:
                await conn.websocket.send_json(message)
            except Exception:
                pass

    async def broadcast_to_group(self, group_id: str, message: dict):
        """Send message to all WebSocket clients subscribed to a group."""
        subscribers = self._group_subscribers.get(group_id, set())
        dead = []
        for ws in subscribers:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            subscribers.discard(ws)

    async def broadcast_to_user_groups(self, user_id: str, message: dict, group_ids: list[str] | None = None):
        """Broadcast a message to all groups a user belongs to."""
        if group_ids:
            for gid in group_ids:
                await self.broadcast_to_group(gid, message)

    async def broadcast_to_dashboards(self, message: dict):
        dead = []
        for ws in self._dashboard_clients:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._dashboard_clients.discard(ws)

    async def broadcast_all(self, message: dict):
        await self.broadcast_to_dashboards(message)
        for conn in self._devices.values():
            try:
                await conn.websocket.send_json(message)
            except Exception:
                pass

    def get_zone_device_count(self, zone_id: str) -> int:
        return len(self.get_devices_in_zone(zone_id))

    def get_status(self) -> dict:
        return {
            "active_devices": self.active_device_count,
            "dashboard_clients": len(self._dashboard_clients),
            "pending_connections": len(self._pending),
            "group_subscriptions": {gid: len(subs) for gid, subs in self._group_subscribers.items()},
            "devices": {
                did: {
                    "user_id": c.user_id,
                    "zones": c.zone_ids,
                    "connected_at": c.connected_at.isoformat(),
                }
                for did, c in self._devices.items()
            },
        }


connection_manager = ConnectionManager()
