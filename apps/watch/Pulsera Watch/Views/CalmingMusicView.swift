import SwiftUI

struct CalmingMusicView: View {
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var audioPlayerManager: AudioPlayerManager
    @EnvironmentObject var hapticManager: HapticManager

    @State private var animateWaveform = false
    @State private var elapsedSeconds: Int = 0
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 10) {
                // Elapsed time
                Text(formattedElapsed)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(.gray)

                Spacer()

                // Animated waveform bars
                HStack(spacing: 4) {
                    ForEach(0..<5, id: \.self) { index in
                        WaveformBar(
                            isAnimating: audioPlayerManager.isPlayingTone,
                            barIndex: index
                        )
                    }
                }
                .frame(height: 50)

                // Frequency label
                Text("\(Int(audioPlayerManager.currentFrequency)) Hz — \(currentToneName)")
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundColor(.purple)

                Text("You're safe")
                    .font(.system(size: 11, weight: .regular, design: .rounded))
                    .foregroundColor(.gray.opacity(0.7))

                // Play / Pause button
                Button {
                    togglePlayback()
                } label: {
                    Image(systemName: audioPlayerManager.isPlayingTone ? "pause.circle.fill" : "play.circle.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.purple)
                }
                .buttonStyle(.plain)

                Spacer()

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 4)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    colors: [.purple, .indigo],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * episodeManager.breathingProgress, height: 4)
                            .animation(.linear(duration: 0.5), value: episodeManager.breathingProgress)
                    }
                }
                .frame(height: 4)
                .padding(.horizontal, 20)
            }
            .padding(.vertical, 16)
        }
        .onAppear {
            startElapsedTimer()
        }
        .onDisappear {
            timer?.invalidate()
            timer = nil
        }
    }

    // MARK: - Helpers

    private var currentToneName: String {
        AudioPlayerManager.calmingFrequencies
            .first { $0.hz == audioPlayerManager.currentFrequency }?
            .name ?? "Calm"
    }

    private var formattedElapsed: String {
        let minutes = elapsedSeconds / 60
        let seconds = elapsedSeconds % 60
        return minutes > 0 ? "\(minutes):\(String(format: "%02d", seconds))" : "\(seconds)s"
    }

    private func togglePlayback() {
        if audioPlayerManager.isPlayingTone {
            audioPlayerManager.stopCalmingTone()
        } else {
            audioPlayerManager.playCalmingTone(frequency: audioPlayerManager.currentFrequency)
        }
        hapticManager.playTap()
    }

    private func startElapsedTimer() {
        elapsedSeconds = 0
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            elapsedSeconds += 1
        }
    }
}

// MARK: - Waveform Bar

private struct WaveformBar: View {
    let isAnimating: Bool
    let barIndex: Int

    @State private var height: CGFloat = 8

    private var minHeight: CGFloat { 8 }
    private var maxHeight: CGFloat { 40 }
    private var speed: Double { 0.4 + Double(barIndex) * 0.15 }

    var body: some View {
        RoundedRectangle(cornerRadius: 3)
            .fill(
                LinearGradient(
                    colors: [.purple, .indigo],
                    startPoint: .bottom,
                    endPoint: .top
                )
            )
            .frame(width: 6, height: height)
            .onAppear {
                if isAnimating { animate() }
            }
            .onChange(of: isAnimating) { _, playing in
                if playing {
                    animate()
                } else {
                    withAnimation(.easeOut(duration: 0.3)) {
                        height = minHeight
                    }
                }
            }
    }

    private func animate() {
        guard isAnimating else { return }
        withAnimation(.easeInOut(duration: speed)) {
            height = CGFloat.random(in: minHeight...maxHeight)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + speed) {
            animate()
        }
    }
}

#Preview {
    CalmingMusicView()
        .environmentObject(EpisodeManager())
        .environmentObject(AudioPlayerManager())
        .environmentObject(HapticManager())
}
