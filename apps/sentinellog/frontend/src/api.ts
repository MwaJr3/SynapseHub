/** Typed API client for the SentinelLog backend. Cookie-session auth. */

export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface Dataset {
  id: number;
  name: string;
  original_filename: string;
  file_format: string;
  size_bytes: number;
  record_count: number;
  error_count: number;
  uploaded_at: string | null;
  notes: string;
  parse_errors?: { line_no: number; reason: string; raw: string }[];
}

export interface LogEvent {
  id: number;
  line_no: number;
  timestamp: string | null;
  event_type: string;
  username: string;
  source_ip: string;
  source_system: string;
  message: string;
  raw: string;
}

export interface Finding {
  id: number;
  rule_name: string;
  severity: string;
  classification: string;
  title: string;
  explanation: string;
  evidence: Record<string, unknown>;
  status: string;
  notes: string;
  created_at: string | null;
}

export interface Rule {
  id: number;
  name: string;
  rule_type: string;
  threshold: number;
  window_minutes: number;
  severity: string;
  enabled: boolean;
  description: string;
  runbook: string;
}

export interface RuleDraft {
  name: string;
  rule_type: string;
  threshold: number;
  window_minutes: number;
  severity: string;
  enabled: boolean;
  description: string;
  runbook: string;
}

export interface Report {
  id: number;
  dataset_id: number;
  generated_at: string | null;
  summary: {
    dataset: Record<string, unknown>;
    counts: {
      total_events: number;
      successful_logins: number;
      failed_logins: number;
      errors: number;
      other_events: number;
      suspicious_patterns: number;
      by_severity: Record<string, number>;
    };
    top_usernames: [string, number][];
    top_source_ips: [string, number][];
    findings: { id: number; rule_name: string; severity: string; classification: string; title: string; explanation: string; status: string }[];
    disclaimer: string;
  };
}

export interface TimelineBucket {
  bucket: string;
  auth_success: number;
  auth_failure: number;
  error: number;
  info: number;
  total: number;
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
      if (body.detail) message = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const api = {
  me: () => request<User>('/api/auth/me'),
  login: (email: string, password: string) => request<User>('/api/auth/login', json({ email, password })),
  register: (email: string, password: string, display_name: string) =>
    request<User>('/api/auth/register', json({ email, password, display_name })),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  datasets: () => request<Dataset[]>('/api/datasets'),
  dataset: (id: number) => request<Dataset>(`/api/datasets/${id}`),
  deleteDataset: (id: number) => request<{ ok: boolean }>(`/api/datasets/${id}`, { method: 'DELETE' }),
  uploadDataset: (file: File, name: string) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ id: number; record_count: number; error_count: number }>(
      `/api/datasets?name=${encodeURIComponent(name)}`,
      { method: 'POST', body: form },
    );
  },
  events: (datasetId: number, params: { q?: string; event_type?: string; username?: string; source_ip?: string; page?: number; page_size?: number }) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    return request<{ total: number; page: number; page_size: number; events: LogEvent[] }>(
      `/api/datasets/${datasetId}/events?${search.toString()}`,
    );
  },
  timeline: (datasetId: number) => request<TimelineBucket[]>(`/api/datasets/${datasetId}/timeline`),
  analyze: (datasetId: number) => request<{ findings_created: number }>(`/api/datasets/${datasetId}/analyze`, { method: 'POST' }),
  findings: (datasetId: number) => request<Finding[]>(`/api/datasets/${datasetId}/findings`),
  updateFinding: (id: number, status: string, notes: string) =>
    request<Finding>(`/api/findings/${id}`, { method: 'PATCH', ...json({ status, notes }) }),

  rules: () => request<Rule[]>('/api/rules'),
  createRule: (draft: RuleDraft) => request<{ id: number }>('/api/rules', json(draft)),
  updateRule: (id: number, draft: RuleDraft) => request<{ id: number }>(`/api/rules/${id}`, { method: 'PUT', ...json(draft) }),
  deleteRule: (id: number) => request<{ ok: boolean }>(`/api/rules/${id}`, { method: 'DELETE' }),
  testRule: (id: number, datasetId: number) =>
    request<Omit<Finding, 'id' | 'status' | 'notes' | 'created_at'>[]>(`/api/rules/${id}/test?dataset_id=${datasetId}`, { method: 'POST' }),

  reports: () => request<Report[]>('/api/reports'),
  generateReport: (datasetId: number) => request<Report>(`/api/datasets/${datasetId}/reports`, { method: 'POST' }),
};
