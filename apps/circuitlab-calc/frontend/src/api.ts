/** Typed API client for CircuitLab Calc. */
export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface CalcResult {
  quantity: string;
  value: number | Record<string, number>;
  unit: string;
  steps: string[];
  assumption?: string;
}

export interface SavedCalc {
  id: number;
  uid: string;
  name: string;
  kind: string;
  inputs: Record<string, unknown>;
  result: Record<string, unknown>;
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

  calc: (tool: string, body: unknown) => request<CalcResult>(`/api/calc/${tool}`, json(body)),
  calculations: () => request<SavedCalc[]>('/api/calculations'),
  saveCalculation: (name: string, kind: string, inputs: unknown, result: unknown) =>
    request<{ id: number }>('/api/calculations', json({ name, kind, inputs, result })),
  deleteCalculation: (id: number) => request<{ ok: boolean }>(`/api/calculations/${id}`, { method: 'DELETE' }),
};
