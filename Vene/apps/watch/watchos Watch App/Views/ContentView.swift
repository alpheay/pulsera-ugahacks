import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appCoordinator: AppCoordinator
    
    var body: some View {
        ZStack {
            switch appCoordinator.state {
            case .welcome:
                WelcomeScreen(coordinator: appCoordinator)
                    .transition(.opacity)
            case .pairing, .pairingWaiting:
                PairingScreen(coordinator: appCoordinator)
                    .transition(.opacity)
            case .authenticated:
                mainWatchFaceView
            }
        }
        .animation(.easeInOut, value: appCoordinator.state)
    }
    
    private var mainWatchFaceView: some View {
        WatchFaceScreen(
            watchState: appCoordinator.watchState,
            overlayState: appCoordinator.overlayState,
            onDoubleTap: { appCoordinator.handleDoubleTap() },
            onDemoStart: { appCoordinator.startDemoEpisode() }
        )
        .overlay {
            overlayView
        }
        .transition(.opacity)
        .onAppear {
            appCoordinator.watchState.startDemoHeartRate()
        }
    }

    @ViewBuilder
    private var overlayView: some View {
        // Demo resolved screen has highest priority when active
        if appCoordinator.watchState.demoPhase == .resolved {
            DemoResolvedOverlay(
                watchState: appCoordinator.watchState,
                onSendPulse: { appCoordinator.sendDemoPulseCheckin() },
                onDismiss: { appCoordinator.dismissDemoResolved() }
            )
            .transition(.opacity)
            .animation(.easeInOut(duration: 0.8), value: appCoordinator.watchState.demoPhase)
        }
        // Deadman has highest priority (time-sensitive)
        else if let deadmanInfo = appCoordinator.overlayState.deadmanPending {
            DeadmanOverlay(info: deadmanInfo) {
                appCoordinator.cancelDeadman()
            }
            .transition(.opacity)
        } else if let callInfo = appCoordinator.overlayState.callInfo {
            CallingOverlay(info: callInfo)
                .transition(.opacity)
        } else if let photoInfo = appCoordinator.overlayState.photoInfo {
            PhotoOverlay(info: photoInfo) {
                appCoordinator.dismissPhoto()
            }
            .transition(.opacity)
        } else if let musicInfo = appCoordinator.overlayState.musicInfo {
            MusicPlayingCard(info: musicInfo)
                .transition(.opacity)
        }
    }
}
