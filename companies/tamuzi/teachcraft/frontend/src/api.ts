/** Typed API client for TeachCraft. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface LessonRow { id: number; title: string; status: string; version: number; unit_id: number; objective: string }
export interface LessonDetail {
  id: number; title: string; objective: string; blocks: Record<string, unknown>[]; template: string;
  est_minutes: number; status: string; version: number;
  versions: { version: number; change_summary: string; title: string }[];
  comments: { id: number; body: string; resolved: boolean }[];
}
export interface Question { id: number; kind: string; prompt: string; choices: string[]; answer: unknown; tags: string }

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
  lessons: (status = '') => request<LessonRow[]>(`/api/lessons${status ? `?status=${status}` : ''}`),
  lesson: (id: number) => request<LessonDetail>(`/api/lessons/${id}`),
  createLesson: (unit_id: number, title: string, template: string) =>
    request<{ id: number; version: number }>(`/api/units/${unit_id}/lessons`, json({ title, template })),
  editLesson: (id: number, title: string, blocks: Record<string, unknown>[], change_summary: string) =>
    request<{ version: number }>(`/api/lessons/${id}`, { method: 'PATCH', ...json({ title, blocks, change_summary }) }),
  transition: (id: number, status: string) => request<{ status: string }>(`/api/lessons/${id}/transition`, json({ status })),
  restore: (id: number, version: number) => request<{ version: number; status: string }>(`/api/lessons/${id}/restore/${version}`, { method: 'POST' }),
  addComment: (id: number, body: string) => request<{ id: number }>(`/api/lessons/${id}/comments`, json({ body })),
  questions: () => request<Question[]>('/api/questions'),
  createQuestion: (kind: string, prompt: string, choices: unknown[], answer: unknown) =>
    request<{ id: number }>('/api/questions', json({ kind, prompt, choices, answer })),
  courses: () => request<{ id: number; title: string; subject: string; grade: string }[]>('/api/courses'),
  createCourse: (title: string) => request<{ id: number }>('/api/courses', json({ title })),
  createUnit: (course_id: number, title: string) => request<{ id: number }>(`/api/courses/${course_id}/units`, json({ title })),
};
