# Pulsera

**Your family circle, now with a pulse.**

Pulsera is a real-time community safety platform that uses Apple Watch vitals, iPhone computer vision, and AI-guided intervention to detect distress and keep families connected. When an anomaly is detected — like a sustained elevated heart rate — the system intervenes with a calming breathing exercise guided by an AI voice agent before alerting caregivers on their phones.

---

## Team

| Name | Role |
|------|------|
| **Nik Nandi** | Lead Software Engineer |
| **Aritra Saha** | Data Scientist & ML Researcher |
| **Akshat Vasisht** | Operations & Strategy |
| **Caio Jahn** | Product Strategy |

---

## How It Works

1. **Watch detects anomaly** — Apple Watch streams heart rate and HRV via HealthKit. When vitals cross thresholds, an episode begins.
2. **AI calming intervention** — An ElevenLabs conversational AI agent guides the wearer through breathing exercises with real-time voice and haptic feedback.
3. **Contactless check-in** — The wearer performs a Quick Check-In on their phone using the front camera (SmartSpectra SDK) to capture pulse, breathing rate, and facial expression without any contact.
4. **Family gets notified** — Caregivers receive real-time popups on the mobile app showing heart rate data, episode status, and Presage AI analysis results.
5. **Community-wide detection** — PulseNet, a custom PyTorch anomaly detection model, aggregates signals across community members to detect zone-wide events (e.g., building emergencies).

---

## Architecture

```
Apple Watch (HealthKit + ElevenLabs AI Agent)
       │
       ├─ episode-start ──► WebSocket Relay (port 8765) ──► Mobile App (ring-episode-alert popup)
       └─ pulse-checkin ──► WebSocket Relay ──────────────► Mobile App (ring-pulse-checkin popup)

Health Stream ──► FastAPI Server ──► PulseNet (PyTorch inference)
                                 ──► Community Engine (zone aggregation)
                                 ──► Escalation Service (alert routing)
                                 ──► Web Dashboard (3D terrain + heatmaps)
```

---

## Apps

| App | Tech | Description |
|-----|------|-------------|
| **Watch** | SwiftUI, HealthKit, Combine | Wearable companion — streams vitals, runs episode flow (anomaly detection, breathing exercise, calming music, resolution), sends events via WebSocket |
| **Mobile** | Expo (React Native), TypeScript, Zustand | Family dashboard — receives real-time episode alerts, contactless camera check-in via SmartSpectra SDK, family member map with geofencing |
| **Web** | Next.js 16, React 19, Three.js, MapLibre GL | Community analytics portal — 3D terrain visualization of safety zones, geographic anomaly heatmaps, live status feeds |
| **Server** | FastAPI, SQLModel, PyTorch | Backend — PulseNet ML inference, episode lifecycle management, WebSocket telemetry ingestion, Gemini LLM analysis |
| **Relay** | Python, websockets | Lightweight bridge — translates watch events to mobile notification format, broadcasts to subscribed family groups |
| **Simulator** | Python, asyncio | Generates synthetic health data for 10-20 community members with scripted anomaly injection for testing |

---

## Tools & Technologies

**Frontend & Mobile**
- SwiftUI + HealthKit (watchOS)
- Expo SDK 54 + React Native 0.81 + Expo Router (mobile)
- Next.js 16 + React 19 + Tailwind CSS v4 (web)
- Three.js + React Three Fiber (3D visualization)
- React Map GL + MapLibre GL (geographic mapping)
- NativeWind + Zustand + React Native Reanimated (mobile state & animation)
- shadcn/ui + Radix UI + Lucide Icons (web components)

**Backend & ML**
- FastAPI + Uvicorn (async Python server)
- SQLModel + SQLAlchemy + SQLite (database ORM)
- PyTorch 2.5+ (PulseNet anomaly detection model)
- NumPy (data processing)

**External APIs & Services**
- [ElevenLabs Conversational AI](https://elevenlabs.io/) — Real-time voice agent for stress intervention via WebSocket, guides breathing exercises with synthesized speech on Apple Watch
- [SmartSpectra SDK](https://www.smartspectra.com/) — Contactless vital signs measurement through iPhone front camera (pulse rate, breathing rate, blink rate, facial expression detection)
- [Google Generative AI (Gemini)](https://ai.google.dev/) — LLM-powered health analysis and recommendations
- [Anthropic Claude](https://www.anthropic.com/) — Alternative LLM backend for analysis

**Infrastructure**
- WebSockets (real-time communication across all layers)
- Expo Camera (camera permissions and preview for check-in)
- Apple HealthKit (heart rate and HRV streaming)

---

## Challenges & Solutions

**Watch Simulator + Real Phone Communication**
The watchOS simulator runs on Mac and the mobile app runs on a physical phone via Expo Go, so Apple's WatchConnectivity framework doesn't work across them. We built a lightweight WebSocket relay server (~100 lines of Python) that bridges the two — the watch sends episode events to the relay, which translates and broadcasts them to subscribed mobile clients.

**Contactless Vital Sign Detection**
Integrating the SmartSpectra SDK required building a custom Expo native module bridge (`smartspectra-bridge`) with Swift on iOS. The SDK handles camera access internally, so we had to coordinate between the SDK's camera usage and our own CameraView preview overlay with face guide animations.

**Real-Time AI Voice Guidance on Watch**
Streaming ElevenLabs conversational AI audio to watchOS over WebSocket required handling raw PCM audio data, synchronizing breathing cue timing with the voice agent's responses, and managing connection lifecycle on a constrained device. We coordinated haptic feedback patterns with the AI agent's breathing instructions for a cohesive calming experience.

**ML Anomaly Detection at Scale**
PulseNet needed to detect individual anomalies while also aggregating signals across community members for zone-wide events. We designed a two-tier system — per-device inference with a community engine that applies spatial and temporal windowing to detect correlated anomalies affecting multiple members.

**Unified Dark Theme Across Platforms**
Maintaining a consistent visual identity (red #942626 accent on black) across SwiftUI (watch), React Native (mobile), and Next.js (web) required separate but coordinated theme systems — `PulseraTheme` in Swift, a shared `colors` object in TypeScript, and CSS custom properties on the web.

---

## Running the Project

**Prerequisites:** Xcode 15+, Node.js 18+, Python 3.11+, pip

```bash
# 1. Start the relay server
pip install websockets
python3 apps/relay/relay.py

# 2. Start the mobile app (replace <MAC_IP> with your LAN IP)
cd apps/mobile && npm install
EXPO_PUBLIC_WS_URL=ws://<MAC_IP>:8765/ws npx expo start

# 3. Open the watch app in Xcode simulator
# Open apps/watch/PulseraWatch.xcodeproj, build and run
# In PairingView, enter localhost:8765 and tap Connect

# 4. (Optional) Start the full backend server
cd apps/server && pip install -r requirements.txt
uvicorn src.server.main:app --reload --port 8000

# 5. (Optional) Start the web dashboard
cd apps/web && npm install && npm run dev
```

---

## License

Built at UGAHacks 2026.
