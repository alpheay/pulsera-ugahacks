import SwiftUI

/// Pulsera design tokens — matches web dashboard and mobile app color system.
/// Derived from the shared theme (globals.css / theme.ts).
struct PulseraTheme {
    // MARK: - Core Palette

    /// Primary text — near white
    static let foreground = Color.white

    /// Background — near black
    static let background = Color(red: 10/255, green: 10/255, blue: 10/255) // #0A0A0A

    /// Muted / secondary text
    static let mutedForeground = Color(red: 161/255, green: 161/255, blue: 161/255) // #A1A1A1

    // MARK: - Status Colors

    /// Safe / healthy — chart-2 green
    static let safe = Color(red: 0, green: 188/255, blue: 125/255) // #00BC7D

    /// Warning / elevated — chart-3 amber
    static let warning = Color(red: 254/255, green: 154/255, blue: 0) // #FE9A00

    /// Danger / critical — destructive red
    static let danger = Color(red: 255/255, green: 100/255, blue: 103/255) // #FF6467

    /// Info / primary accent — chart-1 blue
    static let info = Color(red: 20/255, green: 71/255, blue: 230/255) // #1447E6

    /// Interactive / purple — chart-4
    static let interactive = Color(red: 173/255, green: 70/255, blue: 255/255) // #AD46FF

    // MARK: - Surface Colors

    /// Card surface
    static let card = Color(red: 23/255, green: 23/255, blue: 23/255) // #171717

    /// Border / divider
    static let border = Color.white.opacity(0.10)

    /// Glass card background
    static let glassBg = Color.white.opacity(0.08)

    /// Elevated glass card background
    static let glassBgElevated = Color.white.opacity(0.12)

    // MARK: - Status Helpers

    static func statusColor(for status: HealthStatus) -> Color {
        switch status {
        case .normal:   return safe
        case .elevated: return warning
        case .critical: return danger
        }
    }
}
