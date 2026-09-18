import Foundation

final class APIClient {
    static let shared = APIClient()

    private let baseURL = URL(string: "http://localhost:3000")!
    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    func syncSleepSessions(_ sessions: [SleepSession]) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("/sleep/sync"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(["sessions": sessions])
        _ = try await session.data(for: request)
    }

    func fetchGoal() async throws -> SleepGoal? {
        let (data, _) = try await session.data(from: baseURL.appendingPathComponent("/goals/active"))
        return try? decoder.decode(SleepGoal.self, from: data)
    }

    func saveGoal(_ goal: SleepGoal) async throws {
        var request = URLRequest(url: baseURL.appendingPathComponent("/goals"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(goal)
        _ = try await session.data(for: request)
    }

    func submitCheckIn(_ checkIn: CheckIn) async throws -> [Suggestion] {
        var request = URLRequest(url: baseURL.appendingPathComponent("/checkins"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(checkIn)
        let (data, _) = try await session.data(for: request)
        return (try? decoder.decode([Suggestion].self, from: data)) ?? []
    }
}
