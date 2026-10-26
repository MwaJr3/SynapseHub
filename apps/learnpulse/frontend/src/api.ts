/** Typed API client for LearnPulse. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface Dashboard {
  summary: {
    events: number; learners: number; lesson_completions: number; quiz_attempts: number;
    quiz_avg: number | null; assignments_submitted: number; assignments_missing: number;
    help_requests: number; by_topic: Record<string, number>;
  };
  date_from: string; date_to: string; note: string;
}
export interface Flag {
  id: number; rule_key: string; learner_ref: string;
  evidence: { rule?: string; count?: number; topic?: string; event_uids?: string[] };
  status: string; note: string;
}
export interface ImportResult { import_id: number; rows_ok: number; rows_rejected: number; rejected: { line: number; reason: string }[] }

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'same-origin', ...init });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try { const body = (await response.json()) as { detail?: string }; if (typeof body.detail === 'string') message = body.detail; } catch { /* non-JSON */ }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}
function json(body: unknown): RequestInit { return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }; }

export const api = {
  me: () => request<User>('/api/auth/me'),
  login: (email: string, password: string) => request<User>('/api/auth/login', json({ email, password })),
  register: (email: string, password: string, display_name: string, role: string) =>
    request<User>('/api/auth/register', json({ email, password, display_name, role })),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  dashboard: (date_from = '', date_to = '') =>
    request<Dashboard>(`/api/dashboard?date_from=${date_from}&date_to=${date_to}`),
  importCsv: (filename: string, csv_text: string) => request<ImportResult>('/api/imports', json({ filename, csv_text })),
  flags: () => request<Flag[]>('/api/flags'),
  evaluateFlags: () => request<{ created: number; note: string }>('/api/flags/evaluate', { method: 'POST' }),
  updateFlag: (id: number, status: string, note: string) =>
    request<{ status: string }>(`/api/flags/${id}`, { method: 'PATCH', ...json({ status, note }) }),
  events: () => request<{ uid: string; occurred_at: string; kind: string; learner_ref: string; topic: string; value: number | null }[]>('/api/events'),
};
