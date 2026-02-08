import Foundation
import Combine

// MARK: - Episode Update Model

struct EpisodeUpdate: Equatable {
    let episodeId: String
    let phase: String
    let instructions: String?
    let fusionDecision: String?
}

final class WebSocketManager: ObservableObject {

    // MARK: - Published State

    @Published var connectionState: ConnectionState = .connected
    @Published var latestAnomalyScore: Double?
    @Published var latestGroupAlert: GroupAlert?
    @Published var latestEpisodeUpdate: EpisodeUpdate?
    @Published var incomingAudioData: Data?

    // MARK: - Configuration Keys

    private static let serverURLKey = "pulsera_server_url"
    private static let authTokenKey = "pulsera_auth_token"
    private static let deviceIDKey = "pulsera_device_id"
    private static let userIDKey = "pulsera_user_id"

    // MARK: - Private

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var reconnectAttempts: Int = 0
    private var maxReconnectAttempts: Int = 10
    private var reconnectTimer: Timer?
    private var isIntentionalDisconnect = false

    // MARK: - Device ID (generated once, persisted)

    var deviceID: String {
        if let existing = UserDefaults.standard.string(forKey: Self.deviceIDKey) {
            return existing
        }
        let newID = UUID().uuidString
        UserDefaults.standard.set(newID, forKey: Self.deviceIDKey)
        return newID
    }

    var userID: String {
        get { UserDefaults.standard.string(forKey: Self.userIDKey) ?? deviceID }
        set { UserDefaults.standard.set(newValue, forKey: Self.userIDKey) }
    }

    var serverURL: String? {
        get { UserDefaults.standard.string(forKey: Self.serverURLKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.serverURLKey) }
    }

    var authToken: String? {
        get { UserDefaults.standard.string(forKey: Self.authTokenKey) }
        set { UserDefaults.standard.set(newValue, forKey: Self.authTokenKey) }
    }

    // MARK: - Connect

    func connectIfConfigured() {
        guard let urlString = serverURL, !urlString.isEmpty else { return }
        connect(to: urlString)
    }

    func connect(to serverURLString: String) {
        disconnect()
        isIntentionalDisconnect = false

        guard let url = buildWebSocketURL(from: serverURLString) else {
            DispatchQueue.main.async {
                self.connectionState = .error("Invalid server URL")
            }
            return
        }

        DispatchQueue.main.async {
            self.connectionState = .connecting
        }

        var request = URLRequest(url: url)
        request.timeoutInterval = 10

        if let token = authToken, !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let session = URLSession(configuration: .default)
        let task = session.webSocketTask(with: request)

        self.urlSession = session
        self.webSocketTask = task

        task.resume()
        listenForMessages()

        // Verify handshake with ping, then authenticate
        task.sendPing { [weak self] error in
            guard let self = self else { return }
            if let error = error {
                DispatchQueue.main.async {
                    self.connectionState = .error("Handshake failed: \(error.localizedDescription)")
                }
                self.scheduleReconnect()
            } else {
                self.sendAuthenticateMessage()
            }
        }
    }

    func disconnect() {
        isIntentionalDisconnect = true
        reconnectTimer?.invalidate()
        reconnectTimer = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil

        DispatchQueue.main.async {
            self.connectionState = .disconnected
        }
    }

    // MARK: - Build URL

    private func buildWebSocketURL(from input: String) -> URL? {
        var urlString = input.trimmingCharacters(in: .whitespacesAndNewlines)

        // Ensure ws:// or wss:// prefix
        if !urlString.hasPrefix("ws://") && !urlString.hasPrefix("wss://") {
            if urlString.hasPrefix("http://") {
                urlString = urlString.replacingOccurrences(of: "http://", with: "ws://")
            } else if urlString.hasPrefix("https://") {
                urlString = urlString.replacingOccurrences(of: "https://", with: "wss://")
            } else {
                urlString = "ws://\(urlString)"
            }
        }

        // Append /ws path if not present
        if !urlString.hasSuffix("/ws") && !urlString.contains("/ws?") {
            if urlString.hasSuffix("/") {
                urlString += "ws"
            } else {
                urlString += "/ws"
            }
        }

        return URL(string: urlString)
    }

    // MARK: - Authentication

    private func sendAuthenticateMessage() {
        let payload: [String: Any] = [
            "type": "authenticate",
            "device_id": deviceID,
            "user_id": userID,
            "platform": "watchOS"
        ]

        sendJSON(payload)
    }

    // MARK: - Send Health Update

    func sendHealthUpdate(_ data: HealthData) {
        guard connectionState.isConnected else { return }

        let payload: [String: Any] = [
            "type": "health-update",
            "device_id": deviceID,
            "user_id": userID,
            "data": data.toJSON()
        ]

        sendJSON(payload)
    }

