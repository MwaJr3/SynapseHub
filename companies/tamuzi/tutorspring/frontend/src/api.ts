/** Typed API client for TutorSpring. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface ProviderConfig { provider: string; demo_mode: boolean; note: string; modes: string[] }
export interface Source { id: number; title: string; topic: string; grade: string; language: string; approved: string; body_preview: string }
export interface ChatReply {
  conversation_id: number; message_id: number; text: string;
  sources: { source_id: number; title: string; topic: string; score: number }[];
  supported: boolean; demo_response: boolean; provider: string; disclaimer: string;
}
export interface ConversationRow { id: number; topic: string; mode: string; created_at: string }
export interface ConversationDetail {
  id: number; topic: string; mode: string;
  messages: { id: number; role: string; text: string; sources: { source_id: number; title: string; topic: string }[]; demo_response: boolean; flagged: boolean; review_status: string }[];
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
  config: () => request<ProviderConfig>('/api/config'),
  sources: () => request<Source[]>('/api/sources'),
  createSource: (title: string, topic: string, body: string) =>
    request<{ id: number }>('/api/sources', json({ title, topic, body, approved: 'yes' })),
  chat: (mode: string, question: string, topic: string, conversation_id: number | null) =>
    request<ChatReply>('/api/chat', json({ mode, question, topic, conversation_id })),
  conversations: () => request<ConversationRow[]>('/api/conversations'),
  conversation: (id: number) => request<ConversationDetail>(`/api/conversations/${id}`),
  deleteConversation: (id: number) => request<{ ok: boolean }>(`/api/conversations/${id}`, { method: 'DELETE' }),
  flag: (id: number, reason: string) => request<{ status: string }>(`/api/messages/${id}/flag`, json({ reason })),
};
