import Foundation
import Combine

/// Lightweight event bridge for sending events from the watch to connected clients.
/// Currently a local stub — extend with WatchConnectivity for phone communication.
final class EventBridgeClient: ObservableObject {

    @Published var lastEvent: BridgeEvent?

    struct BridgeEvent {
        let type: String
        let data: [String: Any]
        let timestamp: Date
    }

    func sendEvent(type: String, data: [String: Any]) {
        let event = BridgeEvent(type: type, data: data, timestamp: Date())
        DispatchQueue.main.async {
            self.lastEvent = event
        }
    }
}
