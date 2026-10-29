/** Typed API client for EduAccess. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface Plan { id: number; kind: string; price: number; evidence_required: string; window_start: string; window_end: string }
export interface Course { id: number; title: string; provider: string; description: string; plans: Plan[] }
export interface Application {
  id: number; uid: string; plan_id: number; learner_id: number | null; statement: string;
  status: string; decision_reason: string; pool_id: number | null; created_at: string | null;
}
export interface Pool {
  id: number; name: string; sponsor_id: number | null; seats_total: number;
  seats_committed: number; seats_available: number; criteria: string;
}
export interface LedgerBalance {
  settled_in: number; settled_out: number; balance: number;
  pending_not_settled: number; reversal_count: number; note: string;
}
export interface Ledger { balance: LedgerBalance; transactions: { id: number; kind: string; amount: number; status: string; reference: string; note: string; created_at: string | null }[] }

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
  courses: () => request<Course[]>('/api/courses'),
  apply: (plan_id: number, statement: string) => request<Application>('/api/applications', json({ plan_id, statement })),
  applications: () => request<Application[]>('/api/applications'),
  decide: (id: number, status: string, decision_reason: string, pool_id?: number) =>
    request<Application>(`/api/applications/${id}/decision`, json({ status, decision_reason, pool_id })),
  appeal: (id: number, reason: string) => request<{ id: number; status: string }>(`/api/applications/${id}/appeals`, json({ reason })),
  pools: () => request<Pool[]>('/api/pools'),
  createPool: (name: string, seats_total: number) => request<{ id: number }>('/api/pools', json({ name, seats_total })),
  ledger: () => request<Ledger>('/api/ledger'),
  createTransaction: (kind: string, amount: number, status: string) =>
    request<{ id: number }>('/api/ledger', json({ kind, amount, status })),
};
