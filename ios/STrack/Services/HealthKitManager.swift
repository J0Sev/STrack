import Foundation
import HealthKit

/// Wraps all HealthKit access: authorization + reading sleep-analysis samples.
/// Sleep data on Apple Watch requires a real device — the simulator has no sleep samples.
final class HealthKitManager: ObservableObject {
    private let store = HKHealthStore()

    @Published var isAuthorized = false
    @Published var lastError: String?

    private let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
    private let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate)!
    private let respiratoryRateType = HKObjectType.quantityType(forIdentifier: .respiratoryRate)!

    var isHealthDataAvailable: Bool { HKHealthStore.isHealthDataAvailable() }

    func requestAuthorization() async {
        guard isHealthDataAvailable else {
            await MainActor.run { self.lastError = "Health data is not available on this device." }
            return
        }

        let readTypes: Set<HKObjectType> = [sleepType, heartRateType, respiratoryRateType]

        do {
            try await store.requestAuthorization(toShare: [], read: readTypes)
            await MainActor.run { self.isAuthorized = true }
        } catch {
            await MainActor.run { self.lastError = error.localizedDescription }
        }
    }

    /// Fetches sleep-analysis samples for the last `days` days and aggregates them into SleepSessions.
    /// Naive aggregation: groups overlapping/adjacent samples into one session per "night".
    func fetchRecentSleepSessions(days: Int = 14) async throws -> [SleepSession] {
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -days, to: end)!
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        let samples: [HKCategorySample] = try await withCheckedThrowingContinuation { continuation in
            let query = HKSampleQuery(
                sampleType: sleepType,
                predicate: predicate,
                limit: HKObjectQueryNoLimit,
                sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)]
            ) { _, results, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: (results as? [HKCategorySample]) ?? [])
                }
            }
            store.execute(query)
        }

        return Self.groupIntoSessions(samples)
    }

    /// Groups raw category samples (asleepCore/Deep/REM/awake/inBed) into per-night SleepSession objects.
    /// Samples more than 2 hours apart are treated as separate nights.
    static func groupIntoSessions(_ samples: [HKCategorySample]) -> [SleepSession] {
        guard !samples.isEmpty else { return [] }

        var sessions: [[HKCategorySample]] = []
        var current: [HKCategorySample] = [samples[0]]

        for sample in samples.dropFirst() {
            if let last = current.last, sample.startDate.timeIntervalSince(last.endDate) > 2 * 3600 {
                sessions.append(current)
                current = [sample]
            } else {
                current.append(sample)
            }
        }
        sessions.append(current)

        return sessions.map { group in
            var total: TimeInterval = 0
            var inBed: TimeInterval = 0
            var core: TimeInterval = 0
            var deep: TimeInterval = 0
            var rem: TimeInterval = 0
            var awake: TimeInterval = 0

            for sample in group {
                let duration = sample.endDate.timeIntervalSince(sample.startDate)
                inBed += duration

                switch HKCategoryValueSleepAnalysis(rawValue: sample.value) {
                case .asleepCore:
                    core += duration; total += duration
                case .asleepDeep:
                    deep += duration; total += duration
                case .asleepREM:
                    rem += duration; total += duration
                case .asleepUnspecified:
                    total += duration
                case .awake:
                    awake += duration
                default:
                    break
                }
            }

            return SleepSession(
                id: UUID(),
                startDate: group.first!.startDate,
                endDate: group.last!.endDate,
                totalDuration: total,
                timeInBed: inBed,
                coreDuration: core > 0 ? core : nil,
                deepDuration: deep > 0 ? deep : nil,
                remDuration: rem > 0 ? rem : nil,
                awakeDuration: awake > 0 ? awake : nil
            )
        }
    }
}
