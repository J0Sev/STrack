import Foundation

/// App-wide configuration. Change 'apiBaseURL' for actual setup:
///  - Simulator: http://localhost:3000 works.
///  - Physical iPhone: use Mac's LAN IP or an ngrok URL. 'localhost' 
//     on a phone means the phone itself.
/// An 'API_BASE_URL' key in Info.plist, if present, overrides the default so
/// you don't have to edit source when switching networks.
enum Config {
    static let apiBaseURL: URL = {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
           let url = URL(string: raw) {
            return url
        }
        return URL(string: "http://localhost:3000")!
    }()
}
