import { Platform } from "react-native"

export type CallStartAckEvent = {
  status: string
}

export type CallEndAckEvent = {
  status?: string
}

const getWebSocketUrl = (): string => {
  const envWs = process.env.EXPO_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_SERVER_URL
  if (envWs) {
    try {
      const url = new URL(envWs)
      if (url.protocol === "https:") {
        url.protocol = "wss:"
      } else if (url.protocol === "http:") {
        url.protocol = "ws:"
      }
      url.pathname = "/ws"
      url.search = ""
      url.hash = ""
      return url.toString()
    } catch {
      return envWs
    }
  }
  if (__DEV__) {
    if (Platform.OS === "ios") {
      return "ws://127.0.0.1:3001/ws"
    } else if (Platform.OS === "android") {
      return "ws://10.0.2.2:3001/ws"
    }
  }
  return "ws://127.0.0.1:3001/ws"
}

class SocketManager {
  private ws: WebSocket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private token: string | null = null
  private isAuthenticated = false
  private shouldReconnect = true

  setToken(token: string) {
    this.token = token
    this.shouldReconnect = true
    this.reconnectAttempts = 0
  }

  connect() {
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        return
      }
      if (this.ws.readyState === WebSocket.CONNECTING) {
        return
      }
    }

    if (!this.token) {
      return
    }

    const url = getWebSocketUrl()

    try {
      this.ws = new WebSocket(url)
      this.isAuthenticated = false

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.authenticate()
      }

      this.ws.onmessage = (event) => {
        const rawData = event.data
        console.log("[Socket] recv:", rawData)

        try {
          const data = JSON.parse(rawData)

          if (data.type === "authenticated") {
            this.isAuthenticated = true
            this.triggerEvent("authenticated", data)
            this.triggerEvent("connect", {})
            return
          }

          if (data.type === "auth-error") {
            this.shouldReconnect = false
            this.triggerEvent("auth-error", data)
            this.disconnect()
            return
          }

          if (!this.isAuthenticated) {
            return
          }

          if (data.type === "event-log") {
            this.triggerEvent("event-log", data)
          } else if (data.type === "watch-event") {
            this.triggerEvent("event-log", {
              eventType: data.eventType,
              createdAt: data.createdAt,
              data: data.data,
              sessionId: data.sessionId,
            })
          } else if (data.type === "activity-log") {
            this.triggerEvent("activity-log", data.log)
          } else if (data.type === "call-start-ack") {
            this.triggerEvent("call-start-ack", data)
          } else if (data.type === "call-end-ack") {
            this.triggerEvent("call-end-ack", data)
          } else if (data.type === "call-followup-ack") {
            this.triggerEvent("call-followup-ack", data)
          } else if (data.type === "agent-directives") {
            this.triggerEvent("agent-directives", data)
          } else if (data.type === "patient-context-updated") {
            this.triggerEvent("patient-context-updated", data)
          } else if (data.type === "device-unpaired") {
            this.triggerEvent("device-unpaired", data)
          } else if (data.type === "reconnect-request") {
            this.triggerEvent("reconnect-request", data)
          } else if (data.type === "pairing-request") {
            this.triggerEvent("pairing-request", data)
          } else if (data.type === "pairing-cancelled") {
            this.triggerEvent("pairing-cancelled", data)
          } else if (data.type === "device-paired") {
            this.triggerEvent("device-paired", data)
          } else if (data.type === "device-online") {
            this.triggerEvent("device-online", data)
          } else if (data.type === "device-offline") {
            this.triggerEvent("device-offline", data)
          } else if (data.type === "ring-episode-alert") {
            this.triggerEvent("ring-episode-alert", data)
          } else if (data.type === "ring-episode-resolved") {
            this.triggerEvent("ring-episode-resolved", data)
          } else if (data.type === "ring-pulse-checkin") {
            this.triggerEvent("ring-pulse-checkin", data)
          }
        } catch (err) {
          void err
        }
      }

      this.ws.onerror = (error) => {
        void error
      }

      this.ws.onclose = (event) => {
        this.ws = null
        this.isAuthenticated = false
        this.triggerEvent("disconnect", { code: event.code, reason: event.reason })
        this.scheduleReconnect()
      }
    } catch (error) {
      void error
      this.scheduleReconnect()
    }
  }

  private authenticate() {
    if (!this.ws || !this.token) return

    const payload = {
      type: "authenticate",
      token: this.token,
    }
    this.send(payload)
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) {
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    this.reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  disconnect() {
    this.shouldReconnect = false

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isAuthenticated = false
  }

  private triggerEvent(event: string, data: any) {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      callbacks.forEach((callback) => callback(data))
    }
  }

  on<T = any>(event: string, callback: (data: T) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(callback)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  private send(message: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log("[Socket] send failed - not connected")
      return
    }

    const messageStr = JSON.stringify(message)
    console.log("[Socket] send:", messageStr)
    this.ws.send(messageStr)
  }

  startPatientCall() {
    this.send({
      type: "caregiver-call-start",
    })
  }

  endPatientCall() {
    this.send({
      type: "caregiver-call-end",
    })
  }

  sendCallFollowup(resumeAgent: boolean) {
    this.send({
      type: "caregiver-call-followup",
      resumeAgent,
    })
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated
  }

  approveReconnect(deviceId: string) {
    this.send({
      type: "reconnect-approve",
      deviceId,
    })
  }

  rejectReconnect(deviceId: string) {
    this.send({
      type: "reconnect-reject",
      deviceId,
    })
  }

  cancelPairing(pairingCode: string) {
    this.send({
      type: "cancel-pairing",
      pairingCode,
    })
  }

  sendCaregiverEvent(event: string, payload?: Record<string, unknown>) {
    this.send({
      type: "caregiver-event",
      event,
      payload: payload || {},
    })
  }
}

export const socketManager = new SocketManager()
