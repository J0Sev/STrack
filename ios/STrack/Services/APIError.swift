import Foundation

/// Errors surfaced by 'APIClient'. Conforms to 'LocalizedError' so views can
/// show 'error.localizedDescription' directly to the user.
enum APIError: LocalizedError {
    /// The server rejected the request with a 400 and a list of validation messages.
    case validation([String])
    /// The server responded with a non-2xx status that isn't a validation failure.
    case server(statusCode: Int, message: String?)
    /// The response wasn't an HTTP response, or the body couldn't be decoded.
    case invalidResponse
    /// The request never reached the server (offline, wrong host, timeout).
    case network(Error)

    var errorDescription: String? {
        switch self {
        case .validation(let messages):
            return messages.joined(separator: "\n")
        case .server(let statusCode, let message):
            if let message { return "Server error (\(statusCode)): \(message)" }
            return "Server error (\(statusCode))."
        case .invalidResponse:
            return "Unexpected response from the server."
        case .network(let underlying):
            return "Couldn't reach the server: \(underlying.localizedDescription)"
        }
    }

    /// True when retrying the same request could plausibly succeed.
    var isRetryable: Bool {
        switch self {
        case .network: return true
        case .server(let statusCode, _): return statusCode >= 500
        case .validation, .invalidResponse: return false
        }
    }
}

/// Shape of the backend's error bodies: '{ "errors": [...] }' for validation
/// failures, '{ "error": "..." }' for everything else.
struct APIErrorBody: Decodable {
    let errors: [String]?
    let error: String?
}
