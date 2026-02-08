import SwiftUI

struct PhoneCheckView: View {
    @EnvironmentObject var episodeManager: EpisodeManager
    @EnvironmentObject var hapticManager: HapticManager

    @State private var phoneIconOffset: CGFloat = 0
    @State private var showSkip = false

    var body: some View {
        ZStack {
            PulseraTheme.background.ignoresSafeArea()

            VStack(spacing: 14) {
                Spacer()

                // Animated phone icon
                Image(systemName: "iphone.radiowaves.left.and.right")
                    .font(.system(size: 40))
                    .foregroundColor(PulseraTheme.accent)
                    .offset(y: phoneIconOffset)
                    .onAppear {
                        withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                            phoneIconOffset = -8
                        }
                    }

                Text("Quick Check-In")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(PulseraTheme.foreground)

                Text("I'd like to check on\nyou a bit more.")
                    .font(.system(size: 13, weight: .regular, design: .rounded))
                    .foregroundColor(PulseraTheme.mutedForeground)
                    .multilineTextAlignment(.center)

                Text("Open your phone for a\nquick visual check-in.")
                    .font(.system(size: 12, weight: .medium, design: .rounded))
                    .foregroundColor(PulseraTheme.accent.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)

                Spacer()

                if episodeManager.currentPhase == .waitingForPhone {
                    HStack(spacing: 6) {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(PulseraTheme.accent)
                            .scaleEffect(0.7)
                        Text("Waiting for phone...")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(PulseraTheme.mutedForeground)
                    }
                } else {
                    // Skip button
                    Button(action: {
                        hapticManager.playTap()
                        episodeManager.skipPhoneCheck()
                    }) {
                        Text("Skip")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(PulseraTheme.mutedForeground)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 8)
                            .background(PulseraTheme.glassBg)
                            .cornerRadius(20)
                    }
                    .buttonStyle(.plain)
                    .opacity(showSkip ? 1 : 0)
                    .onAppear {
                        // Show skip button after a delay
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            withAnimation(.easeIn(duration: 0.3)) {
                                showSkip = true
                            }
                        }
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .onAppear {
            hapticManager.playBreathing(phase: .phoneCheckRequest)
        }
    }
}

#Preview {
    PhoneCheckView()
        .environmentObject(EpisodeManager())
        .environmentObject(HapticManager())
}
