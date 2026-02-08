import SwiftUI

@main
struct PulseraWatchApp: App {
    @StateObject private var healthKitManager = HealthKitManager()
    @StateObject private var webSocketManager = WebSocketManager()
    @StateObject private var hapticManager = HapticManager()
    @StateObject private var localAnomalyDetector = LocalAnomalyDetector()
    @StateObject private var episodeManager = EpisodeManager()
    @StateObject private var audioPlayerManager = AudioPlayerManager()
    @StateObject private var elevenLabsManager = ElevenLabsManager()
    @StateObject private var eventBridge = EventBridgeClient()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(healthKitManager)
                .environmentObject(webSocketManager)
                .environmentObject(hapticManager)
                .environmentObject(localAnomalyDetector)
                .environmentObject(episodeManager)
                .environmentObject(audioPlayerManager)
                .environmentObject(elevenLabsManager)
                .environmentObject(eventBridge)
                .onAppear {
                    healthKitManager.startDemoMode()
                    webSocketManager.connectIfConfigured()
                    elevenLabsManager.audioPlayerManager = audioPlayerManager
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
                .onChange(of: webSocketManager.incomingAudioData) { _, data in
                    if let data = data {
                        audioPlayerManager.playPCMData(data)
                    }
                }
                .onChange(of: episodeManager.currentPhase) { _, phase in
                    if phase == .anomalyDetected {
                        // Start HR decline when episode triggers
                        healthKitManager.setDemoDecline()
                    } else if phase == .calming {
                        audioPlayerManager.stopCalmingTrack()
                        audioPlayerManager.startEngine()
                        elevenLabsManager.startSession()
                    } else if phase == .calmingMusic {
                        elevenLabsManager.stopSession()
                        audioPlayerManager.stopEngine()
                        audioPlayerManager.playCalmingTrack(AudioPlayerManager.calmingTracks[0])
                    } else if phase == .idle {
                        elevenLabsManager.stopSession()
                        if audioPlayerManager.isPlaying {
                            audioPlayerManager.stopEngine()
                        }
                        if audioPlayerManager.isPlayingTrack {
                            audioPlayerManager.stopCalmingTrack()
                        }
                        // Restart demo simulation for next run
                        healthKitManager.startDemoMode()
                    } else {
                        elevenLabsManager.stopSession()
                        if audioPlayerManager.isPlaying {
                            audioPlayerManager.stopEngine()
                        }
                        if audioPlayerManager.isPlayingTrack {
                            audioPlayerManager.stopCalmingTrack()
                        }
                    }
                }
        }
    }
}
