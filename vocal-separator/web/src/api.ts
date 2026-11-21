import type {
  ExportFormat,
  Health,
  JobDetail,
  JobResults,
  JobSummary,
  ModelRecord,
  PitchData,
  ProjectDetail,
  ProjectSummary,
  Session,
  Stem,
  UploadResponse,
} from './types';

const SESSION_KEY = 'vocal-separator-session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed.token && parsed.user ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: Session | null): void {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      return body.detail
        .map((item) =>
          typeof item === 'object' && item !== null && 'msg' in item
            ? String((item as { msg: unknown }).msg)
            : JSON.stringify(item),
        )
        .join('; ');
    }
  } catch {
    // Fall through to the HTTP status.
  }
  return `Request failed (${response.status})`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(path, { ...init, headers });
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as T;
}

export const api = {
  health: () => request<Health>('/api/health'),
  register: (email: string, password: string) =>
    request<Session>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<Session>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  projects: (token: string) => request<ProjectSummary[]>('/api/projects', {}, token),
  createProject: (token: string, title: string) =>
    request<{ id: number; title: string }>(
      '/api/projects',
      { method: 'POST', body: JSON.stringify({ title }) },
      token,
    ),
  deleteProject: (token: string, projectId: number) =>
    request<{ deleted: boolean }>(
      `/api/projects/${projectId}`,
      { method: 'DELETE' },
      token,
    ),
  project: (token: string, projectId: number) =>
    request<ProjectDetail>(`/api/projects/${projectId}`, {}, token),
  upload: (token: string, projectId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadResponse>(
      `/api/projects/${projectId}/audio`,
      { method: 'POST', body: form },
      token,
    );
  },
  createJob: (
    token: string,
    body: {
      audio_file_id: number;
      quality: string;
      profile: string;
      engine: string;
      vocal_analysis: boolean;
      all_voice_parts?: boolean;
      voice_parts?: string[];
    },
  ) => request<JobSummary>('/api/jobs', { method: 'POST', body: JSON.stringify(body) }, token),
  job: (token: string, jobId: number) =>
    request<JobDetail>(`/api/jobs/${jobId}`, {}, token),
  cancelJob: (token: string, jobId: number) =>
    request<JobSummary>(`/api/jobs/${jobId}/cancel`, { method: 'POST' }, token),
  results: (token: string, jobId: number) =>
    request<JobResults>(`/api/jobs/${jobId}/results`, {}, token),
  pitch: (token: string, jobId: number) =>
    request<PitchData>(`/api/jobs/${jobId}/pitch`, {}, token),
  models: (token: string) => request<ModelRecord[]>('/api/models', {}, token),
  adminStats: (token: string) =>
    request<Record<string, unknown>>('/api/admin/stats', {}, token),
  toggleModel: (token: string, name: string, enabled: boolean) =>
    request<{ ok: boolean }>(
      `/api/admin/models/${encodeURIComponent(name)}`,
      { method: 'PATCH', body: JSON.stringify({ enabled }) },
      token,
    ),
  patchStem: (
    token: string,
    stemId: number,
    body: { user_label?: string; voice_classification?: string },
  ) =>
    request<{ ok: boolean; note: string }>(
      `/api/stems/${stemId}`,
      { method: 'PATCH', body: JSON.stringify(body) },
      token,
    ),
  deleteStem: (token: string, stemId: number) =>
    request<{ deleted: boolean }>(`/api/stems/${stemId}`, { method: 'DELETE' }, token),
  /** Practice mix: the song with one stem taken out. Idempotent per stem. */
  createMinusOne: (token: string, jobId: number, without: string) =>
    request<Stem>(
      `/api/jobs/${jobId}/minus-one`,
      { method: 'POST', body: JSON.stringify({ without }) },
      token,
    ),
  createExport: (token: string, jobId: number, format: ExportFormat) =>
    request<{ download_url: string }>(
      '/api/exports',
      { method: 'POST', body: JSON.stringify({ job_id: jobId, format }) },
      token,
    ),
};
