import Foundation

/// Thin wrapper around the STrack backend. Every call goes through 'send', which
/// checks the HTTP status and converts failures into 'APIError', so callers can
/// 'try await' and show 'error.localizedDescription' without extra plumbing.
final class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession

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

    init(baseURL: URL = Config.apiBaseURL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    // MARK: - Endpoints

    func syncSleepSessions(_ sessions: [SleepSession]) async throws {
        _ = try await send(path: "/sleep/sync", method: "POST", body: ["sessions": sessions])
    }

    /// Returns nil when the user hasn't set a goal yet (the backend answers 404).
    func fetchGoal() async throws -> SleepGoal? {
        do {
            let data = try await send(path: "/goals/active", method: "GET")
            return try decode(SleepGoal.self, from: data)
        } catch APIError.server(404, _) {
            return nil
        }
    }

    func saveGoal(_ goal: SleepGoal) async throws {
        _ = try await send(path: "/goals", method: "POST", body: goal)
    }

    func submitCheckIn(_ checkIn: CheckIn) async throws -> [Suggestion] {
        let data = try await send(path: "/checkins", method: "POST", body: checkIn)
        return try decode([Suggestion].self, from: data)
    }

    // MARK: - Plumbing

    private func send<Body: Encodable>(path: String, method: String, body: Body) async throws -> Data {
        let encoded: Data
        do {
            encoded = try encoder.encode(body)
        } catch {
            throw APIError.invalidResponse
        }
        return try await send(path: path, method: method, bodyData: encoded)
    }

    private func send(path: String, method: String) async throws -> Data {
        try await send(path: path, method: method, bodyData: nil)
    }

    private func send(path: String, method: String, bodyData: Data?) async throws -> Data {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = method
        if let bodyData {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = bodyData
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.network(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200..<300).contains(http.statusCode) else {
            throw Self.error(forStatus: http.statusCode, body: data)
        }
        return data
    }

    private func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        do {
            return try decoder.decode(type, from: data)
        } catch {
            throw APIError.invalidResponse
        }
    }

    /// Maps a failed response to the most specific 'APIError' the body allows.
    private static func error(forStatus status: Int, body: Data) -> APIError {
        let parsed = try? JSONDecoder().decode(APIErrorBody.self, from: body)

        if status == 400, let messages = parsed?.errors, !messages.isEmpty {
            return .validation(messages)
        }
        return .server(statusCode: status, message: parsed?.error)
    }
}
