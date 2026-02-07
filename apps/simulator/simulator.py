"""
Pulsera Multi-Device Data Simulator

Simulates 10-20 community members wearing smart devices, streaming health
data via WebSocket to the Pulsera server. Includes scripted anomaly scenarios.

Usage:
    python simulator.py [--server ws://localhost:8000/ws] [--members 15]
"""

import argparse
import asyncio
import json
import math
import random
import time
from datetime import datetime
from uuid import uuid4

import websockets


ZONE_IDS = ["zone-downtown", "zone-campus", "zone-riverside", "zone-hillcrest"]

MEMBER_NAMES = [
    "Maria", "James", "Chen", "Aisha", "Carlos", "Priya", "Kwame",
    "Sofia", "Hiroshi", "Luna", "Omar", "Elena", "Kai", "Fatima",
    "Diego", "Yuki", "Amara", "Leo", "Zara", "Mateo",
]


class SimulatedMember:
    """A simulated community member with a wearable device."""

    def __init__(self, name: str, zone_id: str):
        self.name = name
        self.device_id = f"sim-{name.lower()}-{uuid4().hex[:6]}"
        self.user_id = f"user-{name.lower()}-{uuid4().hex[:6]}"
        self.zone_id = zone_id

        self.base_hr = random.uniform(60, 80)
        self.base_hrv = random.uniform(40, 65)
        self.base_accel = random.uniform(0.95, 1.05)
        self.base_temp = random.uniform(36.2, 36.8)

        self.state = "resting"  # resting, active, sleeping, stressed, anomaly
        self.anomaly_type = None
        self.anomaly_start = 0
        self.anomaly_duration = 0
        self.tick = 0

    def generate_reading(self) -> dict:
        self.tick += 1
        t = self.tick

        if self.state == "resting":
            hr = self.base_hr + math.sin(t * 0.1) * 2 + random.gauss(0, 1.5)
            hrv = self.base_hrv + random.gauss(0, 3)
            accel = self.base_accel + random.gauss(0, 0.02)
            temp = self.base_temp + random.gauss(0, 0.05)

        elif self.state == "active":
            hr = self.base_hr + 20 + math.sin(t * 0.3) * 5 + random.gauss(0, 3)
            hrv = self.base_hrv - 10 + random.gauss(0, 4)
            accel = 1.5 + math.sin(t * 0.5) * 0.3 + random.gauss(0, 0.1)
            temp = self.base_temp + 0.3 + random.gauss(0, 0.1)

        elif self.state == "sleeping":
            hr = self.base_hr - 8 + math.sin(t * 0.05) * 2 + random.gauss(0, 1)
            hrv = self.base_hrv + 10 + random.gauss(0, 3)
            accel = 0.98 + random.gauss(0, 0.01)
            temp = self.base_temp - 0.3 + random.gauss(0, 0.05)

        elif self.state == "stressed":
            progress = min(1.0, (t - self.anomaly_start) / max(self.anomaly_duration, 1))
            hr = self.base_hr + progress * 35 + random.gauss(0, 3)
            hrv = self.base_hrv - progress * 20 + random.gauss(0, 2)
            accel = self.base_accel + progress * 0.5 + random.gauss(0, 0.05)
            temp = self.base_temp + progress * 0.5 + random.gauss(0, 0.1)

        elif self.state == "anomaly":
            if self.anomaly_type == "spike":
                hr = self.base_hr + 50 + random.gauss(0, 5)
                hrv = 15 + random.gauss(0, 3)
                accel = 2.0 + random.gauss(0, 0.5)
                temp = self.base_temp + 1.0 + random.gauss(0, 0.2)
            elif self.anomaly_type == "drop":
                hr = 40 + random.gauss(0, 3)
                hrv = self.base_hrv + 20 + random.gauss(0, 5)
                accel = 3.0 + random.gauss(0, 1.0)
                temp = self.base_temp - 0.5 + random.gauss(0, 0.1)
            elif self.anomaly_type == "flatline":
                hr = 45
                hrv = 2 + random.gauss(0, 0.5)
                accel = 1.0
                temp = self.base_temp - 0.2
            else:
                hr = self.base_hr + random.gauss(0, 15)
                hrv = random.uniform(5, 80)
                accel = random.uniform(0.5, 4.0)
                temp = self.base_temp + random.gauss(0, 0.8)
        else:
            hr = self.base_hr
            hrv = self.base_hrv
            accel = self.base_accel
            temp = self.base_temp

        # Check if anomaly duration has passed
        if self.state in ("stressed", "anomaly"):
            if self.tick - self.anomaly_start > self.anomaly_duration:
                self.state = "resting"
                self.anomaly_type = None

        return {
            "type": "health_data",
            "device_id": self.device_id,
            "heart_rate": round(max(30, min(200, hr)), 1),
            "hrv": round(max(0, min(150, hrv)), 1),
            "acceleration": round(max(0, min(10, accel)), 3),
            "skin_temp": round(max(34, min(40, temp)), 2),
            "timestamp": datetime.utcnow().isoformat(),
        }

    def trigger_anomaly(self, anomaly_type: str = "spike", duration: int = 20):
        self.state = "anomaly" if anomaly_type != "stress" else "stressed"
        self.anomaly_type = anomaly_type
        self.anomaly_start = self.tick
        self.anomaly_duration = duration


