import SwiftUI

struct PulseRingView: View {
    let status: HealthStatus

    @State private var outerScale: CGFloat = 1.0
    @State private var middleScale: CGFloat = 1.0
    @State private var innerScale: CGFloat = 1.0
    @State private var outerOpacity: Double = 0.3
    @State private var middleOpacity: Double = 0.5
    @State private var innerOpacity: Double = 0.7

    private var ringColor: Color {
        switch status {
        case .normal:   return PulseraTheme.safe
        case .elevated: return PulseraTheme.warning
        case .critical: return PulseraTheme.danger
        }
    }

    private var animationSpeed: Double {
        switch status {
        case .normal:   return 2.0
        case .elevated: return 1.2
        case .critical: return 0.6
        }
    }

    var body: some View {
        ZStack {
            // Outer ring
            Circle()
                .stroke(ringColor.opacity(outerOpacity), lineWidth: 4)
                .scaleEffect(outerScale)
                .frame(width: 90, height: 90)

            // Middle ring
            Circle()
                .stroke(ringColor.opacity(middleOpacity), lineWidth: 5)
                .scaleEffect(middleScale)
                .frame(width: 65, height: 65)

            // Inner filled circle
            Circle()
                .fill(
                    RadialGradient(
                        gradient: Gradient(colors: [
                            ringColor.opacity(0.8),
                            ringColor.opacity(0.3)
                        ]),
                        center: .center,
                        startRadius: 2,
                        endRadius: 25
                    )
                )
                .scaleEffect(innerScale)
                .frame(width: 40, height: 40)

            // Center icon
            Image(systemName: "waveform.path.ecg")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
        }
        .onAppear {
            startAnimation()
        }
        .onChange(of: status) { _, _ in
            startAnimation()
        }
    }

    private func startAnimation() {
        let speed = animationSpeed

        // Outer ring pulse
        withAnimation(
            .easeInOut(duration: speed)
            .repeatForever(autoreverses: true)
        ) {
            outerScale = 1.15
            outerOpacity = 0.15
        }

        // Middle ring pulse (slightly offset)
        withAnimation(
            .easeInOut(duration: speed * 0.8)
            .repeatForever(autoreverses: true)
            .delay(speed * 0.15)
        ) {
            middleScale = 1.1
            middleOpacity = 0.3
        }

        // Inner circle pulse
        withAnimation(
            .easeInOut(duration: speed * 0.6)
            .repeatForever(autoreverses: true)
            .delay(speed * 0.3)
        ) {
            innerScale = 1.08
            innerOpacity = 0.5
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        PulseRingView(status: .normal)
        PulseRingView(status: .elevated)
        PulseRingView(status: .critical)
    }
}
