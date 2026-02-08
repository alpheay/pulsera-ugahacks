import Foundation
import Combine

struct MusicInfo: Equatable {
    let deezerTrackId: String
    let previewUrl: String?
    let title: String
    let artist: String
    let albumCoverUrl: String?
    let vibe: String?
}

struct PhotoInfo: Equatable {
    let photoId: Int
    let url: String?
    let semanticDescription: String?
    let vibe: String?
}

struct DeadmanPendingInfo: Equatable {
    let pendingId: String
    let action: String
    let expiresAt: Int
    let sessionId: String?
    let duration: Int
    
    var actionDescription: String {
        switch action {
        case "play_music": return "Starting music..."
        case "display_images": return "Showing photos..."
        case "start_call": return "Calling caregiver..."
        default: return "Action pending..."
        }
    }
}

struct CallInfo: Equatable {
    let caregiverId: String?
}

enum OverlayType: Equatable {
    case music(MusicInfo)
    case photo(PhotoInfo)
    case deadman(DeadmanPendingInfo)
    case call(CallInfo)
    case demoResolved
}

@MainActor
final class OverlayState: ObservableObject {
    @Published var deadmanPending: DeadmanPendingInfo?
    @Published var musicInfo: MusicInfo?
    @Published var photoInfo: PhotoInfo?
    @Published var callInfo: CallInfo?
    
    var hasDeadmanPending: Bool {
        deadmanPending != nil
    }
    
    var deadmanPendingId: String? {
        deadmanPending?.pendingId
    }
    
    func showDeadman(_ info: DeadmanPendingInfo) {
        self.deadmanPending = info
    }
    
    func hideDeadman() {
        self.deadmanPending = nil
    }
    
    func showMusic(_ info: MusicInfo) {
        self.musicInfo = info
    }
    
    func hideMusic() {
        self.musicInfo = nil
    }
    
    func showPhoto(_ info: PhotoInfo) {
        self.photoInfo = info
    }
    
    func hidePhoto() {
        self.photoInfo = nil
    }
    
    func showCall(_ info: CallInfo) {
        self.callInfo = info
    }
    
    func hideCall() {
        self.callInfo = nil
    }
    
    func clearAll() {
        self.deadmanPending = nil
        self.musicInfo = nil
        self.photoInfo = nil
        self.callInfo = nil
    }
}
