import SwiftUI

struct ContentView: View {
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var webSocketManager: WebSocketManager
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var eventBridge: EventBridgeClient

    @State private var selectedTab: Tab = .pulse
    @State private var pulseSent: Bool = false

    enum Tab: Hashable {
        case pulse
        case pairing
        case demo
    }

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                mainDashboard
                    .tag(Tab.pulse)

                PairingView()
                    .tag(Tab.pairing)

                DemoControlView()
                    .tag(Tab.demo)
            }
            .tabViewStyle(.verticalPage)

            // Episode overlay
            if episodeManager.currentPhase != .idle {
                episodeOverlay
                    .transition(.opacity)
                    .animation(.easeInOut(duration: 0.8), value: episodeManager.currentPhase)
                    .zIndex(100)
            }
        }
        .onChange(of: webSocketManager.connectionState) { _, newState in
            if newState.isConnected {
                selectedTab = .pulse
            }
        }
    }

    // MARK: - Main Dashboard

    private var mainDashboard: some View {
        ScrollView {
            VStack(spacing: 12) {
                PulseRingView(status: currentStatus)
                    .frame(height: 100)

                HeartRateView(
                    heartRate: healthKitManager.latestData?.heartRate ?? 0,
                    status: currentStatus
                )

                // Start demo button — always visible when idle
                if episodeManager.currentPhase == .idle {
                    Button {
                        healthKitManager.startGradualRise { [self] in
                            let hr = healthKitManager.latestData?.heartRate ?? 95
                            let data = HealthData(
                                heartRate: hr, hrv: 20, acceleration: 0.1,
                                skinTemp: 37.2, status: .elevated
                            )
                            episodeManager.startEpisode(trigger: .sustainedElevatedHR, data: data)
                            webSocketManager.sendEpisodeStart(triggerData: [
                                "heartRate": hr,
                                "hrv": 20.0,
                                "anomalyType": "sustained_elevated_hr"
                            ])
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 14))
                            Text("Start")
                                .font(.system(size: 14, weight: .semibold, design: .rounded))
                        }
                        .foregroundColor(PulseraTheme.foreground)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            LinearGradient(
                                colors: [PulseraTheme.accent, PulseraTheme.accent.opacity(0.7)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 8)
                }

                StatusView(
                    connectionState: webSocketManager.connectionState,
                    anomalyScore: webSocketManager.latestAnomalyScore
                )
            }
            .padding(.horizontal, 4)
            .padding(.top, 8)
        }
    }

    // MARK: - Episode Overlay

    @ViewBuilder
    private var episodeOverlay: some View {
        switch episodeManager.currentPhase {
        case .anomalyDetected:
            anomalyDetectedView
        case .calming:
            BreathingView()
        case .calmingMusic:
            CalmingMusicView()
        case .reEvaluating:
            reEvaluatingView
        case .requestingPhoneCheck, .waitingForPhone:
            PhoneCheckView()
        case .resolved:
            resolvedView
        case .idle:
            EmptyView()
        }
    }

    private var anomalyDetectedView: some View {
        ZStack {
            PulseraTheme.background.ignoresSafeArea()
            VStack(spacing: 12) {
                Spacer()

                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(PulseraTheme.accent)

                Text("Anomaly Detected")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(PulseraTheme.foreground)

                Text("Starting calming exercise...")
                    .font(.system(size: 12))
                    .foregroundColor(PulseraTheme.mutedForeground)

                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(PulseraTheme.accent)

                Spacer()

                if let hr = healthKitManager.latestData?.heartRate {
                    HeartRatePill(heartRate: hr)
                        .padding(.bottom, 28)
                }
            }
        }
    }

    private var reEvaluatingView: some View {
        ZStack {
            PulseraTheme.background.ignoresSafeArea()
            VStack(spacing: 12) {
                Spacer()

                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: 36))
                    .foregroundColor(PulseraTheme.accent)

                Text("Re-evaluating...")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(PulseraTheme.foreground)

                Text("Checking your vitals")
                    .font(.system(size: 12))
                    .foregroundColor(PulseraTheme.mutedForeground)

                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(PulseraTheme.accent)

                Spacer()

                if let hr = healthKitManager.latestData?.heartRate {
                    HeartRatePill(heartRate: hr)
                        .padding(.bottom, 28)
                }
            }
        }
    }

    private var resolvedView: some View {
        ZStack {
            PulseraTheme.background.ignoresSafeArea()
            VStack(spacing: 8) {
                Spacer()

                // Animated green pulse ring
                SafePulseRingView()
                    .frame(height: 80)

                Text("You're Safe")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(PulseraTheme.foreground)

                if let hr = healthKitManager.latestData?.heartRate {
                    Text("\(Int(hr)) BPM")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundColor(PulseraTheme.safe.opacity(0.8))
                }

                // Send Pulse button
                Button {
                    let presage: [String: Any] = [
                        "visual_heart_rate": 78,
                        "breathing_rate": 16,
                        "facial_expression": "calm",
                        "eye_responsiveness": "normal",
                        "confidence_score": 0.92
                    ]
                    webSocketManager.sendPulseCheckin(message: "I'm okay!", presageData: presage)
                    eventBridge.sendEvent(type: "pulse-checkin", data: [
                        "message": "I'm okay!",
                        "photo_url": "https://i.pravatar.cc/200?img=3",
                        "presage_data": presage
                    ])
                    pulseSent = true
                    // Return to start screen after brief confirmation
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        pulseSent = false
                        episodeManager.returnToIdle()
                        healthKitManager.setDemoDecline()
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: pulseSent ? "checkmark.circle.fill" : "heart.circle.fill")
                            .font(.system(size: 14))
                        Text(pulseSent ? "Sent!" : "Send Pulse")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                    }
                    .foregroundColor(PulseraTheme.foreground)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        pulseSent
                            ? PulseraTheme.safe.opacity(0.6)
                            : PulseraTheme.accent.opacity(0.9)
                    )
                    .cornerRadius(12)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 16)
                .disabled(pulseSent)

                Spacer()

                if let hr = healthKitManager.latestData?.heartRate {
                    HeartRatePill(heartRate: hr)
                        .padding(.bottom, 28)
                }
            }
        }
        .onAppear {
            pulseSent = false
        }
    }

    // MARK: - Helpers

    private var currentStatus: HealthStatus {
        healthKitManager.latestData?.status ?? .normal
    }
}

// MARK: - Safe Pulse Ring (green animated ring for resolved screen)

private struct SafePulseRingView: View {
    @State private var outerScale: CGFloat = 1.0
    @State private var middleScale: CGFloat = 1.0
    @State private var innerScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            Circle()
                .stroke(PulseraTheme.safe.opacity(0.2), lineWidth: 3)
                .scaleEffect(outerScale)
                .frame(width: 70, height: 70)

            Circle()
                .stroke(PulseraTheme.safe.opacity(0.4), lineWidth: 4)
                .scaleEffect(middleScale)
                .frame(width: 50, height: 50)

            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [
                            PulseraTheme.safe.opacity(0.7),
                            PulseraTheme.safe.opacity(0.2)
                        ]),
                        center: .center,
                        startRadius: 2,
                        endRadius: 18
                    )
                )
                .scaleEffect(innerScale)
                .frame(width: 30, height: 30)

            Image(systemName: "checkmark")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
                outerScale = 1.15
            }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true).delay(0.2)) {
                middleScale = 1.1
            }
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true).delay(0.4)) {
                innerScale = 1.08
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(HealthKitManager())
        .environmentObject(WebSocketManager())
        .environmentObject(EpisodeManager())
        .environmentObject(HapticManager())
}
