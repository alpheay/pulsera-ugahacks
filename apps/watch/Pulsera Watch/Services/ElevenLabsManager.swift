import Foundation
import os

private let logger = Logger(subsystem: "com.pulsera.watchapp", category: "ElevenLabs")

final class ElevenLabsManager: NSObject, ObservableObject, URLSessionWebSocketDelegate {

    // MARK: - Configuration (hardcoded for hackathon)

    private let apiKey = "sk_c3a2196baf544de81e084a29da1b969aeb16bd3d5b8635c0"
    private let agentId = "agent_8901kgvz78a4eyk82bdwqzq9njv0"

    // MARK: - Scripted demo flow
    // After the agent's first message finishes, we send a pre-scripted "user" text
    // so the agent responds with soothing guidance — no real mic needed.

    private let scriptedUserMessage = "I'm feeling really stressed right now. I have a big presentation coming up and I'm so nervous about it. My heart is racing and I can't calm down."

    private var hasSentScriptedMessage = false
    private var agentSilenceTimer: DispatchWorkItem?

    // MARK: - Public

    var audioPlayerManager: AudioPlayerManager?
    @Published var isConnected = false

    // MARK: - Private

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var running = false
    private var audioChunksReceived = 0

    // MARK: - Session lifecycle

    func startSession() {
        guard webSocketTask == nil else {
            logger.warning("startSession called but already have a task")
            return
        }
        running = true
        audioChunksReceived = 0
        hasSentScriptedMessage = false

        let urlString = "wss://api.elevenlabs.io/v1/convai/conversation?agent_id=\(agentId)"
        guard let url = URL(string: urlString) else {
            logger.error("bad URL")
            return
        }

        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")

        let session = URLSession(configuration: .default, delegate: self, delegateQueue: nil)
        self.urlSession = session

        let task = session.webSocketTask(with: request)
        self.webSocketTask = task
        task.resume()

        logger.info("WebSocket task resumed, waiting for didOpenWithProtocol…")
    }

    func stopSession() {
        running = false
        agentSilenceTimer?.cancel()
        agentSilenceTimer = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        urlSession?.invalidateAndCancel()
        urlSession = nil
        DispatchQueue.main.async {
            self.isConnected = false
        }
        logger.info("session stopped (received \(self.audioChunksReceived) audio chunks)")
    }

    // MARK: - URLSessionWebSocketDelegate

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        logger.info("WebSocket didOpen — sending init and starting listen loop")
        sendInitiation()
        listenForMessages()
    }

    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        let reasonStr = reason.flatMap { String(data: $0, encoding: .utf8) } ?? "none"
        logger.info("WebSocket didClose code=\(closeCode.rawValue) reason=\(reasonStr)")
        DispatchQueue.main.async {
            self.isConnected = false
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error {
            logger.error("URLSession task error: \(error.localizedDescription)")
        }
    }

    // MARK: - Initiation

    private func sendInitiation() {
        let jsonStr = """
        {"type":"conversation_initiation_client_data","conversation_initiation_client_data":{"conversation_config_override":{"agent":{"first_message":"Hey, I'm here with you. Let's take a slow breath together. Breathe in through your nose... hold... and slowly breathe out. You're doing great. Let's keep going."}}}}
        """

        logger.info("sending init message")
        webSocketTask?.send(.string(jsonStr)) { error in
            if let error {
                logger.error("failed to send init: \(error.localizedDescription)")
            } else {
                logger.info("init message sent OK")
            }
        }
    }

    // MARK: - Breathing Cue (sync with BreathingView)

    func sendBreathingCue(breatheIn: Bool) {
        guard running, webSocketTask != nil else { return }
        let text = breatheIn
            ? "I'm breathing in now, slowly through my nose."
            : "I'm breathing out now, slowly and gently."
        let escaped = text.replacingOccurrences(of: "\"", with: "\\\"")
        let jsonStr = "{\"type\":\"user_message\",\"text\":\"\(escaped)\"}"
        logger.info("sending breathing cue: \(breatheIn ? "inhale" : "exhale")")
        webSocketTask?.send(.string(jsonStr)) { error in
            if let error {
                logger.error("failed to send breathing cue: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Scripted user message (sent as text, no mic needed)

    private func sendScriptedUserMessage() {
        guard !hasSentScriptedMessage, running else { return }
        hasSentScriptedMessage = true

        let escaped = scriptedUserMessage.replacingOccurrences(of: "\"", with: "\\\"")
        let jsonStr = "{\"type\":\"user_message\",\"text\":\"\(escaped)\"}"
        logger.info("sending scripted user message")
        webSocketTask?.send(.string(jsonStr)) { error in
            if let error {
                logger.error("failed to send scripted message: \(error.localizedDescription)")
            } else {
                logger.info("scripted user message sent OK")
            }
        }
    }

    // MARK: - Receive loop

    private func listenForMessages() {
        guard running, let task = webSocketTask else { return }

        task.receive { [weak self] result in
            guard let self, self.running else { return }

            switch result {
            case .success(let message):
                self.handleMessage(message)
                self.listenForMessages()

            case .failure(let error):
                logger.error("receive error: \(error.localizedDescription)")
                self.stopSession()
            }
        }
    }

    private func handleMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            guard let data = text.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let type = json["type"] as? String else {
                logger.warning("failed to parse message")
                return
            }

            switch type {
            case "audio":
                if let event = json["audio_event"] as? [String: Any],
                   let b64 = event["audio_base_64"] as? String,
                   let pcm = Data(base64Encoded: b64) {
                    audioChunksReceived += 1
                    if audioChunksReceived <= 3 {
                        logger.info("audio #\(self.audioChunksReceived): \(pcm.count) bytes")
                    }

                    // Track when agent stops speaking so we can send scripted reply
                    self.agentSilenceTimer?.cancel()
                    let timer = DispatchWorkItem { [weak self] in
                        guard let self, self.running, !self.hasSentScriptedMessage else { return }
                        logger.info("agent finished first message — sending scripted user reply")
                        self.sendScriptedUserMessage()
                    }
                    self.agentSilenceTimer = timer
                    // Wait 1.5s after last audio chunk to confirm agent is done speaking
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5, execute: timer)

                    DispatchQueue.main.async {
                        self.audioPlayerManager?.playPCMData(pcm)
                    }
                }

            case "ping":
                if let event = json["ping_event"] as? [String: Any],
                   let eventId = event["event_id"] as? Int {
                    let pongStr = "{\"type\":\"pong\",\"event_id\":\(eventId)}"
                    webSocketTask?.send(.string(pongStr)) { _ in }
                }

            case "conversation_initiation_metadata":
                logger.info("conversation started — session is live")
                DispatchQueue.main.async {
                    self.isConnected = true
                }

            case "agent_response":
                if let event = json["agent_response_event"] as? [String: Any],
                   let resp = event["agent_response"] as? String {
                    logger.info("agent: \(resp)")
                }

            case "user_transcript":
                if let event = json["user_transcription_event"] as? [String: Any],
                   let transcript = event["user_transcript"] as? String {
                    logger.info("user: \(transcript)")
                }

            case "interruption":
                logger.info("interruption event")

            case "error":
                logger.error("server error: \(text.prefix(300))")

            default:
                logger.debug("msg type=\(type)")
            }

        case .data(let data):
            logger.info("binary frame \(data.count) bytes")

        @unknown default:
            break
        }
    }
}
