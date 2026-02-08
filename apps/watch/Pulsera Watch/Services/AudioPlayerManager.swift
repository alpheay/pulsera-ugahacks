import AVFoundation
import os

private let audioLog = Logger(subsystem: "com.pulsera.watchapp", category: "AudioPlayer")

struct CalmingTrack: Identifiable, Equatable {
    let id: String
    let name: String
    let filename: String
}

final class AudioPlayerManager: ObservableObject {

    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?

    // ElevenLabs ConvAI default: PCM Int16, mono, 16 kHz
    private let pcmFormat = AVAudioFormat(
        commonFormat: .pcmFormatInt16,
        sampleRate: 16000,
        channels: 1,
        interleaved: true
    )!

    @Published var isPlaying = false

    // MARK: - Calming Track Playback

    static let calmingTracks: [CalmingTrack] = [
        CalmingTrack(id: "deep_calm", name: "Deep Calm", filename: "deep_calm"),
        CalmingTrack(id: "ocean_drift", name: "Ocean Drift", filename: "ocean_drift"),
        CalmingTrack(id: "starlight", name: "Starlight", filename: "starlight"),
    ]

    private var trackPlayer: AVAudioPlayer?

    @Published var isPlayingTrack = false
    @Published var currentTrack: CalmingTrack = calmingTracks[0]

    // MARK: - Engine lifecycle

    func startEngine() {
        guard audioEngine == nil else { return }

        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()

        engine.attach(player)
        engine.connect(player, to: engine.mainMixerNode, format: pcmFormat)

        do {
            let session = AVAudioSession.sharedInstance()
            // Start with .playback — safe on simulator and real device
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            try engine.start()
            player.play()
            self.audioEngine = engine
            self.playerNode = player
            isPlaying = true
            audioLog.info("engine started (.playback mode)")
        } catch {
            audioLog.error("Failed to start engine: \(error.localizedDescription)")
        }
    }

    func stopEngine() {
        playerNode?.stop()
        audioEngine?.stop()
        playerNode = nil
        audioEngine = nil
        isPlaying = false
        pcmLogCount = 0

        try? AVAudioSession.sharedInstance().setActive(false)
        audioLog.info("engine stopped")
    }

    // MARK: - PCM Playback

    private var pcmLogCount = 0

    func playPCMData(_ data: Data) {
        guard let player = playerNode, let engine = audioEngine, engine.isRunning else {
            pcmLogCount += 1
            if pcmLogCount <= 5 {
                audioLog.warning("playPCMData SKIPPED — node=\(self.playerNode != nil) engine=\(self.audioEngine != nil) running=\(self.audioEngine?.isRunning ?? false)")
            }
            return
        }

        let frameCount = UInt32(data.count / MemoryLayout<Int16>.size)
        guard frameCount > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: pcmFormat, frameCapacity: frameCount) else { return }

        buffer.frameLength = frameCount

        data.withUnsafeBytes { rawPtr in
            guard let src = rawPtr.baseAddress else { return }
            if let dst = buffer.int16ChannelData?[0] {
                memcpy(dst, src, data.count)
            }
        }

        player.scheduleBuffer(buffer, completionHandler: nil)

        pcmLogCount += 1
        if pcmLogCount <= 3 {
            audioLog.info("playPCMData: scheduled \(data.count) bytes (\(frameCount) frames)")
        }
    }

    // MARK: - Calming Track Playback

    func playCalmingTrack(_ track: CalmingTrack) {
        stopCalmingTrack()

        guard let url = Bundle.main.url(forResource: track.filename, withExtension: "m4a") else {
            audioLog.warning("Track file not found: \(track.filename).m4a")
            return
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)

            let player = try AVAudioPlayer(contentsOf: url)
            player.numberOfLoops = -1
            player.play()
            self.trackPlayer = player
            DispatchQueue.main.async {
                self.currentTrack = track
                self.isPlayingTrack = true
            }
        } catch {
            audioLog.error("Failed to play track: \(error.localizedDescription)")
        }
    }

    func stopCalmingTrack() {
        trackPlayer?.stop()
        trackPlayer = nil
        DispatchQueue.main.async {
            self.isPlayingTrack = false
        }
    }

    func nextTrack() {
        let tracks = Self.calmingTracks
        guard let idx = tracks.firstIndex(where: { $0.id == currentTrack.id }) else { return }
        let next = tracks[(idx + 1) % tracks.count]
        if isPlayingTrack {
            playCalmingTrack(next)
        } else {
            currentTrack = next
        }
    }

    func previousTrack() {
        let tracks = Self.calmingTracks
        guard let idx = tracks.firstIndex(where: { $0.id == currentTrack.id }) else { return }
        let prev = tracks[(idx - 1 + tracks.count) % tracks.count]
        if isPlayingTrack {
            playCalmingTrack(prev)
        } else {
            currentTrack = prev
        }
    }
}
