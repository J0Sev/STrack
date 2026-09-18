import SwiftUI

@main
struct STrackApp: App {
    @StateObject private var healthKit = HealthKitManager()

    var body: some Scene {
        WindowGroup {
            DashboardView(healthKit: healthKit)
        }
    }
}
