import SwiftUI

struct DemoResolvedOverlay: View {
    @ObservedObject var watchState: WatchState
    var onSendPulse: () -> Void
    var onDismiss: () -> Void

    var body: some View {
        ZStack {
            GradientBackground(style: .watchFace)

            VStack(spacing: 10) {
                Spacer()

                // Animated green pulse ring
                SafePulseRing()
                    .frame(height: 80)

                Text("You're Safe")
                    .font(.system(size: DesignConstants.Typography.headlineSize, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("\(watchState.demoHeartRate) BPM")
                    .font(.system(size: DesignConstants.Typography.captionSize, weight: .medium, design: .rounded))
                    .foregroundColor(.green.opacity(0.8))

                // Send Pulse button
                Button {
                    onSendPulse()
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: watchState.pulseSent ? "checkmark.circle.fill" : "heart.circle.fill")
                            .font(.system(size: 14))
                        Text(watchState.pulseSent ? "Sent!" : "Send Pulse")
                            .font(.system(size: DesignConstants.Typography.captionSize, weight: .semibold, design: .rounded))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(
                        Capsule()
                            .fill(watchState.pulseSent ? Color.green.opacity(0.5) : Color.purple.opacity(0.7))
                    )
                }
                .disabled(watchState.pulseSent)
                .padding(.horizontal, 20)

                Spacer()

                // Dismiss button
                Button {
                    onDismiss()
                } label: {
                    Text("Done")
                        .font(.system(size: DesignConstants.Typography.smallSize, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.6))
                }
                .padding(.bottom, 8)
            }
        }
    }
}

// MARK: - Green pulse ring animation

private struct SafePulseRing: View {
    @State private var outerScale: CGFloat = 1.0
    @State private var middleScale: CGFloat = 1.0
    @State private var innerScale: CGFloat = 1.0

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.green.opacity(0.2), lineWidth: 3)
                .scaleEffect(outerScale)
                .frame(width: 65, height: 65)

            Circle()
                .stroke(Color.green.opacity(0.4), lineWidth: 4)
                .scaleEffect(middleScale)
                .frame(width: 45, height: 45)

            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [
                            Color.green.opacity(0.7),
                            Color.green.opacity(0.2)
                        ]),
                        center: .center,
                        startRadius: 2,
                        endRadius: 16
                    )
                )
                .scaleEffect(innerScale)
                .frame(width: 28, height: 28)

            Image(systemName: "checkmark")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(.white)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
                outerScale = 1.15
            }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true).delay(0.2)) {
                middleScale = 1.1
            }
            withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true).delay(0.4)) {
                innerScale = 1.08
            }
        }
    }
}
