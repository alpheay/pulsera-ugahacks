import Foundation
import AVFoundation

// MARK: - Audio Configuration

private enum AudioConfig {
    static let maxEarlyAudioBuffer = 10
    static let preBufferThreshold = 5       // Increased for smoother playback
    static let prebufferTimeoutMs: UInt64 = 800  // Increased to allow more buffering time
    static let audioTransitionDelaySeconds = 0.05
    static let audioTransitionCooldownSeconds = 0.1
}

// MARK: - WebSocketEventHandler

@MainActor
final class WebSocketEventHandler {
    private let watchState: WatchState
    private let overlayState: OverlayState
    private let overlayCoordinator: OverlayCoordinator
    private let callCoordinator: CallCoordinator
    private let audioEngineService: any AudioEngineServicing
    private let audioInputService: any AudioInputServicing
    private let agentAudioService: any AgentAudioServicing
    private let caregiverSocketService: any CaregiverSocketServicing

    private var earlyAudioBuffer: [Data] = []

    // Audio prebuffering for smoother playback
    private var audioPreBuffer: [Data] = []
    private var isPreBuffering = true
    private var prebufferTimeoutTask: Task<Void, Never>?

    // Audio session transition state
    private var audioTransitionState: AudioTransitionState = .idle

    private enum AudioTransitionState {
        case idle
        case starting
        case stopping
    }

    // TTS sync state for music timing
    private var ttsEndMarkerReceived = false
    private var pendingMusicCommand: [String: Any]?
    
    init(
        watchState: WatchState,
        overlayState: OverlayState,
        overlayCoordinator: OverlayCoordinator,
        callCoordinator: CallCoordinator,
        audioEngineService: any AudioEngineServicing,
        audioInputService: any AudioInputServicing,
        agentAudioService: any AgentAudioServicing,
        caregiverSocketService: any CaregiverSocketServicing
    ) {
        self.watchState = watchState
        self.overlayState = overlayState
        self.overlayCoordinator = overlayCoordinator
        self.callCoordinator = callCoordinator
        self.audioEngineService = audioEngineService
        self.audioInputService = audioInputService
        self.agentAudioService = agentAudioService
        self.caregiverSocketService = caregiverSocketService

        setupQueueDrainedCallback()
    }

    private func setupQueueDrainedCallback() {
        agentAudioService.onQueueDrained = { [weak self] in
            self?.checkTtsPlaybackComplete()
        }
    }

    private func checkTtsPlaybackComplete() {
        guard ttsEndMarkerReceived, !agentAudioService.hasQueuedBuffers else { return }

        ttsEndMarkerReceived = false
        caregiverSocketService.send(["type": "tts-playback-complete"])

        if let pending = pendingMusicCommand {
            pendingMusicCommand = nil
            executeMusicCommand(pending)
        }
    }

    private func executeMusicCommand(_ json: [String: Any]) {
        guard let action = json["action"] as? String else { return }

        switch action {
        case "play_music":
            let musicData = json["selected"] as? [String: Any] ?? json
            let musicInfo = MusicInfo(
                deezerTrackId: musicData["deezerTrackId"] as? String ?? "",
                previewUrl: musicData["previewUrl"] as? String,
                title: musicData["title"] as? String ?? "Unknown",
                artist: musicData["artist"] as? String ?? "Unknown",
                albumCoverUrl: musicData["albumCoverUrl"] as? String,
                vibe: musicData["vibe"] as? String
            )
            overlayState.showMusic(musicInfo)
            if let previewUrl = musicInfo.previewUrl {
                overlayCoordinator.showMusicFromURL(previewUrl)
            } else {
                overlayCoordinator.showMusicPlaying()
            }
        default:
            break
        }
    }
    
