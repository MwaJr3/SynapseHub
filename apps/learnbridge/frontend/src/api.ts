/** Typed API client for LearnBridge. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface Course {
  id: number; slug: string; title: string; subject: string; level: string; language: string;
  est_minutes: number; accessibility: string; license: string; attribution: string;
  description: string; version: string; archived: string; enrolled: boolean; lesson_count: number;
}
export interface LessonSummary { id: number; title: string; position: number; est_minutes: number; version: string; quiz_ids: number[] }
export interface CourseDetail extends Course { modules: { id: number; title: string; position: number; lessons: LessonSummary[] }[] }
export interface ContentBlock { kind: string; body?: string; url?: string; note?: string }
export interface LessonDetail {
  id: number; title: string; content: ContentBlock[]; requirements: Record<string, number>;
  est_minutes: number; version: string; state: string; quiz_score: number | null;
  notes: { id: number; body: string }[]; bookmarked: boolean;
  offline: { available_for_download: boolean; note: string };
}
export interface QuizDetail {
  id: number; title: string; settings: Record<string, string>;
  questions: { id: number; kind: string; prompt: string; choices: string[]; position: number }[];
}
export interface AttemptResult {
  score: number; passed: boolean; results: { question_id: number; correct: boolean; explanation: string }[];
}
export interface ProgressRow { course_id: number; course_title: string; total_lessons: number; completed: number; states: Record<string, string> }
export interface SyncStatus {
  pending_conflicts: number; last_sync: string | null;
  events: { id: number; kind: string; ref_id: number; status: string; payload: Record<string, unknown>; server_snapshot: Record<string, unknown>; created_at: string }[];
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

  courses: (q = '') => request<Course[]>(`/api/courses${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  course: (id: number) => request<CourseDetail>(`/api/courses/${id}`),
  enroll: (id: number) => request<{ id: number }>(`/api/courses/${id}/enroll`, { method: 'POST' }),
  pack: (id: number) => request<Record<string, unknown>>(`/api/courses/${id}/pack`),
  lesson: (id: number) => request<LessonDetail>(`/api/lessons/${id}`),
  quiz: (id: number) => request<QuizDetail>(`/api/quizzes/${id}`),
  submitAttempt: (quizId: number, responses: Record<string, unknown>) =>
    request<AttemptResult>(`/api/quizzes/${quizId}/attempts`, json({ responses })),
  myProgress: () => request<ProgressRow[]>('/api/my/progress'),
  putProgress: (lesson_id: number, event: string) => request<{ state: string }>('/api/my/progress', { method: 'PUT', ...json({ lesson_id, event }) }),
  addNote: (lesson_id: number, body: string) => request<{ id: number }>('/api/my/notes', json({ lesson_id, body })),
  toggleBookmark: (lesson_id: number) => request<{ bookmarked: boolean }>(`/api/my/bookmarks/${lesson_id}`, { method: 'POST' }),
  syncStatus: () => request<SyncStatus>('/api/sync/status'),
  resolveSync: (id: number, resolution: string) => request<{ status: string }>(`/api/sync/${id}/resolve`, json({ resolution })),
};
