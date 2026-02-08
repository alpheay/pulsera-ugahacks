import SwiftUI
import Combine

struct WatchFaceScreen: View {
    @ObservedObject var watchState: WatchState
    @ObservedObject var overlayState: OverlayState
    var onDoubleTap: () -> Void = {}
    var onDemoStart: () -> Void = {}

    @State private var currentTime = Date()
    
    private static let timeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm"
        return formatter
    }()
    
    private static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMM d"
        return formatter
    }()
    
    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    
    var body: some View {
        ZStack {
            GradientBackground(style: .watchFace)
            
            SessionRingView(
                state: watchState.ringState,
                audioAmplitude: currentAudioAmplitude
            )
            .padding(.bottom, 20)
            
            VStack(spacing: 4) {
                Text(timeString)
                    .font(.system(size: 48, weight: .regular, design: .rounded))
                    .foregroundColor(.white)
                    .shadow(color: .black.opacity(0.2), radius: 2, x: 0, y: 1)
                
                Text(dateString.uppercased())
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .tracking(1.5)
                    .foregroundColor(.white.opacity(0.6))
                
                Spacer()
                
                VStack(spacing: 12) {
                    if watchState.hasActiveSession {
                        sessionStatusView
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Demo heart rate display
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 12))
                            .foregroundColor(.red.opacity(0.8))
                        Text("\(watchState.demoHeartRate)")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.9))
                        Text("BPM")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.5))
                    }

                    // Demo Start button — visible when idle
                    if watchState.demoPhase == .idle && !watchState.hasActiveSession {
                        Button {
                            onDemoStart()
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 11))
                                Text("Start")
                                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 7)
                            .background(
                                Capsule()
                                    .fill(
                                        LinearGradient(
                                            colors: [.orange, .red.opacity(0.8)],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                            )
                        }
                        .transition(.opacity)
                    }

                    MonitoringIndicatorView(mode: watchState.monitoringMode)
                }
                .padding(.bottom, 10)
            }
            .padding(.top, 20)
            
        }
        .onReceive(timer) { _ in
            currentTime = Date()
        }
        .accessibilityQuickAction(style: .outline) {
            Button("Quick Action") {
                onDoubleTap()
            }
        }
    }
    
    private var timeString: String {
        Self.timeFormatter.string(from: currentTime)
    }
    
    private var dateString: String {
        Self.dateFormatter.string(from: currentTime)
    }
    
    private var currentAudioAmplitude: CGFloat {
        switch watchState.ringState {
        case .agentSpeaking:
            return watchState.outputAmplitude
        case .patientSpeaking:
            return watchState.inputAmplitude
        default:
            return 0
        }
    }
    
    @ViewBuilder
    private var sessionStatusView: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(sessionStatusColor)
                .frame(width: 6, height: 6)
                .shadow(color: sessionStatusColor.opacity(0.5), radius: 3)
            
            Text(sessionStatusText)
                .font(.system(size: 13, weight: .medium, design: .rounded))
                .foregroundColor(.white.opacity(0.9))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(.ultraThinMaterial)
                .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
        )
    }
    
    private var sessionStatusColor: Color {
        switch watchState.ringState {
        case .none: return .clear
        case .idle: return .white.opacity(0.5)
        case .agentSpeaking: return .purple
        case .patientSpeaking: return .blue
        }
    }
    
    private var sessionStatusText: String {
        switch watchState.ringState {
        case .none: return ""
        case .idle: return "Listening..."
        case .agentSpeaking: return "Speaking..."
        case .patientSpeaking: return "Hearing you..."
        }
    }
}
