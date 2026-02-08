import SwiftUI

struct CalmingMusicView: View {
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var audioPlayerManager: AudioPlayerManager
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    @State private var animateWaveform = false
    @State private var elapsedSeconds: Int = 0
    @State private var timer: Timer?

    var body: some View {
        ZStack {
            PulseraTheme.background.ignoresSafeArea()

            VStack(spacing: 10) {
                // Elapsed time
                Text(formattedElapsed)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(PulseraTheme.mutedForeground)

                Spacer()

                // Animated waveform bars
                HStack(spacing: 4) {
                    ForEach(0..<5, id: \.self) { index in
                        WaveformBar(
                            isAnimating: audioPlayerManager.isPlayingTrack,
                            barIndex: index
                        )
                    }
                }
                .frame(height: 50)

                // Track name
                Text(audioPlayerManager.currentTrack.name)
                    .font(.system(size: 15, weight: .semibold, design: .rounded))
                    .foregroundColor(PulseraTheme.accent)

                Text("You're safe")
                    .font(.system(size: 11, weight: .regular, design: .rounded))
                    .foregroundColor(PulseraTheme.mutedForeground.opacity(0.7))

                // Playback controls: previous / play-pause / next
                HStack(spacing: 20) {
                    Button {
                        audioPlayerManager.previousTrack()
                        hapticManager.playTap()
                    } label: {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 20))
                            .foregroundColor(PulseraTheme.accent)
                    }
                    .buttonStyle(.plain)

                    Button {
                        togglePlayback()
                    } label: {
                        Image(systemName: audioPlayerManager.isPlayingTrack ? "pause.circle.fill" : "play.circle.fill")
                            .font(.system(size: 36))
                            .foregroundColor(PulseraTheme.accent)
                    }
                    .buttonStyle(.plain)

                    Button {
                        audioPlayerManager.nextTrack()
                        hapticManager.playTap()
                    } label: {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 20))
                            .foregroundColor(PulseraTheme.accent)
                    }
                    .buttonStyle(.plain)
                }

                Spacer()

                // Heart rate pill
                if let hr = healthKitManager.latestData?.heartRate {
                    HeartRatePill(heartRate: hr)
                        .padding(.bottom, 4)
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 4)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(
                                LinearGradient(
                                    colors: [PulseraTheme.accent, PulseraTheme.accent],
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

    private var formattedElapsed: String {
        let minutes = elapsedSeconds / 60
        let seconds = elapsedSeconds % 60
        return minutes > 0 ? "\(minutes):\(String(format: "%02d", seconds))" : "\(seconds)s"
    }

    private func togglePlayback() {
        if audioPlayerManager.isPlayingTrack {
            audioPlayerManager.stopCalmingTrack()
        } else {
            audioPlayerManager.playCalmingTrack(audioPlayerManager.currentTrack)
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
                    colors: [PulseraTheme.accent, PulseraTheme.accent],
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
        .environmentObject(HealthKitManager())
}
