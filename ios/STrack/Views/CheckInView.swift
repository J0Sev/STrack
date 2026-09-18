import SwiftUI

/// Shown when the user missed their sleep goal — collects context to feed the suggestion engine.
struct CheckInView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var caffeineAfter2pm = false
    @State private var screenTimeMinutes: Double = 15
    @State private var alcohol = false
    @State private var exercisedToday = false
    @State private var stressLevel: Double = 3
    @State private var notes = ""

    @State private var suggestions: [Suggestion] = []
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Last night") {
                    Toggle("Caffeine after 2pm?", isOn: $caffeineAfter2pm)
                    Toggle("Alcohol?", isOn: $alcohol)
                    Toggle("Exercised today?", isOn: $exercisedToday)
                }

                Section("Screen time in the hour before bed") {
                    Slider(value: $screenTimeMinutes, in: 0...60, step: 5)
                    Text("\(Int(screenTimeMinutes)) minutes")
                        .foregroundStyle(.secondary)
                }

                Section("Stress level (1-5)") {
                    Slider(value: $stressLevel, in: 1...5, step: 1)
                    Text("\(Int(stressLevel))")
                        .foregroundStyle(.secondary)
                }

                Section("Anything else?") {
                    TextField("Optional notes", text: $notes, axis: .vertical)
                }

                if !suggestions.isEmpty {
                    Section("Suggestions") {
                        ForEach(suggestions) { suggestion in
                            VStack(alignment: .leading) {
                                Text(suggestion.title).bold()
                                Text(suggestion.detail).font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section {
                    Button(isSubmitting ? "Submitting…" : "Get Suggestions") {
                        Task { await submit() }
                    }
                    .disabled(isSubmitting)
                }
            }
            .navigationTitle("Check-In")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }

        let checkIn = CheckIn(
            id: UUID(),
            date: Date(),
            caffeineAfter2pm: caffeineAfter2pm,
            screenTimeBeforeBedMinutes: Int(screenTimeMinutes),
            alcohol: alcohol,
            exercisedToday: exercisedToday,
            stressLevel: Int(stressLevel),
            notes: notes.isEmpty ? nil : notes
        )

        suggestions = (try? await APIClient.shared.submitCheckIn(checkIn)) ?? []
    }
}
