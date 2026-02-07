import Foundation
import Combine

// MARK: - Episode Phase

enum EpisodePhase: String, CaseIterable {
    case idle
    case anomalyDetected = "anomaly_detected"
    case calming
    case calmingMusic = "calming_music"
    case reEvaluating = "re_evaluating"
    case requestingPhoneCheck = "visual_check"
    case waitingForPhone = "waiting_for_phone"
    case resolved
}

// MARK: - Episode Manager

final class EpisodeManager: ObservableObject {

    @Published var currentPhase: EpisodePhase = .idle
    @Published var currentEpisodeId: String?
    @Published var breathingProgress: Double = 0       // 0-1
    @Published var showPhoneCheckPrompt: Bool = false
    @Published var resolutionMessage: String?

    private var calmingTimer: Timer?
    private var breathingTimer: Timer?
    private let calmingDuration: TimeInterval = 75     // seconds
    private var calmingStartTime: Date?

    // MARK: - Episode Lifecycle

    func startEpisode(trigger: AnomalyType, data: HealthData) {
        guard currentPhase == .idle else { return }

        DispatchQueue.main.async {
            self.currentPhase = .anomalyDetected
            self.resolutionMessage = nil
        }

        // Auto-transition to calming after a brief delay for the notification
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.startCalming()
        }
    }

    func setEpisodeId(_ id: String) {
        DispatchQueue.main.async {
            self.currentEpisodeId = id
        }
    }

    // MARK: - Calming Phase

    func startCalming() {
        DispatchQueue.main.async {
            self.currentPhase = .calming
            self.breathingProgress = 0
            self.calmingStartTime = Date()
        }

        // Drive breathing progress
        breathingTimer?.invalidate()
        breathingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] timer in
            guard let self = self else { timer.invalidate(); return }
            guard let start = self.calmingStartTime else { return }

            let elapsed = Date().timeIntervalSince(start)
            let progress = min(1.0, elapsed / self.calmingDuration)

            DispatchQueue.main.async {
                self.breathingProgress = progress
            }

            if elapsed >= self.calmingDuration {
                timer.invalidate()
                self.finishCalmingPhase()
            }
        }
    }

    private func finishCalmingPhase() {
        breathingTimer?.invalidate()
        breathingTimer = nil

        DispatchQueue.main.async {
            self.currentPhase = .reEvaluating
            self.breathingProgress = 1.0
        }
    }

    func finishCalming(postVitals: HealthData) {
        // Called externally when post-vitals are ready to send
        DispatchQueue.main.async {
            self.currentPhase = .reEvaluating
        }
    }

    // MARK: - Calming Music Phase

    func startCalmingMusic() {
        DispatchQueue.main.async {
            self.currentPhase = .calmingMusic
            self.breathingProgress = 0
            self.calmingStartTime = Date()
        }

        breathingTimer?.invalidate()
        breathingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] timer in
            guard let self = self else { timer.invalidate(); return }
            guard let start = self.calmingStartTime else { return }

            let elapsed = Date().timeIntervalSince(start)
            let progress = min(1.0, elapsed / self.calmingDuration)

            DispatchQueue.main.async {
                self.breathingProgress = progress
            }

            if elapsed >= self.calmingDuration {
                timer.invalidate()
                DispatchQueue.main.async {
                    self.currentPhase = .reEvaluating
                    self.breathingProgress = 1.0
                }
            }
        }
    }

    // MARK: - Phone Check Phase

    func requestPhoneCheck() {
        DispatchQueue.main.async {
            self.currentPhase = .requestingPhoneCheck
            self.showPhoneCheckPrompt = true
        }
    }

    func onPhoneCheckStarted() {
        DispatchQueue.main.async {
            self.currentPhase = .waitingForPhone
            self.showPhoneCheckPrompt = false
        }
    }

    func onPhoneCheckComplete() {
        DispatchQueue.main.async {
            self.showPhoneCheckPrompt = false
        }
    }

    func skipPhoneCheck() {
        DispatchQueue.main.async {
            self.showPhoneCheckPrompt = false
        }
    }

    // MARK: - Resolution

    func resolveEpisode(reason: String) {
        breathingTimer?.invalidate()
        breathingTimer = nil

        let message: String
        switch reason {
        case "calming_resolved":
            message = "Great job! Your vitals are back to normal."
        case "false_positive":
            message = "All clear — looks like a false alarm."
        case "caregiver_acknowledged":
            message = "Your caregiver has been notified."
        default:
            message = "Episode resolved."
        }

        DispatchQueue.main.async {
            self.currentPhase = .resolved
            self.resolutionMessage = message
            self.showPhoneCheckPrompt = false
            self.breathingProgress = 0
        }

        // Return to idle after showing resolution message
        DispatchQueue.main.asyncAfter(deadline: .now() + 4.0) { [weak self] in
            self?.returnToIdle()
        }
    }

    private func returnToIdle() {
        DispatchQueue.main.async {
            self.currentPhase = .idle
            self.currentEpisodeId = nil
            self.resolutionMessage = nil
        }
    }

    // MARK: - Server Phase Updates

    func handleServerPhaseUpdate(phase: String, instructions: String?) {
        switch phase {
        case "calming":
            if currentPhase != .calming {
                startCalming()
            }
        case "calming_music":
            if currentPhase != .calmingMusic {
                startCalmingMusic()
            }
        case "visual_check":
            requestPhoneCheck()
        case "resolved":
            resolveEpisode(reason: instructions ?? "resolved")
        case "escalating":
            // Stay on current view but update phase
            DispatchQueue.main.async {
                // Don't change to idle — stay showing whatever view is active
            }
        default:
            break
        }
    }
}
