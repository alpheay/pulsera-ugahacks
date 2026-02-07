import SwiftUI

struct ContentView: View {
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var webSocketManager: WebSocketManager
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var hapticManager: HapticManager

    @State private var selectedTab: Tab = .pulse

    enum Tab: Hashable {
        case pulse
        case pairing
    }

    var body: some View {
        ZStack {
            TabView(selection: $selectedTab) {
                mainDashboard
                    .tag(Tab.pulse)

                PairingView()
                    .tag(Tab.pairing)
            }
            .tabViewStyle(.verticalPage)

            // Episode overlay
            if episodeManager.currentPhase != .idle {
                episodeOverlay
                    .transition(.opacity)
                    .zIndex(100)
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

                StatusView(
                    connectionState: webSocketManager.connectionState,
                    anomalyScore: webSocketManager.latestAnomalyScore,
                    lastUpdated: healthKitManager.latestData?.timestamp
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
            Color.black.ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 36))
                    .foregroundColor(.orange)

                Text("Anomaly Detected")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("Starting calming exercise...")
                    .font(.system(size: 12))
                    .foregroundColor(.gray)

                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.orange)
            }
        }
    }

    private var reEvaluatingView: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "waveform.path.ecg")
                    .font(.system(size: 36))
                    .foregroundColor(.cyan)

                Text("Re-evaluating...")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("Checking your vitals")
                    .font(.system(size: 12))
                    .foregroundColor(.gray)

                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.cyan)
            }
        }
    }

    private var resolvedView: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 40))
                    .foregroundColor(.green)

                Text(episodeManager.resolutionMessage ?? "All Clear")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Helpers

    private var currentStatus: HealthStatus {
        healthKitManager.latestData?.status ?? .normal
    }
}

#Preview {
    ContentView()
        .environmentObject(HealthKitManager())
        .environmentObject(WebSocketManager())
        .environmentObject(EpisodeManager())
        .environmentObject(HapticManager())
}
