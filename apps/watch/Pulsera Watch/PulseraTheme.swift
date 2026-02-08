import SwiftUI

/// Pulsera design tokens — matches web dashboard dark mode and mobile app color system.
/// Colors derived from globals.css (oklch → hex) and theme.ts.
///
/// Web dark mode palette:
///   --background:          #0A0A0A (oklch 0.145)
///   --foreground:          #FCFCFC (oklch 0.985)
///   --card:                #171717 (oklch 0.205)
///   --muted-foreground:    #A1A1A1 (oklch 0.708)
///   --border:              rgba(255,255,255,0.10)
///   --destructive:         #FF6467
///   --chart-1 (info):      #1447E6
///   --chart-2 (safe):      #00BC7D
///   --chart-3 (warning):   #FE9A00
///   --chart-4 (interactive): #AD46FF
///   --chart-5 (danger):    #FF2056
///
/// Dashboard accent text:  #FFF1E6 (cream)
/// Font: SF Rounded (watchOS system)

struct PulseraTheme {

    // MARK: - Brand Accent

    /// Primary brand accent — deep maroon (#942626)
    static let accent = Color(red: 148/255, green: 38/255, blue: 38/255)

    // MARK: - Core Palette

    /// Primary text — near white (#FCFCFC)
    static let foreground = Color(red: 252/255, green: 252/255, blue: 252/255)

    /// Background — near black (#0A0A0A)
    static let background = Color(red: 10/255, green: 10/255, blue: 10/255)

    /// Card surface (#171717)
    static let card = Color(red: 23/255, green: 23/255, blue: 23/255)

    /// Muted / secondary text (#A1A1A1)
    static let mutedForeground = Color(red: 161/255, green: 161/255, blue: 161/255)

    /// Dashboard cream accent text (#FFF1E6)
    static let cream = Color(red: 255/255, green: 241/255, blue: 230/255)

    // MARK: - Status Colors

    /// Safe / healthy — chart-2 (#00BC7D)
    static let safe = Color(red: 0/255, green: 188/255, blue: 125/255)

    /// Warning / elevated — chart-3 (#FE9A00)
    static let warning = Color(red: 254/255, green: 154/255, blue: 0/255)

    /// Danger / critical — destructive (#FF6467)
    static let danger = Color(red: 255/255, green: 100/255, blue: 103/255)

    /// Critical vivid — chart-5 (#FF2056)
    static let dangerVivid = Color(red: 255/255, green: 32/255, blue: 86/255)

    /// Info / primary accent — chart-1 (#1447E6)
    static let info = Color(red: 20/255, green: 71/255, blue: 230/255)

    /// Interactive / purple — chart-4 (#AD46FF)
    static let interactive = Color(red: 173/255, green: 70/255, blue: 255/255)

    // MARK: - Surface Colors

    /// Border / divider — rgba(255,255,255,0.10)
    static let border = Color.white.opacity(0.10)

    /// Input field border — rgba(255,255,255,0.15)
    static let input = Color.white.opacity(0.15)

    /// Glass card background — rgba(255,255,255,0.08)
    static let glassBg = Color.white.opacity(0.08)

    /// Elevated glass card background — rgba(255,255,255,0.12)
    static let glassBgElevated = Color.white.opacity(0.12)

    /// Ring / focus — medium gray (#8A8A8A)
    static let ring = Color(red: 138/255, green: 138/255, blue: 138/255)

    // MARK: - Helpers

    static func statusColor(for status: HealthStatus) -> Color {
        switch status {
        case .normal:   return safe
        case .elevated: return accent
        case .critical: return accent
        }
    }
}
