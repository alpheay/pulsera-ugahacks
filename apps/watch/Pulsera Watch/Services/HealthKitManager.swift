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

    deinit {
        stopMonitoring()
    }
}
