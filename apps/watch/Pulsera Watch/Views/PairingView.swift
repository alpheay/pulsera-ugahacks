import SwiftUI

struct PairingView: View {
    @EnvironmentObject var webSocketManager: WebSocketManager

    @State private var serverURL: String = ""
    @State private var authToken: String = ""
    @State private var showSavedConfirmation: Bool = false

    private let amberColor = PulseraTheme.accent

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                // Header
                headerSection

                // Server URL
                VStack(alignment: .leading, spacing: 4) {
                    Text("Server URL")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.gray)

                    TextField("192.168.1.100:8000", text: $serverURL)
                        .font(.system(size: 13))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.white.opacity(0.08))
                        )
                }

                // Auth Token
                VStack(alignment: .leading, spacing: 4) {
                    Text("Auth Token")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.gray)

                    SecureField("Optional", text: $authToken)
                        .font(.system(size: 13))
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.white.opacity(0.08))
                        )
                }

                // Device ID display
                VStack(alignment: .leading, spacing: 4) {
                    Text("Device ID")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.gray)

                    Text(webSocketManager.deviceID)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundColor(.white.opacity(0.6))
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                // Save & Connect button
                Button(action: saveAndConnect) {
                    HStack {
                        Image(systemName: "antenna.radiowaves.left.and.right")
                        Text(webSocketManager.connectionState.isConnected ? "Reconnect" : "Connect")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(amberColor)
                    .foregroundColor(.black)
                    .cornerRadius(10)
                }
                .buttonStyle(.plain)

                // Disconnect button (shown when connected)
                if webSocketManager.connectionState.isConnected {
                    Button(action: { webSocketManager.disconnect() }) {
                        Text("Disconnect")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.red)
                    }
                    .buttonStyle(.plain)
                }

                // Connection state indicator
                connectionStateLabel

                // Confirmation overlay
                if showSavedConfirmation {
                    Text("Saved")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.green)
                        .transition(.opacity)
                }
            }
            .padding(.horizontal, 8)
            .padding(.top, 4)
        }
        .onAppear {
            serverURL = webSocketManager.serverURL ?? ""
            authToken = webSocketManager.authToken ?? ""
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: 2) {
            Image(systemName: "link.circle.fill")
                .font(.system(size: 24))
                .foregroundColor(amberColor)

            Text("Pulsera Pairing")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.white)
        }
        .padding(.bottom, 4)
    }

    // MARK: - Connection State

    private var connectionStateLabel: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(stateColor)
                .frame(width: 6, height: 6)

            Text(webSocketManager.connectionState.displayText)
                .font(.system(size: 10))
                .foregroundColor(.gray)
                .lineLimit(1)
        }
    }

    private var stateColor: Color {
        switch webSocketManager.connectionState {
        case .connected:    return PulseraTheme.safe
        case .connecting:   return PulseraTheme.warning
        case .disconnected: return PulseraTheme.mutedForeground
        case .error:        return PulseraTheme.danger
        }
    }

    // MARK: - Actions

    private func saveAndConnect() {
        let trimmedURL = serverURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedToken = authToken.trimmingCharacters(in: .whitespacesAndNewlines)

        webSocketManager.serverURL = trimmedURL
        webSocketManager.authToken = trimmedToken.isEmpty ? nil : trimmedToken

        webSocketManager.connect(to: trimmedURL)

        withAnimation {
            showSavedConfirmation = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation {
                showSavedConfirmation = false
            }
        }
    }
}

#Preview {
    PairingView()
        .environmentObject(WebSocketManager())
}
