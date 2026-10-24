/** Typed API client for OpenLearn Commons. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface Reuse { can_adapt: boolean; can_redistribute: boolean; can_commercial: boolean; obligation: string; uncertain: boolean }
export interface Resource {
  id: number; uid: string; title: string; resource_type: string; subject: string; level: string;
  language: string; duration_min: number; connectivity: string; accessibility: string;
  creator: string; license: string; attribution: string; source_url: string;
  host_status: string; review_status: string; description: string; reuse: Reuse; offline_note: string;
}
export interface ResourceDetail extends Resource { body: string }
export interface Translation {
  id: number; language: string; status: string; machine: boolean; target_text: string; reviewer_note: string;
}
export interface AdaptationDetail {
  id: number; title: string; body: string; status: string; license: string;
  source: { id: number; title: string; license: string; attribution: string };
  translations: Translation[];
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
  resources: (q = '') => request<Resource[]>(`/api/resources${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  resource: (id: number) => request<ResourceDetail>(`/api/resources/${id}`),
  createResource: (body: Record<string, unknown>) => request<{ id: number }>('/api/resources', json({ ...body, rights_confirmed: 'yes' })),
  review: (id: number, status: string) => request<{ review_status: string }>(`/api/resources/${id}/review`, json({ status })),
  adapt: (id: number, title: string, body: string) =>
    request<{ id: number; license_obligation: string }>(`/api/resources/${id}/adaptations`, json({ title, body })),
  adaptation: (id: number) => request<AdaptationDetail>(`/api/adaptations/${id}`),
  addTranslation: (adaptationId: number, language: string, target_text: string, machine: string) =>
    request<{ id: number; label: string }>(`/api/adaptations/${adaptationId}/translations`, json({ language, target_text, machine })),
  transition: (translationId: number, status: string, note = '') =>
    request<{ status: string }>(`/api/translations/${translationId}/transition`, json({ status, note })),
  createCollection: (title: string, item_ids: number[]) => request<{ id: number }>('/api/collections', json({ title, item_ids })),
  collectionAttribution: (id: number) => request<{ collection: string; attribution: string }>(`/api/collections/${id}/attribution`),
  report: (id: number, reason: string) => request<{ id: number; status: string }>(`/api/resources/${id}/reports`, json({ reason })),
};
