import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel: DashboardViewModel
    @State private var showingCheckIn = false

    init(healthKit: HealthKitManager) {
        _viewModel = StateObject(wrappedValue: DashboardViewModel(healthKit: healthKit))
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Last Night") {
                    if let last = viewModel.recentSessions.first {
                        LabeledContent("Duration", value: String(format: "%.1f hrs", last.durationHours))
                        LabeledContent("Status", value: statusLabel)
                            .foregroundStyle(statusColor)

                        if viewModel.lastNightStatus == .missed {
                            Button("Log what happened last night") {
                                showingCheckIn = true
                            }
                        }
                    } else if viewModel.isLoading {
                        ProgressView()
                    } else {
                        Text("No sleep data yet. Pull to refresh.")
                            .foregroundStyle(.secondary)
                    }
                }

                Section("7-Day Trend") {
                    LabeledContent("Average", value: String(format: "%.1f hrs", viewModel.sevenDayAverageHours))
                    if let goal = viewModel.activeGoal {
                        LabeledContent("Goal", value: String(format: "%.1f hrs", goal.targetDurationHours))
                    } else {
                        NavigationLink("Set a sleep goal") {
                            GoalSettingView()
                        }
                    }
                }

                if let error = viewModel.errorMessage {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("STrack")
            .refreshable { await viewModel.refresh() }
            .task { await viewModel.refresh() }
            .sheet(isPresented: $showingCheckIn) {
                CheckInView()
            }
        }
    }

    private var statusLabel: String {
        switch viewModel.lastNightStatus {
        case .met: return "Goal met"
        case .missed: return "Goal missed"
        case .noData: return "No goal set"
        }
    }

    private var statusColor: Color {
        switch viewModel.lastNightStatus {
        case .met: return .green
        case .missed: return .orange
        case .noData: return .secondary
        }
    }
}
