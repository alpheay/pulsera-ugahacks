import AVFoundation

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

    func startEngine() {
        guard audioEngine == nil else { return }

        let engine = AVAudioEngine()
        let player = AVAudioPlayerNode()

        engine.attach(player)

        // Connect player → main mixer with the PCM format
        engine.connect(player, to: engine.mainMixerNode, format: pcmFormat)

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            try engine.start()
            player.play()
            self.audioEngine = engine
            self.playerNode = player
            isPlaying = true
        } catch {
            print("AudioPlayerManager: Failed to start engine — \(error)")
        }
    }

    func stopEngine() {
        playerNode?.stop()
        audioEngine?.stop()
        playerNode = nil
        audioEngine = nil
        isPlaying = false

        try? AVAudioSession.sharedInstance().setActive(false)
    }

    func playPCMData(_ data: Data) {
        guard let player = playerNode, let engine = audioEngine, engine.isRunning else { return }

        let frameCount = UInt32(data.count / MemoryLayout<Int16>.size)
        guard frameCount > 0,
              let buffer = AVAudioPCMBuffer(pcmFormat: pcmFormat, frameCapacity: frameCount) else { return }

        buffer.frameLength = frameCount

        // Copy raw PCM bytes into the buffer
        data.withUnsafeBytes { rawPtr in
            guard let src = rawPtr.baseAddress else { return }
            if let dst = buffer.int16ChannelData?[0] {
                memcpy(dst, src, data.count)
            }
        }

        player.scheduleBuffer(buffer, completionHandler: nil)
    }
}
