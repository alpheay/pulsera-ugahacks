import SwiftUI

enum DesignConstants {
    enum Colors {
        static let background = Color(red: 0.04, green: 0.04, blue: 0.04)
        static let card = Color(red: 0.09, green: 0.09, blue: 0.09)
        static let secondary = Color(red: 0.15, green: 0.15, blue: 0.15)
        static let mutedForeground = Color(red: 0.63, green: 0.63, blue: 0.63)

        static let welcomeGradient: [Color] = [
            Color(red: 0.09, green: 0.09, blue: 0.09),
            Color(red: 0.15, green: 0.15, blue: 0.15),
            Color(red: 0.04, green: 0.04, blue: 0.04)
        ]

        static let monitoringGradient: [Color] = [
            Color(red: 0.1, green: 0.4, blue: 0.2),
            Color(red: 0.05, green: 0.2, blue: 0.1),
            Color(red: 0.04, green: 0.04, blue: 0.04)
        ]

        static let distressGradient: [Color] = [
            Color(red: 0.2, green: 0.1, blue: 0.4),
            Color(red: 0.1, green: 0.05, blue: 0.2),
            Color(red: 0.04, green: 0.04, blue: 0.04)
        ]

        static let callGradient: [Color] = [
            Color(red: 0.05, green: 0.3, blue: 0.15),
            Color(red: 0.02, green: 0.15, blue: 0.08),
            Color(red: 0.04, green: 0.04, blue: 0.04)
        ]
    }

    enum Animation {
        static let springResponse: Double = 0.4
        static let springDamping: Double = 0.7
        static let overlaySpringResponse: Double = 0.32
        static let overlaySpringDamping: Double = 0.8
    }

    enum Layout {
        static let cardCornerRadius: CGFloat = 18
        static let buttonCornerRadius: CGFloat = 20
        static let standardPadding: CGFloat = 14
        static let smallPadding: CGFloat = 8
    }

    enum Typography {
        static let titleSize: CGFloat = 24
        static let headlineSize: CGFloat = 18
        static let bodySize: CGFloat = 15
        static let captionSize: CGFloat = 13
        static let smallSize: CGFloat = 12
    }
}
