/**
 * Simple notification state store for ring notifications.
 * Push/dismiss/subscribe pattern — no external dependencies.
 */

export type RingNotificationType =
  | "episode-alert"
  | "episode-resolved"
  | "pulse-checkin";

export interface PresageData {
  visualHeartRate: number;
  breathingRate: number;
  facialExpression: string;
  eyeResponsiveness: string;
  confidenceScore: number;
}

export interface RingNotification {
  id: string;
  type: RingNotificationType;
  memberName: string;
  heartRate?: number;
  triggerType?: string;
  photoUrl?: string;
  message?: string;
  presageData?: PresageData;
  timestamp: string;
  dismissed: boolean;
}

type Listener = (notifications: RingNotification[]) => void;

let notifications: RingNotification[] = [];
const listeners = new Set<Listener>();
let idCounter = 0;

function emit() {
  const snapshot = [...notifications];
  listeners.forEach((cb) => {
    try {
      cb(snapshot);
    } catch {
      // swallow listener errors
    }
  });
}

export function pushNotification(
  n: Omit<RingNotification, "id" | "dismissed">
): string {
  const id = `notif-${++idCounter}-${Date.now()}`;
  notifications.push({ ...n, id, dismissed: false });
  emit();
  return id;
}

export function dismissNotification(id: string): void {
  notifications = notifications.map((n) =>
    n.id === id ? { ...n, dismissed: true } : n
  );
  emit();
}

export function clearDismissed(): void {
  notifications = notifications.filter((n) => !n.dismissed);
  emit();
}

export function getActiveNotifications(): RingNotification[] {
  return notifications.filter((n) => !n.dismissed);
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
