import SwiftUI

struct ContentView: View {
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var webSocketManager: WebSocketManager

    @State private var selectedTab: Tab = .pulse

    enum Tab: Hashable {
        case pulse
        case pairing
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            mainDashboard
                .tag(Tab.pulse)

            PairingView()
                .tag(Tab.pairing)
        }
        .tabViewStyle(.verticalPage)
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

    // MARK: - Helpers

    private var currentStatus: HealthStatus {
        healthKitManager.latestData?.status ?? .normal
    }
}

#Preview {
    ContentView()
        .environmentObject(HealthKitManager())
        .environmentObject(WebSocketManager())
        .environmentObject(HapticManager())
}
