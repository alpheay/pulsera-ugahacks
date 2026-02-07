import SwiftUI

@main
struct PulseraWatchApp: App {
    @StateObject private var healthKitManager = HealthKitManager()
    @StateObject private var webSocketManager = WebSocketManager()
    @StateObject private var hapticManager = HapticManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(healthKitManager)
                .environmentObject(webSocketManager)
                .environmentObject(hapticManager)
                .onAppear {
                    healthKitManager.requestAuthorization()
                    webSocketManager.connectIfConfigured()
                }
                .onChange(of: healthKitManager.latestData) { _, newData in
                    guard let data = newData else { return }
                    webSocketManager.sendHealthUpdate(data)
                }
                .onChange(of: webSocketManager.latestAnomalyScore) { _, score in
                    if let score = score, score >= 0.8 {
                        hapticManager.playAlert(level: score >= 0.95 ? .critical : .elevated)
                    }
                }
                .onChange(of: webSocketManager.latestGroupAlert) { _, alert in
                    if alert != nil {
                        hapticManager.playAlert(level: .groupAlert)
                    }
                }
        }
    }
}
