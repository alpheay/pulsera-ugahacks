const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function postAPI<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export interface ZoneData {
  zone_id: string;
  name?: string;
  score: number;
  max_score?: number;
  status: "safe" | "elevated" | "warning" | "critical";
  active_devices: number;
  anomalous_devices: number;
  is_community_anomaly?: boolean;
  device_scores?: Record<string, number>;
  timestamp?: string;
}

export interface CommunitySummary {
  overall_status: string;
  total_devices: number;
  total_anomalous: number;
  community_anomalies: number;
  zones: ZoneData[];
  timestamp: string;
}

export interface AlertData {
  id: string;
  type: "individual" | "community" | "environmental";
  severity: "info" | "warning" | "critical";
  zone_id?: string;
  device_id?: string;
  title: string;
  description: string;
  score: number;
  affected_devices: string[];
  is_active: boolean;
  created_at: string;
  resolved_at?: string;
}

export interface PulseNetResult {
  overall_score: number;
  max_score: number;
  is_anomaly: boolean;
  per_timestep_scores: number[];
  reconstruction: number[][];
  association_discrepancy: number;
  attention_heatmap: number[][];
  input?: number[][];
  ground_truth_label?: number;
  ground_truth_mask?: number[];
}

export interface HealthUpdate {
  type: string;
  device_id: string;
  reading: {
    heart_rate: number;
    hrv: number;
    acceleration: number;
    skin_temp: number;
    timestamp: string;
  };
  anomaly: {
    overall_score: number;
    is_anomaly: boolean;
  };
}
