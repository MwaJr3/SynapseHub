/** Typed API client for PathWise. */
export interface User { id: number; email: string; display_name: string; role: string }
export interface Skill { id: number; name: string; description: string; mastery_threshold: number; prereq_ids: number[] }
export interface MapRow {
  skill_id: number; name: string; status: string; score: number | null; confidence: string;
  evidence_count: number; next_review: string; prereq_ids: number[]; explanation: string;
}
export interface Recommendation { id: number; skill_id: number; rationale: string; evidence: Record<string, unknown>; status: string; override_reason: string }
export interface AssessmentRow { id: number; title: string; kind: string; version: string; question_count: number }
export interface AssessmentDetail {
  id: number; title: string; kind: string; version: string;
  questions: { id: number; skill_id: number; kind: string; prompt: string; choices: string[] }[];
}
export interface AttemptResult {
  attempt_id: number; score: number;
  per_question: { question_id: number; skill_id: number; credit: number; rubric: string }[];
  mastery: Record<string, { score: number; confidence: string }>;
  note: string;
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
  skills: () => request<Skill[]>('/api/skills'),
  map: () => request<MapRow[]>('/api/my/map'),
  recommendations: () => request<Recommendation[]>('/api/my/recommendations'),
  assessments: () => request<AssessmentRow[]>('/api/assessments'),
  assessment: (id: number) => request<AssessmentDetail>(`/api/assessments/${id}`),
  submit: (id: number, responses: Record<string, unknown>) =>
    request<AttemptResult>(`/api/assessments/${id}/attempts`, json({ responses })),
  override: (id: number, status: string, reason: string) =>
    request<{ status: string }>(`/api/recommendations/${id}`, { method: 'PATCH', ...json({ status, reason }) }),
  prePost: () => request<{ rows: { skill_id: number; pre: number | null; post: number | null; delta: number | null; improved: boolean; meets_threshold_now: boolean }[]; matched_skills: number; average_delta: number | null; note: string }>('/api/reports/pre-post'),
};
