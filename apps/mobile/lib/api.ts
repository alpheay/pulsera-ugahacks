/**
 * Pulsera REST API client.
 *
 * All requests include the Bearer token from authStore when available.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthResponse {
  user_id: string;
  name: string;
  display_name: string | null;
  token: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  description: string | null;
  type: "family" | "community";
  invite_code: string;
  created_by: string;
  created_at: string;
  member_count: number;
}

export interface MemberHealth {
  user_id: string;
  name: string;
  display_name: string | null;
  heart_rate: number | null;
  hrv: number | null;
  status: string;
  anomaly_score: number;
  last_updated: string | null;
}

export interface GroupDetailResponse {
  id: string;
  name: string;
  description: string | null;
  type: "family" | "community";
  invite_code: string;
  created_by: string;
  created_at: string;
  members: MemberHealth[];
}

export interface GroupPulseResponse {
  group_id: string;
  group_name: string;
  group_type: string;
  status: string;
  total_members: number;
  anomalous_members: number;
  members: Array<{
    user_id: string;
    heart_rate: number | null;
    status: string;
    anomaly_score: number;
  }>;
  timestamp: string;
}

export interface HealthLatest {
  user_id: string;
  device_id?: string;
  heart_rate: number;
  hrv: number;
  acceleration: number;
  skin_temp: number;
  anomaly_score: number;
  status: string;
  timestamp: string | null;
}

export interface AlertData {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  group_id: string | null;
  title: string;
  description: string;
  score: number;
  is_active: boolean;
  created_at: string;
}

export interface JoinGroupResponse {
  message: string;
  group_id: string;
  group_name?: string;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

let _authToken: string | null = null;

/**
 * Call this from authStore after login/register so every subsequent
 * request carries the Bearer token.
 */
export function setAuthToken(token: string | null): void {
  _authToken = token;
}

// ---------------------------------------------------------------------------
// Generic fetch helpers
// ---------------------------------------------------------------------------

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (_authToken) {
    h["Authorization"] = `Bearer ${_authToken}`;
  }
  return h;
}

export async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: headers(),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API GET ${path} failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function postAPI<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API POST ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function deleteAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API DELETE ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Typed API methods
// ---------------------------------------------------------------------------

/** Register a new user. */
export function register(
  name: string,
  email?: string,
  displayName?: string
): Promise<AuthResponse> {
  return postAPI<AuthResponse>("/api/auth/register", {
    name,
    email: email || undefined,
    display_name: displayName || undefined,
  });
}

/** Login with email or token. */
export function login(
  email?: string,
  token?: string
): Promise<AuthResponse> {
  return postAPI<AuthResponse>("/api/auth/login", {
    email: email || undefined,
    token: token || undefined,
  });
}

/** Get current user info. */
export function getMe(): Promise<AuthResponse> {
  return fetchAPI<AuthResponse>("/api/auth/me");
}

/** List groups the current user belongs to. */
export function listGroups(): Promise<GroupResponse[]> {
  return fetchAPI<GroupResponse[]>("/api/groups");
}

/** Get group details including members with health data. */
export function getGroupDetail(groupId: string): Promise<GroupDetailResponse> {
  return fetchAPI<GroupDetailResponse>(`/api/groups/${groupId}`);
}

/** Get real-time group pulse summary. */
export function getGroupPulse(groupId: string): Promise<GroupPulseResponse> {
  return fetchAPI<GroupPulseResponse>(`/api/groups/${groupId}/pulse`);
}

/** Create a new group. */
export function createGroup(
  name: string,
  description?: string,
  type: "family" | "community" = "family"
): Promise<GroupResponse> {
  return postAPI<GroupResponse>("/api/groups", { name, description, type });
}

/** Join a group via invite code. */
export function joinGroup(
  groupId: string,
  inviteCode: string
): Promise<JoinGroupResponse> {
  return postAPI<JoinGroupResponse>(`/api/groups/${groupId}/join`, {
    invite_code: inviteCode,
  });
}

/** Join a group by invite code only (server finds group). */
export function joinGroupByCode(
  inviteCode: string
): Promise<JoinGroupResponse> {
  return postAPI<JoinGroupResponse>(`/api/groups/_/join`, {
    invite_code: inviteCode,
  });
}

/** Get latest health data for a specific user. */
export function getLatestHealth(userId: string): Promise<HealthLatest> {
  return fetchAPI<HealthLatest>(`/api/health/${userId}/latest`);
}

/** Get group members' health data. */
export function getGroupHealth(
  groupId: string
): Promise<{ group_id: string; members: HealthLatest[] }> {
  return fetchAPI(`/api/health/groups/${groupId}/health`);
}

/** Remove a member from a group. */
export function removeMember(
  groupId: string,
  userId: string
): Promise<{ message: string }> {
  return deleteAPI(`/api/groups/${groupId}/members/${userId}`);
}
