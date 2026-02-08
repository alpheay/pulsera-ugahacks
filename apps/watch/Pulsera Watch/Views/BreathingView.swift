import SwiftUI

struct BreathingView: View {
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var hapticManager: HapticManager
    @EnvironmentObject var elevenLabsManager: ElevenLabsManager
    @EnvironmentObject var healthKitManager: HealthKitManager

    @State private var breatheIn = true
    @State private var circleScale: CGFloat = 0.6
    @State private var opacity: Double = 0.6

    // Breathing timing: 4s inhale, 6s exhale
    private let inhaleTime: Double = 4.0
    private let exhaleTime: Double = 6.0

    var body: some View {
        ZStack {
            PulseraTheme.background.ignoresSafeArea()

            VStack(spacing: 10) {
                // Remaining time
                Text(timeRemaining)
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(PulseraTheme.mutedForeground)

                Spacer()

                // Breathing circle
                ZStack {
                    // Outer glow
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [breatheIn ? PulseraTheme.accent.opacity(0.3) : PulseraTheme.accent.opacity(0.15), .clear],
                                center: .center,
                                startRadius: 20,
                                endRadius: 80
                            )
                        )
                        .frame(width: 140, height: 140)
                        .scaleEffect(circleScale)

                    // Main circle
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: breatheIn
                                    ? [PulseraTheme.accent.opacity(0.7), PulseraTheme.accent.opacity(0.4)]
                                    : [PulseraTheme.accent.opacity(0.4), PulseraTheme.accent.opacity(0.25)],
                                startPoint: .top,
                                endPoint: .bottom
                            )
                        )
                        .frame(width: 100, height: 100)
                        .scaleEffect(circleScale)
                        .opacity(opacity)
                }

                // Instruction text
                Text(breatheIn ? "Breathe in..." : "Breathe out...")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundColor(PulseraTheme.accent)
                    .animation(.easeInOut(duration: 0.5), value: breatheIn)

                Text("You're doing great")
                    .font(.system(size: 11, weight: .regular, design: .rounded))
                    .foregroundColor(PulseraTheme.mutedForeground.opacity(0.7))

                Spacer()

                // Heart rate pill
                if let hr = healthKitManager.latestData?.heartRate {
                    HeartRatePill(heartRate: hr)
                        .padding(.bottom, 4)
                }

                // ElevenLabs status
                HStack(spacing: 4) {
                    Circle()
                        .fill(elevenLabsManager.isConnected ? PulseraTheme.accent : PulseraTheme.mutedForeground)
                        .frame(width: 6, height: 6)
                    Text(elevenLabsManager.isConnected ? "Voice active" : "Connecting...")
                        .font(.system(size: 9, design: .rounded))
                        .foregroundColor(PulseraTheme.mutedForeground)
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 3)
                            .fill(Color.white.opacity(0.1))
                            .frame(height: 4)

                        RoundedRectangle(cornerRadius: 3)
                            .fill(PulseraTheme.accent)
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
            startBreathingCycle()
        }
        .onDisappear {
            // Cleanup handled by EpisodeManager
        }
    }

    private var timeRemaining: String {
        let remaining = max(0, Int((1 - episodeManager.breathingProgress) * 30))
        let minutes = remaining / 60
        let seconds = remaining % 60
        return minutes > 0 ? "\(minutes):\(String(format: "%02d", seconds))" : "\(seconds)s left"
    }

    private func startBreathingCycle() {
        breatheCycle()
    }

    private func breatheCycle() {
        guard episodeManager.currentPhase == .calming else { return }

        // Inhale
        breatheIn = true
        hapticManager.playBreathing(phase: .breatheIn)
        elevenLabsManager.sendBreathingCue(breatheIn: true)

        withAnimation(.easeInOut(duration: inhaleTime)) {
            circleScale = 1.0
            opacity = 0.9
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + inhaleTime) { [self] in
            guard episodeManager.currentPhase == .calming else { return }

            // Exhale
            breatheIn = false
            hapticManager.playBreathing(phase: .breatheOut)
            elevenLabsManager.sendBreathingCue(breatheIn: false)

            withAnimation(.easeInOut(duration: exhaleTime)) {
                circleScale = 0.6
                opacity = 0.6
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + exhaleTime) {
                breatheCycle()
            }
        }
    }
}

#Preview {
    BreathingView()
        .environmentObject(EpisodeManager())
        .environmentObject(HapticManager())
        .environmentObject(ElevenLabsManager())
        .environmentObject(HealthKitManager())
}
