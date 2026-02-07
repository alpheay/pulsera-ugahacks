import SwiftUI

@main
struct PulseraWatchApp: App {
    @StateObject private var healthKitManager = HealthKitManager()
    @StateObject private var webSocketManager = WebSocketManager()
    @StateObject private var hapticManager = HapticManager()
    @StateObject private var localAnomalyDetector = LocalAnomalyDetector()
    @StateObject private var episodeManager = EpisodeManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(healthKitManager)
                .environmentObject(webSocketManager)
                .environmentObject(hapticManager)
                .environmentObject(localAnomalyDetector)
                .environmentObject(episodeManager)
                .onAppear {
                    healthKitManager.requestAuthorization()
                    webSocketManager.connectIfConfigured()
                }
                .onChange(of: healthKitManager.latestData) { _, newData in
                    guard let data = newData else { return }
                    webSocketManager.sendHealthUpdate(data)

                    // Feed data to local anomaly detector
                    localAnomalyDetector.processReading(data)

                    // If anomaly detected and no active episode, start one
                    if localAnomalyDetector.isAnomalyDetected && episodeManager.currentPhase == .idle {
                        let triggerData: [String: Any] = [
                            "heartRate": data.heartRate,
                            "hrv": data.hrv,
                            "acceleration": data.acceleration,
                            "skinTemp": data.skinTemp,
                            "anomalyType": localAnomalyDetector.anomalyType.rawValue,
                            "anomaly_score": webSocketManager.latestAnomalyScore ?? 0.7,
                        ]

                        episodeManager.startEpisode(trigger: localAnomalyDetector.anomalyType, data: data)
                        webSocketManager.sendEpisodeStart(triggerData: triggerData)
                        hapticManager.playBreathing(phase: .calmingStart)
                        localAnomalyDetector.reset()
                    }

                    // When re-evaluating, send post-calming vitals
                    if episodeManager.currentPhase == .reEvaluating,
                       let episodeId = episodeManager.currentEpisodeId {
                        let postVitals: [String: Any] = [
                            "heartRate": data.heartRate,
                            "hrv": data.hrv,
                            "acceleration": data.acceleration,
                            "skinTemp": data.skinTemp,
                        ]
                        webSocketManager.sendCalmingResult(episodeId: episodeId, postVitals: postVitals)
                    }
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
                .onChange(of: webSocketManager.latestEpisodeUpdate) { _, update in
                    guard let update = update else { return }
                    episodeManager.setEpisodeId(update.episodeId)
                    episodeManager.handleServerPhaseUpdate(
                        phase: update.phase,
                        instructions: update.instructions
                    )
                }
        }
    }
}