class Scenario:
    """Scripted scenario for demo."""

    def __init__(self, members: list[SimulatedMember]):
        self.members = members
        self.events: list[dict] = []
        self._build_demo_scenario()

    def _build_demo_scenario(self):
        self.events = [
            {"tick": 30, "action": "individual_distress", "member_idx": 0, "type": "spike", "duration": 25},
            {"tick": 60, "action": "set_state", "member_idx": 2, "state": "active"},
            {"tick": 90, "action": "community_anomaly", "zone": "zone-campus",
             "type": "stress", "duration": 30, "description": "Correlated stress — possible environmental event"},
            {"tick": 130, "action": "individual_distress", "member_idx": 5, "type": "drop", "duration": 20},
            {"tick": 160, "action": "community_anomaly", "zone": "zone-downtown",
             "type": "spike", "duration": 25, "description": "Multiple spikes — possible gas leak"},
            {"tick": 200, "action": "all_normal", "description": "All clear"},
        ]

    def check_tick(self, tick: int):
        for event in self.events:
            if event["tick"] == tick:
                self._execute(event, tick)

    def _execute(self, event: dict, tick: int):
        action = event["action"]
        desc = event.get("description", "")
        print(f"\n{'='*60}")
        print(f"[Tick {tick}] SCENARIO: {action} — {desc}")
        print(f"{'='*60}\n")

        if action == "individual_distress":
            idx = event["member_idx"]
            if idx < len(self.members):
                m = self.members[idx]
                m.trigger_anomaly(event.get("type", "spike"), event.get("duration", 20))
                print(f"  -> {m.name} ({m.device_id}) entering {event.get('type')} anomaly")

        elif action == "community_anomaly":
            zone = event["zone"]
            affected = [m for m in self.members if m.zone_id == zone]
            n_affect = max(3, len(affected) * 2 // 3)
            for m in random.sample(affected, min(n_affect, len(affected))):
                m.trigger_anomaly(event.get("type", "spike"), event.get("duration", 20))
                print(f"  -> {m.name} ({m.device_id}) affected in {zone}")

        elif action == "set_state":
            idx = event["member_idx"]
            if idx < len(self.members):
                self.members[idx].state = event["state"]

        elif action == "all_normal":
            for m in self.members:
                m.state = "resting"
                m.anomaly_type = None


async def run_simulator(server_url: str, n_members: int):
    members = []
    for i in range(n_members):
        name = MEMBER_NAMES[i % len(MEMBER_NAMES)]
        zone = ZONE_IDS[i % len(ZONE_IDS)]
        members.append(SimulatedMember(name, zone))

    scenario = Scenario(members)

    print(f"Pulsera Simulator — {n_members} members across {len(ZONE_IDS)} zones")
    print(f"Connecting to {server_url}...")

    connections: dict[str, websockets.WebSocketClientProtocol] = {}

    for member in members:
        try:
            ws = await websockets.connect(server_url)
            await ws.send(json.dumps({
                "type": "authenticate",
                "device_id": member.device_id,
                "user_id": member.user_id,
                "zone_ids": [member.zone_id],
            }))
            response = await ws.recv()
            connections[member.device_id] = ws
            print(f"  Connected: {member.name} ({member.device_id}) in {member.zone_id}")
        except Exception as e:
            print(f"  Failed to connect {member.name}: {e}")

    print(f"\nAll connected! Streaming data every 12 seconds...\n")

    tick = 0
    try:
        while True:
            tick += 1
            scenario.check_tick(tick)

            for member in members:
                ws = connections.get(member.device_id)
                if ws is None:
                    continue
                reading = member.generate_reading()
                try:
                    await ws.send(json.dumps(reading))
                except Exception:
                    pass

            zone_summary = {}
            for zone in ZONE_IDS:
                zone_members = [m for m in members if m.zone_id == zone]
                states = [m.state for m in zone_members]
                zone_summary[zone] = f"{len(zone_members)} members, states: {dict((s, states.count(s)) for s in set(states))}"

            print(f"[Tick {tick}] Sent {len(connections)} readings | Zones: {json.dumps(zone_summary, indent=2)}")

            await asyncio.sleep(12)  # 12-second intervals

    except KeyboardInterrupt:
        print("\nShutting down simulator...")
    finally:
        for ws in connections.values():
            await ws.close()


def main():
    parser = argparse.ArgumentParser(description="Pulsera Multi-Device Simulator")
    parser.add_argument("--server", default="ws://localhost:8000/ws", help="WebSocket server URL")
    parser.add_argument("--members", type=int, default=15, help="Number of simulated members")
    parser.add_argument("--fast", action="store_true", help="Run at 1-second intervals (fast demo)")
    args = parser.parse_args()

    asyncio.run(run_simulator(args.server, args.members))


if __name__ == "__main__":
    main()
