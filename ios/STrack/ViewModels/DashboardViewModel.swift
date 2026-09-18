import Foundation

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var recentSessions: [SleepSession] = []
    @Published var activeGoal: SleepGoal?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let healthKit: HealthKitManager
    private let api = APIClient.shared

    init(healthKit: HealthKitManager) {
        self.healthKit = healthKit
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        do {
            if !healthKit.isAuthorized {
                await healthKit.requestAuthorization()
            }
            let sessions = try await healthKit.fetchRecentSleepSessions(days: 14)
            recentSessions = sessions.sorted { $0.startDate > $1.startDate }

            try await api.syncSleepSessions(sessions)
            activeGoal = try await api.fetchGoal()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    /// Whether last night's session met the active goal.
    var lastNightStatus: GoalStatus {
        guard let goal = activeGoal else { return .noData }
        guard let last = recentSessions.first else { return .noData }
        return last.durationHours >= goal.targetDurationHours ? .met : .missed
    }

    var sevenDayAverageHours: Double {
        let last7 = recentSessions.prefix(7)
        guard !last7.isEmpty else { return 0 }
        return last7.reduce(0) { $0 + $1.durationHours } / Double(last7.count)
    }
}
