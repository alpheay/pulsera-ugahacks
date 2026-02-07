import SwiftUI

struct HeartRateView: View {
    let heartRate: Double
    let status: HealthStatus

    @State private var heartScale: CGFloat = 1.0

    private let amberColor = Color(red: 245/255, green: 158/255, blue: 11/255)

    private var heartColor: Color {
        switch status {
        case .normal:   return .green
        case .elevated: return amberColor
        case .critical: return .red
        }
    }

    private var beatSpeed: Double {
        guard heartRate > 0 else { return 1.0 }
        return 60.0 / heartRate
    }

    var body: some View {
        HStack(spacing: 8) {
            // Animated heart icon
            Image(systemName: "heart.fill")
                .font(.system(size: 22))
                .foregroundColor(heartColor)
                .scaleEffect(heartScale)
                .onAppear { startHeartbeat() }
                .onChange(of: heartRate) { _, _ in startHeartbeat() }

            VStack(alignment: .leading, spacing: 0) {
                // Large HR number
                Text(heartRate > 0 ? "\(Int(heartRate))" : "--")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .monospacedDigit()

                Text("BPM")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(.gray)
                    .textCase(.uppercase)
            }
        }
        .padding(.vertical, 4)
    }

    private func startHeartbeat() {
        // Reset
        heartScale = 1.0

        guard heartRate > 0 else { return }

        let interval = beatSpeed

        withAnimation(
            .easeInOut(duration: interval * 0.3)
            .repeatForever(autoreverses: true)
        ) {
            heartScale = 1.25
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        HeartRateView(heartRate: 72, status: .normal)
        HeartRateView(heartRate: 130, status: .elevated)
        HeartRateView(heartRate: 165, status: .critical)
        HeartRateView(heartRate: 0, status: .normal)
    }
}
