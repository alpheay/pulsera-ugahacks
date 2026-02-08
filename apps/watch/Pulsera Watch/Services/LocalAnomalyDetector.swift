import Foundation
import Combine

// MARK: - Anomaly Types

enum AnomalyType: String, CaseIterable {
    case none
    case sustainedElevatedHR = "sustained_elevated_hr"
    case suddenHRVDrop = "sudden_hrv_drop"
    case erraticMovement = "erratic_movement"
    case suddenStillness = "sudden_stillness"
    case fallDetected = "fall_detected"

    var displayName: String {
        switch self {
        case .none: return "None"
        case .sustainedElevatedHR: return "Elevated Heart Rate"
        case .suddenHRVDrop: return "HRV Drop"
        case .erraticMovement: return "Erratic Movement"
        case .suddenStillness: return "Sudden Stillness"
        case .fallDetected: return "Fall Detected"
        }
    }
}

// MARK: - Local Anomaly Detector

final class LocalAnomalyDetector: ObservableObject {

    @Published var isAnomalyDetected: Bool = false
    @Published var anomalyType: AnomalyType = .none

    // Sliding windows (~5s per reading, 30 readings ≈ 2.5 min)
    private var hrHistory: [Double] = []
    private var hrvHistory: [Double] = []
    private var accelHistory: [Double] = []

    private let maxHistorySize = 30

    // Thresholds
    private let sustainedHRThreshold: Double = 110
    private let hrvDropRatio: Double = 0.5
    private let accelVarianceThreshold: Double = 2.0
    private let stillnessThreshold: Double = 0.15
    private let fallAccelThreshold: Double = 3.0

    // Cooldown to avoid rapid re-triggering
    private var lastAnomalyTime: Date = .distantPast
    private let cooldownInterval: TimeInterval = 30

    func processReading(_ data: HealthData) {
        hrHistory.append(data.heartRate)
        hrvHistory.append(data.hrv)
        accelHistory.append(data.acceleration)

        // Keep history bounded
        if hrHistory.count > maxHistorySize { hrHistory.removeFirst() }
        if hrvHistory.count > maxHistorySize { hrvHistory.removeFirst() }
        if accelHistory.count > maxHistorySize { accelHistory.removeFirst() }

        // Only check after cooldown
        guard Date().timeIntervalSince(lastAnomalyTime) >= cooldownInterval else { return }

        if let detected = checkForAnomaly() {
            DispatchQueue.main.async {
                self.isAnomalyDetected = true
                self.anomalyType = detected
                self.lastAnomalyTime = Date()
            }
        }
    }

    func checkForAnomaly() -> AnomalyType? {
        // Rule 1: Sustained elevated HR (last 6 readings > threshold and not decreasing)
        if hrHistory.count >= 6 {
            let recent = Array(hrHistory.suffix(6))
            let avg = recent.reduce(0, +) / Double(recent.count)
            let isDecreasing = recent.last ?? 0 < recent.first ?? 0

            if avg > sustainedHRThreshold && !isDecreasing {
                return .sustainedElevatedHR
            }
        }

        // Rule 2: Sudden HRV drop (current < 50% of 2-minute average)
        if hrvHistory.count >= 12 {
            let longAvg = Array(hrvHistory.suffix(24)).reduce(0, +) / Double(min(hrvHistory.count, 24))
            let current = hrvHistory.last ?? 0

            if current > 0 && longAvg > 0 && current < longAvg * hrvDropRatio {
                return .suddenHRVDrop
            }
        }

        // Rule 3: Fall detection (accel spike > 3g followed by stillness)
        if accelHistory.count >= 4 {
            let recent = Array(accelHistory.suffix(4))
            let peak = recent.max() ?? 0
            let last = recent.last ?? 0

            if peak > fallAccelThreshold && last < stillnessThreshold {
                return .fallDetected
            }
        }

        // Rule 4: Erratic movement (high variance in acceleration)
        if accelHistory.count >= 10 {
            let recent = Array(accelHistory.suffix(10))
            let mean = recent.reduce(0, +) / Double(recent.count)
            let variance = recent.map { pow($0 - mean, 2) }.reduce(0, +) / Double(recent.count)

            if variance > accelVarianceThreshold {
                return .erraticMovement
            }
        }

        // Rule 5: Sudden stillness after movement
        if accelHistory.count >= 12 {
            let earlier = Array(accelHistory.prefix(accelHistory.count - 6))
            let recent = Array(accelHistory.suffix(6))

            let earlierAvg = earlier.reduce(0, +) / max(Double(earlier.count), 1)
            let recentAvg = recent.reduce(0, +) / max(Double(recent.count), 1)

            if earlierAvg > 0.5 && recentAvg < stillnessThreshold {
                return .suddenStillness
            }
        }

        return nil
    }

    func reset() {
        DispatchQueue.main.async {
            self.isAnomalyDetected = false
            self.anomalyType = .none
        }
        hrHistory.removeAll()
        hrvHistory.removeAll()
        accelHistory.removeAll()
    }
}
