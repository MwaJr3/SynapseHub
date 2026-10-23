/** Typed API client for SentinelCore. */
export interface User {
  id: number;
  email: string;
  display_name: string;
  role: string;
}

export interface Dashboard {
  role: string;
  events: number;
  alerts_open: number;
  incidents_by_status: Record<string, number>;
  incidents_by_severity: Record<string, number>;
  demo_data: boolean;
  workflow_note: string;
}

export interface EventRow {
  id: number;
  uid: string;
  occurred_at: string;
  source_ip: string;
  category: string;
  summary: string;
  severity: string;
}

export interface AlertRow {
  id: number;
  uid: string;
  status: string;
  note: string;
  rule_name: string;
  rule_severity: string;
  event: EventRow;
  created_at: string | null;
}

export interface IncidentRow {
  id: number;
  uid: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  assignee_id: number | null;
  assignee_name: string;
  resolution_note: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface IncidentDetail extends IncidentRow {
  workflow_note: string;
  allowed_transitions: string[];
  events: EventRow[];
}

export interface RuleRow {
  id: number;
  name: string;
  description: string;
  category_match: string;
  summary_contains: string;
  severity: string;
  enabled: string;
}

export interface AuditRow {
  id: number;
  actor_id: number | null;
  action: string;
  target: string;
  detail: string;
  created_at: string | null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (typeof body.detail === 'string') message = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

function json(body: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const api = {
  me: () => request<User>('/api/auth/me'),
  login: (email: string, password: string) => request<User>('/api/auth/login', json({ email, password })),
  register: (email: string, password: string, display_name: string) =>
    request<User>('/api/auth/register', json({ email, password, display_name })),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  dashboard: () => request<Dashboard>('/api/dashboard'),
  users: () => request<User[]>('/api/users'),
  setRole: (id: number, role: string) => request<{ id: number }>(`/api/users/${id}/role`, { method: 'PATCH', ...json({ role }) }),

  events: (q = '') => request<EventRow[]>(`/api/events${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createEvent: (body: Record<string, unknown>) => request<EventRow>('/api/events', json(body)),

  rules: () => request<RuleRow[]>('/api/rules'),
  createRule: (body: Record<string, unknown>) => request<{ id: number }>('/api/rules', json(body)),
  deleteRule: (id: number) => request<{ ok: boolean }>(`/api/rules/${id}`, { method: 'DELETE' }),
  evaluateRules: () => request<{ created: number; note: string }>('/api/rules/evaluate', { method: 'POST' }),

  alerts: (status = '') => request<AlertRow[]>(`/api/alerts${status ? `?status=${status}` : ''}`),
  updateAlert: (id: number, note: string) => request<{ id: number }>(`/api/alerts/${id}`, { method: 'PATCH', ...json({ note }) }),
  convertAlert: (id: number) => request<{ id: number }>(`/api/alerts/${id}/convert`, { method: 'POST' }),

  incidents: (status = '') => request<IncidentRow[]>(`/api/incidents${status ? `?status=${status}` : ''}`),
  incident: (id: number) => request<IncidentDetail>(`/api/incidents/${id}`),
  createIncident: (body: Record<string, unknown>) => request<IncidentRow>('/api/incidents', json(body)),
  transition: (id: number, status: string, resolution_note: string) =>
    request<IncidentRow>(`/api/incidents/${id}/transition`, json({ status, resolution_note })),
  patchIncident: (id: number, body: Record<string, unknown>) =>
    request<IncidentRow>(`/api/incidents/${id}`, { method: 'PATCH', ...json(body) }),

  audit: () => request<AuditRow[]>('/api/audit'),
};