    // MARK: - Episode Messages

    func sendEpisodeStart(triggerData: [String: Any]) {
        guard connectionState.isConnected else { return }

        let payload: [String: Any] = [
            "type": "episode-start",
            "device_id": deviceID,
            "user_id": userID,
            "group_id": "family-demo",
            "trigger_data": triggerData,
        ]

        sendJSON(payload)
    }

    func sendPulseCheckin(message: String, presageData: [String: Any]? = nil) {
        guard connectionState.isConnected else { return }

        var payload: [String: Any] = [
            "type": "pulse-checkin",
            "device_id": deviceID,
            "user_id": userID,
            "group_id": "family-demo",
            "photo_url": "https://i.pravatar.cc/200?img=3",
            "message": message,
        ]

        if let presageData = presageData {
            payload["presage_data"] = presageData
        }

        sendJSON(payload)
    }

    func sendCalmingResult(episodeId: String, postVitals: [String: Any]) {
        guard connectionState.isConnected else { return }

        let payload: [String: Any] = [
            "type": "episode-calming-done",
            "episode_id": episodeId,
            "post_vitals": postVitals,
        ]

        sendJSON(payload)
    }

    // MARK: - Send JSON

    private func sendJSON(_ dict: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: dict),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        let message = URLSessionWebSocketTask.Message.string(jsonString)
        webSocketTask?.send(message) { [weak self] error in
            if let error = error {
                DispatchQueue.main.async {
                    self?.connectionState = .error(error.localizedDescription)
                }
                self?.scheduleReconnect()
            }
        }
    }

    // MARK: - Receive Messages

    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .data(let data):
                    self.handleBinaryMessage(data)
                case .string(let text):
                    self.handleJSONMessage(text)
                @unknown default:
                    break
                }
                self.listenForMessages()

            case .failure(let error):
                DispatchQueue.main.async {
                    self.connectionState = .error(error.localizedDescription)
                }
                if !self.isIntentionalDisconnect {
                    self.scheduleReconnect()
                }
            }
        }
    }

    // MARK: - Binary Message (Audio)

    private func handleBinaryMessage(_ data: Data) {
        DispatchQueue.main.async {
            self.incomingAudioData = data
        }
    }

    // MARK: - JSON Message

    private func handleJSONMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        switch type {
        case "authenticated":
            DispatchQueue.main.async {
                self.connectionState = .connected
                self.reconnectAttempts = 0
            }

        case "auth_error":
            let message = json["message"] as? String ?? "Authentication failed"
            DispatchQueue.main.async {
                self.connectionState = .error(message)
            }

        case "anomaly_result":
            if let score = json["anomaly_score"] as? Double ?? json["score"] as? Double {
                DispatchQueue.main.async {
                    self.latestAnomalyScore = score
                }
            }

        case "group-alert":
            let alert = GroupAlert(
                message: json["message"] as? String ?? "Group alert received",
                severity: json["severity"] as? String ?? "warning",
                timestamp: Date()
            )
            DispatchQueue.main.async {
                self.latestGroupAlert = alert
            }

        case "episode-started":
            if let episode = json["episode"] as? [String: Any],
               let episodeId = episode["id"] as? String {
                let update = EpisodeUpdate(
                    episodeId: episodeId,
                    phase: episode["phase"] as? String ?? "anomaly_detected",
                    instructions: nil,
                    fusionDecision: nil
                )
                DispatchQueue.main.async {
                    self.latestEpisodeUpdate = update
                }
            }

        case "episode-phase-update":
            let update = EpisodeUpdate(
                episodeId: json["episode_id"] as? String ?? "",
                phase: json["phase"] as? String ?? "",
                instructions: json["instructions"] as? String,
                fusionDecision: json["fusion_decision"] as? String
            )
            DispatchQueue.main.async {
                self.latestEpisodeUpdate = update
            }

        default:
            break
        }
    }

    // MARK: - Reconnect with Exponential Backoff

    private func scheduleReconnect() {
        guard !isIntentionalDisconnect,
              reconnectAttempts < maxReconnectAttempts else { return }

        reconnectAttempts += 1
        let delay = min(pow(2.0, Double(reconnectAttempts)), 60.0)

        DispatchQueue.main.async {
            self.connectionState = .connecting
            self.reconnectTimer?.invalidate()
            self.reconnectTimer = Timer.scheduledTimer(
                withTimeInterval: delay,
                repeats: false
            ) { [weak self] _ in
                self?.connectIfConfigured()
            }
        }
    }

    deinit {
        disconnect()
    }
}

// MARK: - Group Alert Model

struct GroupAlert: Equatable {
    let message: String
    let severity: String
    let timestamp: Date
}