    func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return
        }

        print("handleMessage: \(json)")
        
        switch type {
        case "watch-event":
            handleWatchEvent(json)
        case "media-command":
            handleMediaCommand(json)
        case "tts-end-marker":
            handleTtsEndMarker()
        case "deadman-pending":
            handleDeadmanPending(json)
        case "deadman-cancelled":
            handleDeadmanCancelled()
        case "deadman-done":
            handleDeadmanDone(json)
        case "error":
            handleError(json)
        default:
            break
        }
    }
    
    func handleBinaryMessage(_ data: Data) {
        let hasActiveSession = watchState.hasActiveSession

        if hasActiveSession {
            // Flush any buffered audio first
            flushEarlyAudioBuffer()

            // Prebuffer audio chunks to smooth out network jitter
            if isPreBuffering {
                // Start timeout on first chunk - ensures playback starts within configured timeout
                // even if only one large chunk arrives (common for agent greetings)
                if prebufferTimeoutTask == nil {
                    let timeoutMs = AudioConfig.prebufferTimeoutMs
                    prebufferTimeoutTask = Task { [weak self] in
                        try? await Task.sleep(nanoseconds: timeoutMs * 1_000_000)
                        guard !Task.isCancelled else { return }
                        await self?.flushPrebufferIfNeeded()
                    }
                }

                audioPreBuffer.append(data)
                if audioPreBuffer.count >= AudioConfig.preBufferThreshold {
                    flushPrebuffer()
                }
            } else {
                // Normal playback after prebuffering
                if let buffer = convertDataToAudioBuffer(data) {
                    agentAudioService.play(buffer: buffer)
                }
            }
        } else {
            // Buffer early audio until session starts
            if earlyAudioBuffer.count < AudioConfig.maxEarlyAudioBuffer {
                earlyAudioBuffer.append(data)
            }
        }
    }
    
    private func flushEarlyAudioBuffer() {
        guard !earlyAudioBuffer.isEmpty else { return }
        for data in earlyAudioBuffer {
            if let buffer = convertDataToAudioBuffer(data) {
                agentAudioService.play(buffer: buffer)
            }
        }
        earlyAudioBuffer.removeAll()
    }

    /// Flushes prebuffer only if still in prebuffering state with data waiting
    private func flushPrebufferIfNeeded() {
        guard isPreBuffering, !audioPreBuffer.isEmpty else { return }
        print("[Audio] Prebuffer timeout - flushing \(audioPreBuffer.count) chunk(s)")
        flushPrebuffer()
    }

    /// Flushes all prebuffered audio and switches to normal playback mode
    private func flushPrebuffer() {
        prebufferTimeoutTask?.cancel()
        prebufferTimeoutTask = nil
        isPreBuffering = false

        for bufferedData in audioPreBuffer {
            if let buffer = convertDataToAudioBuffer(bufferedData) {
                agentAudioService.play(buffer: buffer)
            }
        }
        audioPreBuffer.removeAll()
    }
    
    private func handleWatchEvent(_ json: [String: Any]) {
        guard let eventType = json["eventType"] as? String else { return }
        let data = json["data"] as? [String: Any]
        
        switch eventType {
        case "session-start":
            let sessionId = json["sessionId"] as? String
            let initialMode = data?["initialMode"] as? String
            watchState.handleSessionStart(sessionId: sessionId, initialMode: initialMode)

            // Reset prebuffer state BEFORE starting audio
            prebufferTimeoutTask?.cancel()
            prebufferTimeoutTask = nil
            audioPreBuffer.removeAll()
            isPreBuffering = true
            // Note: earlyAudioBuffer is intentionally NOT cleared here - it may contain
            // audio that arrived before session-start which should be flushed after audio starts

            startAudioSession()
            
        case "session-end":
            watchState.handleSessionEnd()
            stopAudioSession()
            overlayState.clearAll()
            overlayCoordinator.hideAll()
            // If demo episode was active, transition to resolved
            if watchState.demoPhase == .episodeActive {
                watchState.resolveDemoEpisode()
            }
            
        case "session-mode-change":
            let mode = data?["to"] as? String
            watchState.handleSessionModeChange(to: mode)
            
        case "monitoring-start":
            watchState.handleMonitoringStart()
            
        case "monitoring-end":
            watchState.handleMonitoringEnd()
            
        case "call-start":
            let caregiverId = data?["caregiverId"] as? String
            overlayState.showCall(CallInfo(caregiverId: caregiverId))
            callCoordinator.startCall()
            
        case "call-end":
            overlayState.hideCall()
            callCoordinator.endCall()
            
        default:
            break
        }
    }
    
    private func handleTtsEndMarker() {
        ttsEndMarkerReceived = true
        checkTtsPlaybackComplete()
    }

    private func handleMediaCommand(_ json: [String: Any]) {
        guard let action = json["action"] as? String else { return }

        switch action {
        case "play_music":
            // Music must wait for TTS to complete to avoid audio session conflicts
            if agentAudioService.hasQueuedBuffers {
                pendingMusicCommand = json
                return
            }
            executeMusicCommand(json)

        case "display_images":
            // Images can display immediately - no audio session change needed
            let photoData = json["selected"] as? [String: Any] ?? json
            let photoInfo = PhotoInfo(
                photoId: photoData["photoId"] as? Int ?? 0,
                url: photoData["url"] as? String,
                semanticDescription: photoData["semanticDescription"] as? String,
                vibe: photoData["vibe"] as? String
            )
            overlayState.showPhoto(photoInfo)

        case "stop_music":
            pendingMusicCommand = nil
            ttsEndMarkerReceived = false
            overlayState.hideMusic()
            overlayCoordinator.hideMusicPlaying()

        case "stop_images":
            overlayState.hidePhoto()

        default:
            break
        }
    }
    
    private func handleDeadmanPending(_ json: [String: Any]) {
        let deadmanInfo = DeadmanPendingInfo(
            pendingId: json["pendingId"] as? String ?? "",
            action: json["action"] as? String ?? "",
            expiresAt: json["expiresAt"] as? Int ?? 0,
            sessionId: json["sessionId"] as? String,
            duration: json["duration"] as? Int ?? 10000
        )
        overlayState.showDeadman(deadmanInfo)
    }
    
    private func handleDeadmanCancelled() {
        overlayState.hideDeadman()
    }
    
    private func handleDeadmanDone(_ json: [String: Any]) {
        overlayState.hideDeadman()
    }
    
    private func handleError(_ json: [String: Any]) {
        let message = json["message"] as? String ?? "Unknown error"
        print("[Socket] Error: \(message)")
    }
    
    private func startAudioSession() {
        guard audioTransitionState == .idle else {
            print("[Audio] Already transitioning (state=\(audioTransitionState)), retrying...")
            DispatchQueue.main.asyncAfter(deadline: .now() + AudioConfig.audioTransitionCooldownSeconds) { [weak self] in
                self?.startAudioSession()
            }
            return
        }

        audioTransitionState = .starting
        print("[Audio] Starting audio session...")

        do {
            try audioEngineService.activateForSession()
            print("[Audio] Audio engine activated")

            DispatchQueue.main.asyncAfter(deadline: .now() + AudioConfig.audioTransitionDelaySeconds) { [weak self] in
                guard let self = self else { return }

                // Verify we're still in starting state (not cancelled)
                guard self.audioTransitionState == .starting else {
                    print("[Audio] Audio session start cancelled during transition")
                    return
                }

                self.audioInputService.reinstallTap()
                print("[Audio] Tap installed")

                self.audioInputService.onInputBuffer = { [weak self] buffer in
                    guard let self = self else { return }
                    let data = self.convertAudioBufferToData(buffer)
                    if !data.isEmpty {
                        self.caregiverSocketService.sendBinary(data)
                    }
                }

                self.audioTransitionState = .idle
                print("[Audio] Audio session started successfully")

                // Flush any early audio that arrived before session was fully ready
                self.flushEarlyAudioBuffer()
            }
        } catch {
            print("[Audio] Failed to start audio session: \(error)")
            audioTransitionState = .idle
        }
    }

    private func stopAudioSession() {
        print("[Audio] Stopping audio session...")
        audioTransitionState = .stopping

        audioInputService.removeTap()
        agentAudioService.stop()
        audioEngineService.deactivateSession()

        // Clear all audio state
        prebufferTimeoutTask?.cancel()
        prebufferTimeoutTask = nil
        earlyAudioBuffer.removeAll()
        audioPreBuffer.removeAll()
        isPreBuffering = true

        // Clear TTS sync state
        ttsEndMarkerReceived = false
        pendingMusicCommand = nil

        // Brief delay before allowing new session to prevent audio system conflicts
        DispatchQueue.main.asyncAfter(deadline: .now() + AudioConfig.audioTransitionCooldownSeconds) { [weak self] in
            guard let self = self, self.audioTransitionState == .stopping else { return }
            self.audioTransitionState = .idle
        }
    }
    
    private func convertAudioBufferToData(_ buffer: AVAudioPCMBuffer) -> Data {
        let frameLength = Int(buffer.frameLength)
        guard frameLength > 0 else { return Data() }
        
        if let int16Data = buffer.int16ChannelData {
            return Data(bytes: int16Data[0], count: frameLength * MemoryLayout<Int16>.size)
        }
        
        if let floatData = buffer.floatChannelData {
            var int16Samples = [Int16](repeating: 0, count: frameLength)
            for i in 0..<frameLength {
                let sample = floatData[0][i]
                let clampedSample = max(-1.0, min(1.0, sample))
                int16Samples[i] = Int16(clampedSample * 32767)
            }
            return Data(bytes: int16Samples, count: frameLength * MemoryLayout<Int16>.size)
        }
        
        return Data()
    }
    
    private func convertDataToAudioBuffer(_ data: Data) -> AVAudioPCMBuffer? {
        guard let format = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: 16000, channels: 1, interleaved: false) else {
            return nil
        }
        let frameCount = AVAudioFrameCount(data.count / MemoryLayout<Int16>.size)
        
        guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            return nil
        }
        
        buffer.frameLength = frameCount
        
        data.withUnsafeBytes { rawBuffer in
            if let baseAddress = rawBuffer.baseAddress {
                buffer.int16ChannelData?[0].update(from: baseAddress.assumingMemoryBound(to: Int16.self), count: Int(frameCount))
            }
        }
        
        return buffer
    }
}
