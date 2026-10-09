import SwiftUI

struct GoalSettingView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var targetHours: Double = 8.0
    @State private var bedtime = Calendar.current.date(bySettingHour: 23, minute: 0, second: 0, of: Date())!
    @State private var wakeTime = Calendar.current.date(bySettingHour: 7, minute: 0, second: 0, of: Date())!
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var didSave = false

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

            if let errorMessage {
                Section {
                    Label(errorMessage, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }

            if didSave {
                Section {
                    Label("Goal saved", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.green)
                }
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
        errorMessage = nil
        didSave = false
        defer { isSaving = false }

        let calendar = Calendar.current
        let goal = SleepGoal(
            id: UUID(),
            targetDurationHours: targetHours,
            targetBedtime: calendar.dateComponents([.hour, .minute], from: bedtime),
            targetWakeTime: calendar.dateComponents([.hour, .minute], from: wakeTime),
            isActive: true
        )

        do {
            try await APIClient.shared.saveGoal(goal)
            didSave = true
            // Give the confirmation a moment to register, then return to the dashboard.
            try? await Task.sleep(nanoseconds: 800_000_000)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
