import SwiftUI

struct StatusView: View {
    let connectionState: ConnectionState
    let anomalyScore: Double?

    @State private var uptimeSeconds: Int = 0
    @State private var uptimeTimer: Timer?

    var body: some View {
        VStack(spacing: 8) {
            // Connection status row
            connectionRow

            // Uptime counter
            uptimeRow

            // Anomaly score bar
            if let score = anomalyScore {
                anomalyBar(score: score)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(PulseraTheme.glassBg)
        )
        .onAppear {
            startUptimeTimer()
        }
        .onDisappear {
            uptimeTimer?.invalidate()
            uptimeTimer = nil
        }
    }

    // MARK: - Connection Row

    private var connectionRow: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(connectionDotColor)
                .frame(width: 8, height: 8)

            Text(connectionState.displayText)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(PulseraTheme.mutedForeground)
                .lineLimit(1)

            Spacer()
        }
    }

    private var connectionDotColor: Color {
        switch connectionState {
        case .connected:    return PulseraTheme.safe
        case .connecting:   return PulseraTheme.warning
        case .disconnected: return PulseraTheme.mutedForeground
        case .error:        return PulseraTheme.danger
        }
    }

    // MARK: - Uptime Row

    private var uptimeRow: some View {
        HStack(spacing: 6) {
            Image(systemName: "timer")
                .font(.system(size: 9))
                .foregroundColor(PulseraTheme.mutedForeground)

            Text(formattedUptime)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundColor(PulseraTheme.mutedForeground)
                .monospacedDigit()

            Spacer()
        }
    }

    private var formattedUptime: String {
        let minutes = uptimeSeconds / 60
        let seconds = uptimeSeconds % 60
        if minutes > 0 {
            return "\(minutes)m \(String(format: "%02d", seconds))s"
        }
        return "\(seconds) sec"
    }

    private func startUptimeTimer() {
        uptimeTimer?.invalidate()
        uptimeTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            uptimeSeconds += 1
        }
    }

    // MARK: - Anomaly Score Bar

    private func anomalyBar(score: Double) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text("Anomaly")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(PulseraTheme.mutedForeground)

                Spacer()

                Text(String(format: "%.0f%%", score * 100))
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundColor(anomalyColor(for: score))
                    .monospacedDigit()
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 6)

                    // Filled portion
                    RoundedRectangle(cornerRadius: 3)
                        .fill(anomalyColor(for: score))
                        .frame(width: geometry.size.width * CGFloat(min(score, 1.0)), height: 6)
                        .animation(.easeInOut(duration: 0.5), value: score)
                }
            }
            .frame(height: 6)
        }
    }

    private func anomalyColor(for score: Double) -> Color {
        if score >= 0.8 {
            return PulseraTheme.danger
        } else if score >= 0.5 {
            return PulseraTheme.warning
        }
        return PulseraTheme.safe
    }

}

#Preview {
    ScrollView {
        VStack(spacing: 12) {
            StatusView(
                connectionState: .connected,
                anomalyScore: 0.23
            )
            StatusView(
                connectionState: .connecting,
                anomalyScore: 0.67
            )
            StatusView(
                connectionState: .error("Timeout"),
                anomalyScore: 0.92
            )
        }
    }
}
