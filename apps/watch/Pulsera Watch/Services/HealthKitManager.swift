import Foundation
import HealthKit
import Combine

final class HealthKitManager: ObservableObject {

    // MARK: - Published State

    @Published var latestData: HealthData?
    @Published var isAuthorized: Bool = false
    @Published var authorizationError: String?

    // MARK: - Private

    private let healthStore = HKHealthStore()
    private var heartRateQuery: HKAnchoredObjectQuery?
    private var hrvQuery: HKAnchoredObjectQuery?

    private var latestHeartRate: Double = 0
    private var latestHRV: Double = 0
    private var publishTimer: Timer?

    private let heartRateType = HKQuantityType.quantityType(forIdentifier: .heartRate)!
    private let hrvType = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!

    // MARK: - Authorization

    func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            authorizationError = "HealthKit is not available on this device."
            return
        }

        let readTypes: Set<HKObjectType> = [heartRateType, hrvType]

        healthStore.requestAuthorization(toShare: nil, read: readTypes) { [weak self] success, error in
            DispatchQueue.main.async {
                if success {
                    self?.isAuthorized = true
                    self?.startMonitoring()
                } else {
                    self?.authorizationError = error?.localizedDescription ?? "Authorization denied."
                }
            }
        }
    }

    // MARK: - Monitoring

    private func startMonitoring() {
        startHeartRateQuery()
        startHRVQuery()
        startPublishTimer()
    }

    func stopMonitoring() {
        if let query = heartRateQuery {
            healthStore.stop(query)
            heartRateQuery = nil
        }
        if let query = hrvQuery {
            healthStore.stop(query)
            hrvQuery = nil
        }
        publishTimer?.invalidate()
        publishTimer = nil
    }

    // MARK: - Heart Rate Anchored Query

    private func startHeartRateQuery() {
        let anchor = HKQueryAnchor.init(fromValue: 0)

        let query = HKAnchoredObjectQuery(
            type: heartRateType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, error in
            self?.processHeartRateSamples(samples)
        }

        query.updateHandler = { [weak self] _, samples, _, _, error in
            self?.processHeartRateSamples(samples)
        }

        heartRateQuery = query
        healthStore.execute(query)
    }

    private func processHeartRateSamples(_ samples: [HKSample]?) {
        guard let quantitySamples = samples as? [HKQuantitySample],
              let latest = quantitySamples.last else { return }

        let hr = latest.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))

        DispatchQueue.main.async { [weak self] in
            self?.latestHeartRate = hr
        }
    }

    // MARK: - HRV Anchored Query

    private func startHRVQuery() {
        let anchor = HKQueryAnchor.init(fromValue: 0)

        let query = HKAnchoredObjectQuery(
            type: hrvType,
            predicate: nil,
            anchor: anchor,
            limit: HKObjectQueryNoLimit
        ) { [weak self] _, samples, _, _, error in
            self?.processHRVSamples(samples)
        }

        query.updateHandler = { [weak self] _, samples, _, _, error in
            self?.processHRVSamples(samples)
        }

        hrvQuery = query
        healthStore.execute(query)
    }

    private func processHRVSamples(_ samples: [HKSample]?) {
        guard let quantitySamples = samples as? [HKQuantitySample],
              let latest = quantitySamples.last else { return }

        let hrv = latest.quantity.doubleValue(for: .secondUnit(with: .milli))

        DispatchQueue.main.async { [weak self] in
            self?.latestHRV = hrv
        }
    }

    // MARK: - Publish Timer (~5s)

    private func startPublishTimer() {
        publishTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.publishCurrentData()
        }
    }

    private func publishCurrentData() {
        let status = HealthData.statusFromHeartRate(latestHeartRate)
        let data = HealthData(
            heartRate: latestHeartRate,
            hrv: latestHRV,
            acceleration: 0.0,
            skinTemp: 0.0,
            status: status,
            timestamp: Date()
        )

        DispatchQueue.main.async { [weak self] in
            self?.latestData = data
        }
    }

    // MARK: - Simulator / Demo Support

    func injectSimulatedData(_ data: HealthData) {
        DispatchQueue.main.async {
            self.latestData = data
        }
    }

    // MARK: - Scripted Demo Heart Rate Simulation

    enum DemoSimPhase {
        case resting    // 55-60 bpm
        case rising     // climbing to 90-100 bpm
        case declining  // slowly dropping back to resting
    }

    private var demoTimer: Timer?
    private var demoHR: Double = 58
    @Published var demoSimPhase: DemoSimPhase = .resting

    func startDemoMode() {
        stopMonitoring() // don't use real HealthKit
        demoHR = Double.random(in: 55...60)
        demoSimPhase = .resting
        publishDemoData()

        demoTimer?.invalidate()
        demoTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.tickDemo()
        }
    }

    /// Gradually raises HR from resting (~55-60) to elevated over 5-7 seconds.
    /// Calls `onElevated` once when HR first crosses the elevated threshold (85 BPM).
    func startGradualRise(onElevated: (() -> Void)? = nil) {
        demoSimPhase = .rising
        var hasTriggered = false

        demoTimer?.invalidate()
        demoTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self else { timer.invalidate(); return }

            if self.demoHR < 130 {
                // ~4-7 BPM per second — reaches 85 (elevated) in about 5-6 seconds from 58
                self.demoHR += Double.random(in: 4...7)
                self.demoHR = min(self.demoHR, 135)
            } else {
                self.demoHR = 125 + Double.random(in: -3...5)
            }
            self.publishDemoData()

            if !hasTriggered && self.demoHR >= 85 {
                hasTriggered = true
                DispatchQueue.main.async {
                    onElevated?()
                }
            }
        }
    }

    func setDemoDecline() {
        demoSimPhase = .declining
    }

    private func tickDemo() {
        switch demoSimPhase {
        case .resting:
            demoHR = 57 + Double.random(in: -2...3)
        case .rising:
            if demoHR < 95 {
                demoHR += Double.random(in: 2.5...4.5)
                demoHR = min(demoHR, 100)
            } else {
                demoHR = 95 + Double.random(in: -2...3)
            }
        case .declining:
            if demoHR > 62 {
                demoHR -= Double.random(in: 0.8...2.0)
            } else {
                demoHR = 58 + Double.random(in: -1.5...1.5)
            }
        }
        publishDemoData()
    }

    private func publishDemoData() {
        let status: HealthStatus
        if demoHR >= 85 { status = .elevated }
        else if demoHR >= 70 { status = .normal }
        else { status = .normal }

        let data = HealthData(
            heartRate: demoHR,
            hrv: 45 + Double.random(in: -5...5),
            acceleration: 0.3,
            skinTemp: 36.5,
            status: status
        )
        DispatchQueue.main.async {
            self.latestData = data
        }
    }

    deinit {
        stopMonitoring()
        demoTimer?.invalidate()
    }
}
