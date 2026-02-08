import Foundation

// MARK: - Health Status

enum HealthStatus: String, Codable, Equatable {
    case normal
    case elevated
    case critical

    var displayName: String {
        switch self {
        case .normal: return "Normal"
        case .elevated: return "Elevated"
        case .critical: return "Critical"
        }
    }
}

// MARK: - Health Data

struct HealthData: Equatable, Identifiable {
    let id: UUID
    let heartRate: Double
    let hrv: Double
    let acceleration: Double
    let skinTemp: Double
    let status: HealthStatus
    let timestamp: Date

    init(
        heartRate: Double,
        hrv: Double,
        acceleration: Double = 0.0,
        skinTemp: Double = 0.0,
        status: HealthStatus = .normal,
        timestamp: Date = Date()
    ) {
        self.id = UUID()
        self.heartRate = heartRate
        self.hrv = hrv
        self.acceleration = acceleration
        self.skinTemp = skinTemp
        self.status = status
        self.timestamp = timestamp
    }

    /// Determine status from heart rate thresholds.
    static func statusFromHeartRate(_ hr: Double) -> HealthStatus {
        if hr >= 150 || hr <= 40 {
            return .critical
        } else if hr >= 120 || hr <= 50 {
            return .elevated
        }
        return .normal
    }

    /// Encode to JSON dictionary for WebSocket transmission.
    func toJSON() -> [String: Any] {
        return [
            "heartRate": heartRate,
            "hrv": hrv,
            "acceleration": acceleration,
            "skinTemp": skinTemp,
            "status": status.rawValue,
            "timestamp": ISO8601DateFormatter().string(from: timestamp)
        ]
    }
}
