/**
 * Pulsera WebSocket client.
 *
 * Connects to the server WebSocket endpoint, handles authentication,
 * group subscriptions, and dispatches incoming messages to registered
 * callbacks. Includes auto-reconnect with exponential back-off.
 */

export type MessageType =
  | "authenticated"
  | "group-health-update"
  | "group-alert"
  | "group-subscribed"
  | "anomaly_result"
  | "ring-episode-alert"
  | "ring-episode-resolved"
  | "ring-pulse-checkin"
  | "pong"
  | "error"
  | "auth_error";

export interface GroupHealthUpdate {
  type: "group-health-update";
  groupId: string;
  userId: string;
  heartRate: number;
  hrv: number;
  status: string;
  anomalyScore: number;
}

export interface GroupAlert {
  type: "group-alert";
  groupId: string;
  alertId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  score: number;
}

export interface AnomalyResult {
  type: "anomaly_result";
  device_id: string;
  score: number;
  status: string;
  is_anomaly: boolean;
}

export interface RingEpisodeAlert {
  type: "ring-episode-alert";
  episode_id: string;
  member_name: string;
  heart_rate: number;
  trigger_type: string;
  phase: string;
  timestamp: string;
}

export interface RingEpisodeResolved {
  type: "ring-episode-resolved";
  episode_id: string;
  member_name: string;
  resolution: string;
  timestamp: string;
}

export interface RingPulseCheckin {
  type: "ring-pulse-checkin";
  member_name: string;
  photo_url: string;
  message: string;
  presage_data?: {
    visual_heart_rate: number;
    breathing_rate: number;
    facial_expression: string;
    eye_responsiveness: string;
    confidence_score: number;
  };
  timestamp: string;
}

export type IncomingMessage =
  | GroupHealthUpdate
  | GroupAlert
  | AnomalyResult
  | RingEpisodeAlert
  | RingEpisodeResolved
  | RingPulseCheckin
  | { type: string; [key: string]: unknown };

export type MessageCallback = (message: IncomingMessage) => void;

const DEFAULT_WS_URL = "ws://localhost:8765/ws";
const MAX_RECONNECT_DELAY_MS = 30_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const PING_INTERVAL_MS = 25_000;

export class PulseraWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private userId: string | null = null;
  private deviceId: string | null = null;
  private groupIds: string[] = [];
  private listeners = new Set<MessageCallback>();
  private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalClose = false;

  constructor(url?: string) {
    this.url = url || process.env.EXPO_PUBLIC_WS_URL || DEFAULT_WS_URL;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Register a callback for incoming messages. Returns an unsubscribe fn. */
  onMessage(cb: MessageCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /** Open the WebSocket connection and authenticate. */
  connect(
    token: string,
    userId: string,
    deviceId?: string,
    groupIds?: string[]
  ): void {
    this.token = token;
    this.userId = userId;
    this.deviceId = deviceId || `mobile-${userId}`;
    this.groupIds = groupIds || [];
    this.intentionalClose = false;
    this._connect();
  }

  /** Gracefully close the connection. */
  disconnect(): void {
    this.intentionalClose = true;
    this._clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /** Subscribe to real-time updates for a specific group. */
  subscribeGroup(groupId: string): void {
    if (!this.groupIds.includes(groupId)) {
      this.groupIds.push(groupId);
    }
    this._send({ type: "subscribe-group", groupId });
  }

  /** Send a health-update message (from this device). */
  sendHealthUpdate(data: {
    heartRate: number;
    hrv: number;
    acceleration?: number;
    skinTemp?: number;
    status?: string;
  }): void {
    this._send({
      type: "health-update",
      ...data,
    });
  }

  /** Whether the underlying WebSocket is open. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private _connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;

      // Authenticate immediately
      this._send({
        type: "authenticate",
        device_id: this.deviceId,
        user_id: this.userId,
        group_ids: this.groupIds,
      });

      // Register as mobile client with the relay server
      this._send({ type: "register", role: "mobile" });

      // Subscribe to any groups
      for (const gid of this.groupIds) {
        this._send({ type: "subscribe-group", groupId: gid });
      }

      // Start ping keep-alive
      this._startPing();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        ) as IncomingMessage;
        this.listeners.forEach((cb) => {
          try {
            cb(data);
          } catch {
            // swallow listener errors
          }
        });
      } catch {
        // ignore non-JSON messages
      }
    };

    this.ws.onclose = () => {
      this._clearTimers();
      if (!this.intentionalClose) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, which handles reconnection
      this.ws?.close();
    };
  }

  private _send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private _startPing(): void {
    this._clearPing();
    this.pingTimer = setInterval(() => {
      this._send({ type: "ping" });
    }, PING_INTERVAL_MS);
  }

  private _clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private _clearTimers(): void {
    this._clearPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this.intentionalClose) return;
    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, this.reconnectDelay);
    // Exponential back-off capped at MAX
    this.reconnectDelay = Math.min(
      this.reconnectDelay * 2,
      MAX_RECONNECT_DELAY_MS
    );
  }
}

/** Singleton instance used across the app. */
export const pulseraWS = new PulseraWebSocket();
