/** Typed API client for ClassConnect. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface ProviderStatus {
  available: boolean; provider: string | null; message: string;
  low_bandwidth: Record<string, string>;
}
export interface ClassRow { id: number; name: string; subject: string; description: string; teacher_id: number | null; member: boolean }
export interface SessionRow {
  id: number; class_id: number; title: string; objectives: string; start_at: string; end_at: string;
  status: string; recording_consent: string; summary: string;
}
export interface MessageRow { id: number; kind: string; body: string; hand_raised: boolean; user_id: number | null; created_at: string | null }

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
  provider: () => request<ProviderStatus>('/api/provider'),
  classes: () => request<ClassRow[]>('/api/classes'),
  createClass: (name: string, subject: string) => request<{ id: number }>('/api/classes', json({ name, subject })),
  joinClass: (id: number) => request<{ joined: boolean }>(`/api/classes/${id}/join`, { method: 'POST' }),
  sessions: (classId?: number) => request<SessionRow[]>(`/api/sessions${classId ? `?class_id=${classId}` : ''}`),
  createSession: (classId: number, title: string, start_at: string) =>
    request<SessionRow>(`/api/classes/${classId}/sessions`, json({ title, start_at })),
  transition: (id: number, status: string, summary = '') =>
    request<SessionRow>(`/api/sessions/${id}/transition`, json({ status, summary })),
  roomToken: (id: number) => request<{ token: string; expires_in_seconds: number; provider: ProviderStatus }>(`/api/sessions/${id}/room-token`, { method: 'POST' }),
  messages: (sessionId: number) => request<MessageRow[]>(`/api/sessions/${sessionId}/messages`),
  postMessage: (sessionId: number, kind: string, body: string) =>
    request<{ id: number }>(`/api/sessions/${sessionId}/messages`, json({ kind, body })),
  moderate: (messageId: number, action: string) => request<{ visible: boolean }>(`/api/messages/${messageId}/moderate`, json({ action })),
  attendance: (sessionId: number) => request<{ counts: Record<string, number>; total: number }>(`/api/sessions/${sessionId}/attendance`),
  assignments: (sessionId: number) => request<{ id: number; title: string; body: string }[]>(`/api/sessions/${sessionId}/assignments`),
  submit: (assignmentId: number, body: string) => request<{ id: number }>(`/api/assignments/${assignmentId}/submissions`, json({ body })),
};
