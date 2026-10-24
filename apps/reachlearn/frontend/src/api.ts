/** Typed API client for ReachLearn. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface ProviderStatus { provider: string; simulator: boolean; message: string }
export interface Lesson {
  id: number; title: string; topic: string; sequence: number; body: string;
  question: string; options: string[]; language: string;
}
export interface Preview {
  channel: string; segments?: number; charset?: string; parts?: string[];
  menu?: string; script?: string; body?: string; options?: string[];
}
export interface Job {
  id: number; channel: string; kind: string; state: string; simulator: boolean;
  body: string; provider_uid: string;
}

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
  lessons: () => request<Lesson[]>('/api/lessons'),
  preview: (id: number, channel: string) => request<Preview>(`/api/lessons/${id}/preview?channel=${channel}`),
  jobs: () => request<Job[]>('/api/jobs'),
  createJob: (body: Record<string, unknown>) =>
    request<{ id: number; state: string; blocked_reason?: string; provider_note?: string }>('/api/jobs', json(body)),
};
