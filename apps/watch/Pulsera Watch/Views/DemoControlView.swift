import SwiftUI

struct DemoControlView: View {
    @EnvironmentObject var healthKitManager: HealthKitManager
    @EnvironmentObject var webSocketManager: WebSocketManager
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var elevenLabsManager: ElevenLabsManager

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                headerSection
                healthDataSection
                episodeControlsSection
                connectionSection
                statusSection
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 12)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 2) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 18))
                .foregroundColor(PulseraTheme.accent)
            Text("Demo Mode")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(PulseraTheme.accent)
        }
    }

    // MARK: - Section 1: Simulated Health Data

    private var healthDataSection: some View {
        VStack(spacing: 8) {
            sectionLabel("Simulated Vitals")

            if let hr = healthKitManager.latestData?.heartRate {
                Text("HR: \(Int(hr)) bpm")
                    .font(.system(size: 12, design: .monospaced))
                    .foregroundColor(.white.opacity(0.7))
            }

            Button {
                injectVitals(hr: 72, hrv: 45, accel: 0.3, temp: 36.5, status: .normal)
            } label: {
                demoButtonLabel("Normal Vitals", color: PulseraTheme.safe)
            }
            .buttonStyle(.plain)

            Button {
                injectVitals(hr: 135, hrv: 20, accel: 0.5, temp: 37.2, status: .elevated)
            } label: {
                demoButtonLabel("Elevated Vitals", color: PulseraTheme.accent)
            }
            .buttonStyle(.plain)

            Button {
                injectVitals(hr: 175, hrv: 10, accel: 0.1, temp: 37.8, status: .critical)
            } label: {
                demoButtonLabel("Critical Vitals", color: PulseraTheme.danger)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Section 2: Episode Controls

    private var episodeControlsSection: some View {
        VStack(spacing: 8) {
            sectionLabel("Episode Controls")

            Button {
                let criticalData = HealthData(
                    heartRate: 175, hrv: 10, acceleration: 0.1,
                    skinTemp: 37.8, status: .critical
                )
                episodeManager.startEpisode(trigger: .sustainedElevatedHR, data: criticalData)
                if webSocketManager.connectionState.isConnected {
                    webSocketManager.sendEpisodeStart(triggerData: criticalData.toJSON())
                }
            } label: {
                demoButtonLabel("Trigger Episode", color: PulseraTheme.accent)
            }
            .buttonStyle(.plain)

            Button {
                episodeManager.currentPhase = .calming
                episodeManager.breathingProgress = 0
            } label: {
                demoButtonLabel("Skip to Calming", color: PulseraTheme.accent)
            }
            .buttonStyle(.plain)

            Button {
                episodeManager.startCalmingMusic()
            } label: {
                demoButtonLabel("Calming Music", color: PulseraTheme.accent)
            }
            .buttonStyle(.plain)

            Button {
                episodeManager.currentPhase = .reEvaluating
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    episodeManager.requestPhoneCheck()
                }
            } label: {
                demoButtonLabel("Finish (elevated)", color: PulseraTheme.accent)
            }
            .buttonStyle(.plain)

            Button {
                episodeManager.resolveEpisode(reason: "calming_resolved")
            } label: {
                demoButtonLabel("Finish (normal)", color: PulseraTheme.safe)
            }
            .buttonStyle(.plain)

            Button {
                episodeManager.requestPhoneCheck()
            } label: {
                demoButtonLabel("Phone Check", color: PulseraTheme.accent)
            }
            .buttonStyle(.plain)

            Button {
                episodeManager.resolveEpisode(reason: "false_positive")
            } label: {
                demoButtonLabel("Resolve Episode", color: PulseraTheme.safe)
            }
            .buttonStyle(.plain)

            Button {
                resetToIdle()
            } label: {
                demoButtonLabel("Reset to Idle", color: PulseraTheme.mutedForeground)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Section 3: Connection

    private var connectionSection: some View {
        VStack(spacing: 4) {
            sectionLabel("Connection")

            Text(webSocketManager.connectionState.displayText)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(connectionColor)
        }
    }

    // MARK: - Section 4: Status Display

    private var statusSection: some View {
        VStack(spacing: 4) {
            sectionLabel("Status")

            HStack(spacing: 6) {
                Circle()
                    .fill(phaseColor)
                    .frame(width: 8, height: 8)
                Text(episodeManager.currentPhase.rawValue)
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.white.opacity(0.7))
            }

            HStack(spacing: 6) {
                Circle()
                    .fill(elevenLabsManager.isConnected ? .green : .gray)
                    .frame(width: 8, height: 8)
                Text("ElevenLabs")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundColor(.white.opacity(0.7))
            }

            if let episodeId = episodeManager.currentEpisodeId {
                Text("ID: \(episodeId.prefix(8))...")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
    }

    // MARK: - Actions

    private func injectVitals(hr: Double, hrv: Double, accel: Double, temp: Double, status: HealthStatus) {
        let data = HealthData(
            heartRate: hr, hrv: hrv, acceleration: accel,
            skinTemp: temp, status: status
        )
        healthKitManager.injectSimulatedData(data)
        hapticManager.playTap()
    }

    private func resetToIdle() {
        episodeManager.currentPhase = .idle
        episodeManager.currentEpisodeId = nil
        episodeManager.resolutionMessage = nil
        episodeManager.breathingProgress = 0
        episodeManager.showPhoneCheckPrompt = false
        hapticManager.playTap()
    }

    // MARK: - UI Helpers

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(.white.opacity(0.5))
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 4)
    }

    private func demoButtonLabel(_ title: String, color: Color) -> some View {
        Text(title)
            .font(.system(size: 13, weight: .medium, design: .rounded))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(color.opacity(0.85))
            .cornerRadius(8)
    }

    private var connectionColor: Color {
        switch webSocketManager.connectionState {
        case .connected: return PulseraTheme.safe
        case .connecting: return PulseraTheme.warning
        case .disconnected: return PulseraTheme.mutedForeground
        case .error: return PulseraTheme.danger
        }
    }

    private var phaseColor: Color {
        switch episodeManager.currentPhase {
        case .idle: return PulseraTheme.safe
        case .anomalyDetected: return PulseraTheme.warning
        case .calming: return PulseraTheme.info
        case .calmingMusic: return PulseraTheme.interactive
        case .reEvaluating: return PulseraTheme.warning
        case .requestingPhoneCheck, .waitingForPhone: return PulseraTheme.interactive
        case .resolved: return PulseraTheme.safe
        }
    }
}

#Preview {
    DemoControlView()
        .environmentObject(HealthKitManager())
        .environmentObject(WebSocketManager())
        .environmentObject(EpisodeManager())
        .environmentObject(HapticManager())
        .environmentObject(ElevenLabsManager())
}
