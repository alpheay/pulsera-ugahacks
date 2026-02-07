import Foundation
import Combine

enum MonitoringMode: String, Equatable {
    case passive
    case active
}

enum SessionMode: String, Equatable {
    case normal
    case distress
}

enum SessionRingState: Equatable {
    case none
    case idle
    case agentSpeaking
    case patientSpeaking
}

private enum WatchStateConstants {
    static let amplitudeThreshold: CGFloat = 0.1
}

enum DemoPhase: Equatable {
    case idle         // Resting HR, show Start button
    case episodeActive // Episode running, HR declining
    case resolved     // Show "You're Safe" + Send Pulse
}

@MainActor
final class WatchState: ObservableObject {
    @Published var monitoringMode: MonitoringMode = .passive
    @Published var hasActiveSession: Bool = false
    @Published var sessionMode: SessionMode = .normal
    @Published var sessionId: String?

    @Published var inputAmplitude: CGFloat = 0
    @Published var outputAmplitude: CGFloat = 0

    // Demo flow state
    @Published var demoPhase: DemoPhase = .idle
    @Published var demoHeartRate: Int = 58
    @Published var pulseSent: Bool = false
    private var demoTimer: Timer?

    func startDemoHeartRate() {
        demoHeartRate = 58
        demoPhase = .idle
        demoTimer?.invalidate()
        demoTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.tickDemoHR()
            }
        }
    }

    func triggerDemoEpisode() {
        demoPhase = .episodeActive
    }

    func resolveDemoEpisode() {
        demoPhase = .resolved
        pulseSent = false
    }

    func resetDemo() {
        demoPhase = .idle
        demoHeartRate = 58
        pulseSent = false
    }

    func stopDemoHeartRate() {
        demoTimer?.invalidate()
        demoTimer = nil
    }

    private func tickDemoHR() {
        switch demoPhase {
        case .idle:
            demoHeartRate = 58 + Int.random(in: -2...2)
        case .episodeActive:
            if demoHeartRate > 62 {
                demoHeartRate -= Int.random(in: 1...2)
            } else {
                demoHeartRate = 58 + Int.random(in: -2...2)
            }
        case .resolved:
            demoHeartRate = 58 + Int.random(in: -1...1)
        }
    }
    
    var ringState: SessionRingState {
        guard hasActiveSession else { return .none }
        
        if outputAmplitude > WatchStateConstants.amplitudeThreshold {
            return .agentSpeaking
        } else if inputAmplitude > WatchStateConstants.amplitudeThreshold {
            return .patientSpeaking
        } else {
            return .idle
        }
    }
    
    func handleSessionStart(sessionId: String?, initialMode: String?) {
        self.hasActiveSession = true
        self.sessionId = sessionId
        self.sessionMode = (initialMode == "distress") ? .distress : .normal
    }
    
    func handleSessionEnd() {
        self.hasActiveSession = false
        self.sessionId = nil
        self.sessionMode = .normal
        self.inputAmplitude = 0
        self.outputAmplitude = 0
    }
    
    func handleSessionModeChange(to mode: String?) {
        self.sessionMode = (mode == "distress") ? .distress : .normal
    }
    
    func handleMonitoringStart() {
        self.monitoringMode = .active
    }
    
    func handleMonitoringEnd() {
        self.monitoringMode = .passive
    }
}
