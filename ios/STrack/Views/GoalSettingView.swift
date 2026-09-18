import SwiftUI

struct GoalSettingView: View {
    @State private var targetHours: Double = 8.0
    @State private var bedtime = Calendar.current.date(bySettingHour: 23, minute: 0, second: 0, of: Date())!
    @State private var wakeTime = Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date())!
    @State private var isSaving = false

    var body: some View {
        Form {
            Section("Target") {
                Stepper(value: $targetHours, in: 5...10, step: 0.5) {
                    Text("Sleep duration: \(targetHours, specifier: "%.1f") hrs")
                }
            }
            Section("Schedule") {
                DatePicker("Bedtime", selection: $bedtime, displayedComponents: .hourAndMinute)
                DatePicker("Wake time", selection: $wakeTime, displayedComponents: .hourAndMinute)
            }
            Section {
                Button(isSaving ? "Saving…" : "Save Goal") {
                    Task { await save() }
                }
                .disabled(isSaving)
            }
        }
        .navigationTitle("Sleep Goal")
    }

    private func save() async {
        isSaving = true
        defer { isSaving = false }

        let calendar = Calendar.current
        let goal = SleepGoal(
            id: UUID(),
            targetDurationHours: targetHours,
            targetBedtime: calendar.dateComponents([.hour, .minute], from: bedtime),
            targetWakeTime: calendar.dateComponents([.hour, .minute], from: wakeTime),
            isActive: true
        )

        try? await APIClient.shared.saveGoal(goal)
    }
}
