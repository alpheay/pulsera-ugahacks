import Combine
import Foundation

@MainActor
final class AppCoordinator: ObservableObject {
    @Published private(set) var state: AppState = .welcome
    @Published private(set) var statusMessage: String = "Idle"
    @Published private(set) var patientName: String = ""
    @Published private(set) var personalizedContext: String?
    @Published private(set) var pairingCode: String?

    let watchState: WatchState
    let overlayState: OverlayState

    private let dependencies: AppDependencies
    private var cancellables = Set<AnyCancellable>()
    
    private lazy var pairingCoordinator = PairingCoordinator(
        caregiverSocketService: dependencies.caregiverSocketService,
        getAppState: { [weak self] in self?.state ?? .welcome },
        setAppState: { [weak self] in self?.state = $0 },
        setStatusMessage: { [weak self] in self?.statusMessage = $0 },
        setPatientName: { [weak self] in self?.patientName = $0 },
        setPersonalizedContext: { [weak self] in self?.personalizedContext = $0 }
    )

    private(set) lazy var overlayCoordinator = OverlayCoordinator(
        musicPlaybackService: dependencies.musicPlaybackService,
        audioEngineService: dependencies.audioEngineService
    )

    private(set) lazy var callCoordinator = CallCoordinator()
    
    private lazy var webSocketEventHandler = WebSocketEventHandler(
        watchState: watchState,
        overlayState: overlayState,
        overlayCoordinator: overlayCoordinator,
        callCoordinator: callCoordinator,
        audioEngineService: dependencies.audioEngineService,
        audioInputService: dependencies.audioInputService,
        agentAudioService: dependencies.agentAudioService,
        caregiverSocketService: dependencies.caregiverSocketService
    )

    init(dependencies: AppDependencies) {
        self.dependencies = dependencies
        self.watchState = WatchState()
        self.overlayState = OverlayState()

        // Forward overlayState changes to trigger SwiftUI re-renders
        // SwiftUI only observes @Published properties on the observed object,
        // so nested ObservableObject changes must be manually forwarded
        overlayState.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)

        configureCaregiverSocketHandlers()
        configurePairingCallbacks()
        configureAudioHandlers()

        if dependencies.caregiverSocketService.storedDeviceId != nil {
            state = .authenticated
            statusMessage = "Connecting..."
            dependencies.caregiverSocketService.connect()
        }
    }

    func beginPairing() {
        state = .pairing
    }

    func submitPairingCode(_ code: String) {
        pairingCoordinator.submitPairingCode(
            code,
            onError: { [weak self] _ in
                self?.state = .pairing
            },
            onSuccess: {}
        )
    }

    func cancelPairing() {
        pairingCoordinator.cancelPairing()
    }

    func cancelPairingWithCode(_ code: String) {
        dependencies.caregiverSocketService.send([
            "type": "cancel-pairing",
            "pairingCode": code,
        ])
        pairingCoordinator.cancelPairing()
    }
    
    func sendCommand() {
        dependencies.caregiverSocketService.send([
            "type": "command"
        ])
    }
    
    func cancelDeadman() {
        guard let pendingId = overlayState.deadmanPendingId else { return }
        dependencies.caregiverSocketService.send([
            "type": "deadman-cancel",
            "pendingId": pendingId
        ])
    }

    func dismissPhoto() {
        overlayState.hidePhoto()
        overlayCoordinator.hideAll()
        dependencies.caregiverSocketService.send([
            "type": "media-event",
            "event": "ended"
        ])
    }
    
    func handleDoubleTap() {
        if overlayState.hasDeadmanPending {
            cancelDeadman()
        } else if !watchState.hasActiveSession {
            sendCommand()
        }
    }

    func toggleCallMute() {
        callCoordinator.toggleMute()
    }

    // MARK: - Demo Flow

    func startDemoEpisode() {
        watchState.triggerDemoEpisode()

        // Send command to trigger an agent session (same as double-tap)
        sendCommand()

        // Auto-resolve after 15s for demo purposes
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            guard let self, self.watchState.demoPhase == .episodeActive else { return }
            self.watchState.resolveDemoEpisode()
        }
    }

    func sendDemoPulseCheckin() {
        guard !watchState.pulseSent else { return }
        watchState.pulseSent = true

        dependencies.caregiverSocketService.send([
            "type": "pulse-checkin",
            "message": "I'm okay!",
            "photo_url": "hardcoded_selfie",
        ])

        // Reset after 3s
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            self?.watchState.pulseSent = false
        }
    }

    func dismissDemoResolved() {
        watchState.resetDemo()
    }

    private func configureCaregiverSocketHandlers() {
        dependencies.caregiverSocketService.onAuthenticated = { [weak self] _, patientName in
            Task { @MainActor in
                guard let self else { return }
                if let patientName {
                    self.patientName = patientName
                }
                self.statusMessage = "Connected"
            }
        }

        dependencies.caregiverSocketService.onDisconnected = { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.statusMessage = "Disconnected"
            }
        }

        dependencies.caregiverSocketService.onReconnectApproved = { [weak self] in
            Task { @MainActor in
                self?.statusMessage = "Reconnected"
            }
        }

        dependencies.caregiverSocketService.onReconnectRejected = { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.dependencies.caregiverSocketService.storedDeviceId = nil
                self.dependencies.caregiverSocketService.disconnect()
                self.patientName = ""
                self.personalizedContext = nil
                self.pairingCode = nil
                self.state = .welcome
                self.statusMessage = "Reconnection rejected"
            }
        }

        dependencies.caregiverSocketService.onDeviceUnpaired = { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.dependencies.caregiverSocketService.storedDeviceId = nil
                self.dependencies.caregiverSocketService.disconnect()
                self.patientName = ""
                self.personalizedContext = nil
                self.pairingCode = nil
                self.state = .welcome
                self.statusMessage = "Device unpaired"
            }
        }
        
        dependencies.caregiverSocketService.onMessage = { [weak self] message in
            Task { @MainActor in
                self?.webSocketEventHandler.handleMessage(message)
            }
        }
        
        dependencies.caregiverSocketService.onBinaryMessage = { [weak self] data in
            Task { @MainActor in
                self?.webSocketEventHandler.handleBinaryMessage(data)
            }
        }
    }

    private func configurePairingCallbacks() {
        dependencies.caregiverSocketService.onPairingApproved = {
            [weak self] deviceId, patientName, patientPreferences in
            Task { @MainActor in
                self?.pairingCoordinator.handlePairingApproved(
                    deviceId: deviceId,
                    patientName: patientName,
                    patientPreferences: patientPreferences
                )
            }
        }

        dependencies.caregiverSocketService.onPairingError = { [weak self] message in
            Task { @MainActor in
                self?.pairingCoordinator.handlePairingError(message)
            }
        }
    }
    
    private func configureAudioHandlers() {
        dependencies.musicPlaybackService.onPlaybackEnded = { [weak self] in
            Task { @MainActor in
                guard let self else { return }
                self.overlayCoordinator.hideMusicPlaying()
                self.overlayState.hideMusic()
                self.dependencies.caregiverSocketService.send([
                    "type": "media-event",
                    "event": "ended"
                ])
            }
        }
    }
}
