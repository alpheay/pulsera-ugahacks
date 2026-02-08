"""
Pulsera Multi-Device Data Simulator

Simulates 10-20 community members wearing smart devices, streaming health
data via WebSocket to the Pulsera server. Includes scripted anomaly scenarios
with family groups, community groups, and individual distress events.

Registers users via HTTP API, creates family + community groups, then streams
health-update data over WebSocket in camelCase format.

Usage:
    python simulator.py [--server ws://localhost:8000/ws] [--api http://localhost:8000] [--members 15]
"""

import argparse
import asyncio
import json
import math
import random
import time
from datetime import datetime
from uuid import uuid4

import httpx
import websockets


ZONE_IDS = ["zone-downtown", "zone-campus", "zone-riverside", "zone-hillcrest"]

MEMBER_NAMES = [
    "Maria", "James", "Chen", "Aisha", "Carlos", "Priya", "Kwame",
    "Sofia", "Hiroshi", "Luna", "Omar", "Elena", "Kai", "Fatima",
    "Diego", "Yuki", "Amara", "Leo", "Zara", "Mateo",
]

FAMILY_GROUPS = [
    {"name": "Garcia Family", "members": ["Maria", "Carlos", "Diego"]},
    {"name": "Tanaka Family", "members": ["Hiroshi", "Yuki", "Kai"]},
    {"name": "Ahmed Family", "members": ["Aisha", "Omar", "Fatima"]},
]

COMMUNITY_GROUPS = [
    {"name": "UGA Campus Watch", "zone": "zone-campus"},
    {"name": "Downtown Safety Network", "zone": "zone-downtown"},
    {"name": "Riverside Neighbors", "zone": "zone-riverside"},
]


