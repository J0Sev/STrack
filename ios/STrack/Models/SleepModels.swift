import Foundation

/// A single night's sleep, aggregated from HealthKit sleep-analysis samples.
struct SleepSession: Identifiable, Codable {
    let id: UUID
    let startDate: Date
    let endDate: Date
    let totalDuration: TimeInterval        
    let timeInBed: TimeInterval            
    let coreDuration: TimeInterval?
    let deepDuration: TimeInterval?
    let remDuration: TimeInterval?
    let awakeDuration: TimeInterval?

    var durationHours: Double { totalDuration / 3600 }
}

/// A user-defined sleep goal.
struct SleepGoal: Identifiable, Codable {
    let id: UUID
    var targetDurationHours: Double     
    var targetBedtime: DateComponents   
    var targetWakeTime: DateComponents
    var isActive: Bool
}

/// Whether a given night met the active goal.
enum GoalStatus: String, Codable {
    case met
    case missed
    case noData
}

/// Answers collected when a goal is missed, driving the suggestion engine.
struct CheckIn: Identifiable, Codable {
    let id: UUID
    let date: Date
    var caffeineAfter2pm: Bool
    var screenTimeBeforeBedMinutes: Int?   // approx minutes of screen use in last hour before bed
    var alcohol: Bool
    var exercisedToday: Bool
    var stressLevel: Int?                  // 1-5 self-reported
    var notes: String?
}

/// A suggestion returned by the rules engine (or backend) after a check-in.
struct Suggestion: Identifiable, Codable {
    let id: UUID
    let title: String
    let detail: String
    let category: String   // e.g. "diet", "routine", "environment"
}
