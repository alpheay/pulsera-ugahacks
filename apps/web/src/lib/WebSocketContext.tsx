"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws";

type MessageHandler = (data: Record<string, unknown>) => void;

interface WebSocketContextType {
  connected: boolean;
  subscribe: (type: string, callback: MessageHandler) => () => void;
  send: (data: Record<string, unknown>) => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  connected: false,
  subscribe: () => () => {},
  send: () => {},
});

export function useWS() {
  return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const globalHandlersRef = useRef<Set<MessageHandler>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: "dashboard_subscribe" }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type as string;

        // Call type-specific handlers
        if (type && handlersRef.current.has(type)) {
          handlersRef.current.get(type)!.forEach((handler) => handler(data));
        }

        // Call global handlers
        globalHandlersRef.current.forEach((handler) => handler(data));
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((type: string, callback: MessageHandler) => {
    if (type === "*") {
      globalHandlersRef.current.add(callback);
      return () => {
        globalHandlersRef.current.delete(callback);
      };
    }

    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(callback);

    return () => {
      handlersRef.current.get(type)?.delete(callback);
    };
  }, []);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, subscribe, send }}>
      {children}
    </WebSocketContext.Provider>
  );
}