class SimulatedMember:
    """A simulated community member with a wearable device."""

    def __init__(self, name: str, zone_id: str):
        self.name = name
        self.device_id = f"sim-{name.lower()}-{uuid4().hex[:6]}"
        self.user_id = f"user-{name.lower()}-{uuid4().hex[:6]}"
        self.zone_id = zone_id

        # Auth token received from registration
        self.auth_token: str | None = None

        # Group memberships: list of group IDs
        self.group_ids: list[str] = []

        self.base_hr = random.uniform(60, 80)
        self.base_hrv = random.uniform(40, 65)
        self.base_accel = random.uniform(0.95, 1.05)
        self.base_temp = random.uniform(36.2, 36.8)

        self.state = "resting"  # resting, active, sleeping, stressed, anomaly
        self.anomaly_type = None
        self.anomaly_start = 0
        self.anomaly_duration = 0
        self.tick = 0

    def _compute_status(self, hr: float, hrv: float, accel: float) -> str:
        """Derive a safety status from vitals."""
        if hr > 130 or hrv < 15 or accel > 2.5:
            return "critical"
        if hr > 110 or hrv < 25 or accel > 1.8:
            return "warning"
        if hr > 95 or hrv < 35 or accel > 1.4:
            return "elevated"
        return "safe"

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

        # Clamp values
        hr = round(max(30, min(200, hr)), 1)
        hrv = round(max(0, min(150, hrv)), 1)
        accel = round(max(0, min(10, accel)), 3)
        temp = round(max(34, min(40, temp)), 2)

        status = self._compute_status(hr, hrv, accel)

        # New camelCase health-update format
        return {
            "type": "health-update",
            "deviceId": self.device_id,
            "userId": self.user_id,
            "heartRate": hr,
            "hrv": hrv,
            "acceleration": accel,
            "skinTemp": temp,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def trigger_anomaly(self, anomaly_type: str = "spike", duration: int = 20):
        self.state = "anomaly" if anomaly_type != "stress" else "stressed"
        self.anomaly_type = anomaly_type
        self.anomaly_start = self.tick
        self.anomaly_duration = duration


class Scenario:
    """Scripted scenario for demo."""

    def __init__(self, members: list[SimulatedMember], groups: dict):
        self.members = members
        self.groups = groups  # {"family": [...], "community": [...]}
        self.events: list[dict] = []
        self._build_demo_scenario()

    def _find_family_members(self, family_name: str) -> list[SimulatedMember]:
        """Find all members belonging to a given family group."""
        for fg in self.groups.get("family", []):
            if fg["name"] == family_name:
                member_names = fg.get("member_names", [])
                return [m for m in self.members if m.name in member_names]
        return []

    def _find_community_members(self, zone: str) -> list[SimulatedMember]:
        """Find all members in a given zone."""
        return [m for m in self.members if m.zone_id == zone]

    def _build_demo_scenario(self):
        self.events = [
            # Individual distress
            {
                "tick": 30, "action": "individual_distress",
                "member_idx": 0, "type": "spike", "duration": 25,
                "description": "Individual heart rate spike detected",
            },
            # Activity change
            {
                "tick": 60, "action": "set_state",
                "member_idx": 2, "state": "active",
                "description": "Member begins exercise",
            },
            # Family member distress event (new)
            {
                "tick": 75, "action": "family_distress",
                "family_name": "Garcia Family", "type": "stress", "duration": 30,
                "description": "Garcia Family -- multiple members showing stress signals",
            },
            # Community anomaly on campus
            {
                "tick": 90, "action": "community_anomaly",
                "zone": "zone-campus", "type": "stress", "duration": 30,
                "description": "Correlated stress on campus -- possible environmental event",
            },
            # Individual distress -- HR drop
            {
                "tick": 130, "action": "individual_distress",
                "member_idx": 5, "type": "drop", "duration": 20,
                "description": "Individual HR drop -- possible fainting",
            },
            # Community-wide event across multiple zones (new)
            {
                "tick": 150, "action": "community_wide_event",
                "zones": ["zone-downtown", "zone-riverside"],
                "type": "spike", "duration": 35,
                "description": "Community-wide alert -- multiple zones showing simultaneous spikes",
            },
            # Community anomaly downtown
            {
                "tick": 160, "action": "community_anomaly",
                "zone": "zone-downtown", "type": "spike", "duration": 25,
                "description": "Multiple spikes downtown -- possible gas leak",
            },
            # Family distress for Tanaka family (new)
            {
                "tick": 180, "action": "family_distress",
                "family_name": "Tanaka Family", "type": "spike", "duration": 20,
                "description": "Tanaka Family -- coordinated spike pattern detected",
            },
            # All clear
            {
                "tick": 220, "action": "all_normal",
                "description": "All clear -- situation resolved",
            },
        ]

    def check_tick(self, tick: int):
        for event in self.events:
            if event["tick"] == tick:
                self._execute(event, tick)

    def _execute(self, event: dict, tick: int):
        action = event["action"]
        desc = event.get("description", "")
        print(f"\n{'='*60}")
        print(f"[Tick {tick}] SCENARIO: {action} -- {desc}")
        print(f"{'='*60}\n")

        if action == "individual_distress":
            idx = event["member_idx"]
            if idx < len(self.members):
                m = self.members[idx]
                m.trigger_anomaly(event.get("type", "spike"), event.get("duration", 20))
                print(f"  -> {m.name} ({m.device_id}) entering {event.get('type')} anomaly")

        elif action == "family_distress":
            family_name = event["family_name"]
            family_members = self._find_family_members(family_name)
            if not family_members:
                print(f"  -> No family members found for '{family_name}'")
                return
            for m in family_members:
                m.trigger_anomaly(event.get("type", "stress"), event.get("duration", 20))
                print(f"  -> {m.name} ({m.device_id}) affected in family '{family_name}'")

        elif action == "community_anomaly":
            zone = event["zone"]
            affected = self._find_community_members(zone)
            n_affect = max(3, len(affected) * 2 // 3)
            for m in random.sample(affected, min(n_affect, len(affected))):
                m.trigger_anomaly(event.get("type", "spike"), event.get("duration", 20))
                print(f"  -> {m.name} ({m.device_id}) affected in {zone}")

        elif action == "community_wide_event":
            zones = event.get("zones", ZONE_IDS)
            anom_type = event.get("type", "spike")
            duration = event.get("duration", 30)
            for zone in zones:
                affected = self._find_community_members(zone)
                n_affect = max(2, len(affected) * 3 // 4)
                for m in random.sample(affected, min(n_affect, len(affected))):
                    m.trigger_anomaly(anom_type, duration)
                    print(f"  -> {m.name} ({m.device_id}) affected in {zone} (community-wide)")

        elif action == "set_state":
            idx = event["member_idx"]
            if idx < len(self.members):
                self.members[idx].state = event["state"]

        elif action == "all_normal":
            for m in self.members:
                m.state = "resting"
                m.anomaly_type = None


async def register_users(api_base: str, members: list[SimulatedMember]) -> None:
    """Register all simulated members via the HTTP API."""
    print(f"\nRegistering {len(members)} users via {api_base}/api/auth/register ...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        for member in members:
            try:
                resp = await client.post(
                    f"{api_base}/api/auth/register",
                    json={
                        "username": member.name.lower(),
                        "display_name": member.name,
                        "device_id": member.device_id,
                        "email": f"{member.name.lower()}@pulsera-sim.local",
                        "password": "sim-password-123",
                    },
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    member.auth_token = data.get("token") or data.get("access_token")
                    if data.get("user_id"):
                        member.user_id = data["user_id"]
                    print(f"  Registered: {member.name} (token: {'yes' if member.auth_token else 'no'})")
                elif resp.status_code == 409:
                    # Already registered -- try login
                    print(f"  Already registered: {member.name} (using device_id auth)")
                else:
                    print(f"  Registration returned {resp.status_code} for {member.name}: {resp.text[:100]}")
            except httpx.ConnectError:
                print(f"  API not reachable for {member.name} -- continuing with WS-only auth")
            except Exception as e:
                print(f"  Registration error for {member.name}: {e}")


async def create_groups(
    api_base: str,
    members: list[SimulatedMember],
) -> dict:
    """Create family and community groups via the HTTP API. Returns group info."""
    groups = {"family": [], "community": []}

    # Build name -> member lookup
    name_lookup: dict[str, SimulatedMember] = {}
    for m in members:
        name_lookup.setdefault(m.name, m)

    print(f"\nCreating groups via {api_base}/api/groups ...")
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Family groups
        for fg in FAMILY_GROUPS:
            family_members = [name_lookup[n] for n in fg["members"] if n in name_lookup]
            if not family_members:
                continue
            creator = family_members[0]
            headers = {}
            if creator.auth_token:
                headers["Authorization"] = f"Bearer {creator.auth_token}"
            try:
                resp = await client.post(
                    f"{api_base}/api/groups",
                    json={
                        "name": fg["name"],
                        "type": "family",
                        "description": f"Family group: {fg['name']}",
                        "member_ids": [m.user_id for m in family_members],
                    },
                    headers=headers,
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    group_id = data.get("id") or data.get("group_id") or fg["name"]
                    for m in family_members:
                        m.group_ids.append(group_id)
                    groups["family"].append({
                        "id": group_id,
                        "name": fg["name"],
                        "member_names": [m.name for m in family_members],
                    })
                    print(f"  Created family group: {fg['name']} ({len(family_members)} members)")
                else:
                    print(f"  Group creation returned {resp.status_code} for {fg['name']}: {resp.text[:100]}")
                    # Still track locally for scenarios
                    groups["family"].append({
                        "id": fg["name"],
                        "name": fg["name"],
                        "member_names": [m.name for m in family_members],
                    })
            except httpx.ConnectError:
                print(f"  API not reachable -- tracking {fg['name']} locally")
                groups["family"].append({
                    "id": fg["name"],
                    "name": fg["name"],
                    "member_names": [m.name for m in family_members],
                })
            except Exception as e:
                print(f"  Error creating family group {fg['name']}: {e}")
                groups["family"].append({
                    "id": fg["name"],
                    "name": fg["name"],
                    "member_names": [m.name for m in family_members],
                })

        # Community groups
        for cg in COMMUNITY_GROUPS:
            zone_members = [m for m in members if m.zone_id == cg["zone"]]
            if not zone_members:
                continue
            creator = zone_members[0]
            headers = {}
            if creator.auth_token:
                headers["Authorization"] = f"Bearer {creator.auth_token}"
            try:
                resp = await client.post(
                    f"{api_base}/api/groups",
                    json={
                        "name": cg["name"],
                        "type": "community",
                        "description": f"Community safety group for {cg['zone']}",
                        "member_ids": [m.user_id for m in zone_members],
                    },
                    headers=headers,
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    group_id = data.get("id") or data.get("group_id") or cg["name"]
                    for m in zone_members:
                        m.group_ids.append(group_id)
                    groups["community"].append({
                        "id": group_id,
                        "name": cg["name"],
                        "zone": cg["zone"],
                        "member_names": [m.name for m in zone_members],
                    })
                    print(f"  Created community group: {cg['name']} ({len(zone_members)} members in {cg['zone']})")
                else:
                    print(f"  Group creation returned {resp.status_code} for {cg['name']}: {resp.text[:100]}")
                    groups["community"].append({
                        "id": cg["name"],
                        "name": cg["name"],
                        "zone": cg["zone"],
                        "member_names": [m.name for m in zone_members],
                    })
            except httpx.ConnectError:
                print(f"  API not reachable -- tracking {cg['name']} locally")
                groups["community"].append({
                    "id": cg["name"],
                    "name": cg["name"],
                    "zone": cg["zone"],
                    "member_names": [m.name for m in zone_members],
                })
            except Exception as e:
                print(f"  Error creating community group {cg['name']}: {e}")
                groups["community"].append({
                    "id": cg["name"],
                    "name": cg["name"],
                    "zone": cg["zone"],
                    "member_names": [m.name for m in zone_members],
                })

    return groups


async def run_simulator(server_url: str, api_base: str, n_members: int, fast: bool):
    members = []
    for i in range(n_members):
        name = MEMBER_NAMES[i % len(MEMBER_NAMES)]
        zone = ZONE_IDS[i % len(ZONE_IDS)]
        members.append(SimulatedMember(name, zone))

    # Register users via HTTP
    await register_users(api_base, members)

    # Create groups via HTTP
    groups = await create_groups(api_base, members)

    # Build scenario with group info
    scenario = Scenario(members, groups)

    interval = 1 if fast else 12

    print(f"\nPulsera Simulator -- {n_members} members across {len(ZONE_IDS)} zones")
    print(f"  Family groups: {len(groups['family'])}")
    for fg in groups["family"]:
        print(f"    - {fg['name']}: {', '.join(fg['member_names'])}")
    print(f"  Community groups: {len(groups['community'])}")
    for cg in groups["community"]:
        print(f"    - {cg['name']} ({cg.get('zone', '?')}): {', '.join(cg['member_names'])}")
    print(f"\nConnecting to {server_url} ...")

    connections: dict[str, websockets.WebSocketClientProtocol] = {}

    for member in members:
        try:
            ws = await websockets.connect(server_url)
            auth_payload = {
                "type": "authenticate",
                "device_id": member.device_id,
                "user_id": member.user_id,
                "zone_ids": [member.zone_id],
                "group_ids": member.group_ids,
            }
            if member.auth_token:
                auth_payload["token"] = member.auth_token
            await ws.send(json.dumps(auth_payload))
            response = await ws.recv()
            connections[member.device_id] = ws
            group_str = f", groups: {member.group_ids}" if member.group_ids else ""
            print(f"  Connected: {member.name} ({member.device_id}) in {member.zone_id}{group_str}")
        except Exception as e:
            print(f"  Failed to connect {member.name}: {e}")

    print(f"\nAll connected! Streaming data every {interval} second(s) ...\n")

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

            # Zone summary
            zone_summary = {}
            for zone in ZONE_IDS:
                zone_members = [m for m in members if m.zone_id == zone]
                states = [m.state for m in zone_members]
                zone_summary[zone] = f"{len(zone_members)} members, states: {dict((s, states.count(s)) for s in set(states))}"

            # Group summary
            group_summary = {}
            for fg in groups.get("family", []):
                fam_members = [m for m in members if m.name in fg["member_names"]]
                states = [m.state for m in fam_members]
                group_summary[fg["name"]] = f"{len(fam_members)} members, states: {dict((s, states.count(s)) for s in set(states))}"
            for cg in groups.get("community", []):
                com_members = [m for m in members if m.name in cg.get("member_names", [])]
                states = [m.state for m in com_members]
                group_summary[cg["name"]] = f"{len(com_members)} members, states: {dict((s, states.count(s)) for s in set(states))}"

            print(f"[Tick {tick}] Sent {len(connections)} readings")
            print(f"  Zones:  {json.dumps(zone_summary, indent=4)}")
            print(f"  Groups: {json.dumps(group_summary, indent=4)}")

            await asyncio.sleep(interval)

    except KeyboardInterrupt:
        print("\nShutting down simulator...")
    finally:
        for ws in connections.values():
            await ws.close()


def main():
    parser = argparse.ArgumentParser(description="Pulsera Multi-Device Simulator")
    parser.add_argument("--server", default="ws://localhost:8000/ws", help="WebSocket server URL")
    parser.add_argument("--api", default="http://localhost:8000", help="HTTP API base URL")
    parser.add_argument("--members", type=int, default=15, help="Number of simulated members")
    parser.add_argument("--fast", action="store_true", help="Run at 1-second intervals (fast demo)")
    args = parser.parse_args()

    asyncio.run(run_simulator(args.server, args.api, args.members, args.fast))


if __name__ == "__main__":
    main()
