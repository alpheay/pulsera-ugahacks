const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchAPIWithAuth<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
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

// --- Zone interfaces ---

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

// --- Alert interfaces ---

export interface AlertData {
  id: string;
  type: "individual" | "community" | "environmental";
  severity: "info" | "warning" | "critical";
  zone_id?: string;
  device_id?: string;
  group_id?: string;
  group_name?: string;
  title: string;
  description: string;
  score: number;
  affected_devices: string[];
  is_active: boolean;
  created_at: string;
  resolved_at?: string;
}

// --- PulseNet interfaces ---

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

// --- Group interfaces ---

export interface GroupData {
  id: string;
  name: string;
  description: string;
  type: "family" | "community";
  invite_code: string;
  member_count: number;
  created_at: string;
}

export interface MemberHealth {
  user_id: string;
  name: string;
  display_name: string;
  heart_rate: number;
  hrv: number;
  status: "safe" | "elevated" | "warning" | "critical";
  anomaly_score: number;
  last_updated: string;
}

export interface GroupDetailData extends GroupData {
  members: MemberHealth[];
}

// --- Group API functions ---

export async function fetchGroups(token: string): Promise<GroupData[]> {
  const res = await fetch(`${API_BASE}/api/groups`, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  // API may return { groups: [...] } or just an array
  return Array.isArray(data) ? data : data.groups || [];
}

export async function fetchGroupDetail(id: string, token?: string): Promise<GroupDetailData> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/api/groups/${id}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchGroupPulse(id: string, token?: string): Promise<{
  group_id: string;
  status: string;
  members: MemberHealth[];
  anomaly_count: number;
}> {
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}/api/groups/${id}/pulse`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
