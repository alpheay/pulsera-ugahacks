import Foundation
import WatchKit

final class HapticManager: ObservableObject {

    enum AlertLevel {
        case elevated
        case critical
        case groupAlert
    }

    // Throttle haptics so they don't fire too frequently.
    private var lastHapticTime: Date = .distantPast
    private let minimumInterval: TimeInterval = 3.0

    func playAlert(level: AlertLevel) {
        let now = Date()
        guard now.timeIntervalSince(lastHapticTime) >= minimumInterval else { return }
        lastHapticTime = now

        let device = WKInterfaceDevice.current()

        switch level {
        case .elevated:
            device.play(.notification)

        case .critical:
            // Play a sequence for critical: two strong haptics.
            device.play(.directionUp)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                device.play(.directionUp)
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                device.play(.failure)
            }

        case .groupAlert:
            device.play(.retry)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                device.play(.notification)
            }
        }
    }

    /// Light tap for UI confirmations.
    func playTap() {
        WKInterfaceDevice.current().play(.click)
    }
}
