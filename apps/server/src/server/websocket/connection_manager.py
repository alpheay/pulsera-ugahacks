"""Multi-device WebSocket connection manager for Pulsera community network."""

import asyncio
import json
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
        self._dashboard_clients: set[WebSocket] = set()
        self._pending: set[WebSocket] = set()

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
        logger.info(f"Device {device_id} authenticated (user={user_id}, zones={zone_ids})")

    def authenticate_dashboard(self, ws: WebSocket):
        self._pending.discard(ws)
        self._dashboard_clients.add(ws)
        logger.info(f"Dashboard client connected (total={len(self._dashboard_clients)})")

    def disconnect(self, ws: WebSocket):
        self._pending.discard(ws)
        self._dashboard_clients.discard(ws)
        device_id = None
        for did, conn in self._devices.items():
            if conn.websocket is ws:
                device_id = did
                break
        if device_id:
            del self._devices[device_id]
            logger.info(f"Device {device_id} disconnected")

    def get_device_connection(self, device_id: str) -> DeviceConnection | None:
        return self._devices.get(device_id)

    def get_devices_in_zone(self, zone_id: str) -> list[DeviceConnection]:
        return [c for c in self._devices.values() if zone_id in c.zone_ids]

    async def send_to_device(self, device_id: str, message: dict):
        conn = self._devices.get(device_id)
        if conn:
            try:
                await conn.websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send to device {device_id}: {e}")

    async def broadcast_to_zone(self, zone_id: str, message: dict):
        connections = self.get_devices_in_zone(zone_id)
        for conn in connections:
            try:
                await conn.websocket.send_json(message)
            except Exception:
                pass

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
