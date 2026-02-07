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

    // MARK: - Calming Tone Generator

    private var toneEngine: AVAudioEngine?
    private var toneSourceNode: AVAudioSourceNode?
    private var tonePhase: Double = 0.0

    @Published var isPlayingTone = false
    @Published var currentFrequency: Double = 432.0

    static let calmingFrequencies: [(hz: Double, name: String)] = [
        (432.0, "Deep Calm"),
        (528.0, "Healing"),
        (396.0, "Anxiety Relief"),
    ]

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

    // MARK: - Calming Tone Playback

    func playCalmingTone(frequency: Double) {
        stopCalmingTone()

        let sampleRate: Double = 44100.0
        tonePhase = 0.0

        DispatchQueue.main.async {
            self.currentFrequency = frequency
        }

        let engine = AVAudioEngine()
        let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!

        let sourceNode = AVAudioSourceNode { [weak self] _, _, frameCount, audioBufferList -> OSStatus in
            guard let self = self else { return noErr }
            let ablPointer = UnsafeMutableAudioBufferListPointer(audioBufferList)
            let phaseIncrement = 2.0 * Double.pi * frequency / sampleRate

            for frame in 0..<Int(frameCount) {
                let sample = Float(sin(self.tonePhase) * 0.3)
                for buffer in ablPointer {
                    let buf = UnsafeMutableBufferPointer<Float>(buffer)
                    buf[frame] = sample
                }
                self.tonePhase += phaseIncrement
                if self.tonePhase >= 2.0 * Double.pi {
                    self.tonePhase -= 2.0 * Double.pi
                }
            }
            return noErr
        }

        engine.attach(sourceNode)
        engine.connect(sourceNode, to: engine.mainMixerNode, format: format)

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
            try engine.start()
            self.toneEngine = engine
            self.toneSourceNode = sourceNode
            DispatchQueue.main.async {
                self.isPlayingTone = true
            }
        } catch {
            print("AudioPlayerManager: Failed to start tone engine — \(error)")
        }
    }

    func stopCalmingTone() {
        toneEngine?.stop()
        if let node = toneSourceNode {
            toneEngine?.detach(node)
        }
        toneEngine = nil
        toneSourceNode = nil
        tonePhase = 0.0
        DispatchQueue.main.async {
            self.isPlayingTone = false
        }
    }
}
