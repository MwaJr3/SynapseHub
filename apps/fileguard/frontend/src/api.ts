/** Typed API client for FileGuard. Cookie-session auth. */

export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface Workspace {
  id: number;
  name: string;
  description: string;
  created_at: string | null;
  file_count: number;
  baseline_count: number;
  scan_count: number;
}

export interface StoredFile {
  id: number;
  display_name: string;
  size_bytes: number;
  file_type: string;
  sha256: string;
  uploaded_at: string | null;
}

export interface Baseline {
  id: number;
  name: string;
  version: number;
  created_at: string | null;
  entry_count: number;
}

export interface Scan {
  id: number;
  baseline_id: number;
  created_at: string | null;
  matched_count: number;
  summary: { matched: number; changed: number; missing: number; new: number };
}

export interface Finding {
  id: number;
  scan_id?: number;
  display_name: string;
  kind: 'changed' | 'missing' | 'new';
  severity: string;
  expected_sha256: string;
  observed_sha256: string;
  explanation: string;
  reviewed: boolean;
  notes: string;
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
      if (body.detail) message = body.detail;
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

  workspaces: () => request<Workspace[]>('/api/workspaces'),
  createWorkspace: (name: string, description: string) => request<{ id: number }>('/api/workspaces', json({ name, description })),
  updateWorkspace: (id: number, name: string, description: string) =>
    request<{ id: number }>(`/api/workspaces/${id}`, { method: 'PATCH', ...json({ name, description }) }),
  deleteWorkspace: (id: number) => request<{ ok: boolean }>(`/api/workspaces/${id}`, { method: 'DELETE' }),

  files: (workspaceId: number) => request<StoredFile[]>(`/api/workspaces/${workspaceId}/files`),
  uploadFile: (workspaceId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ id: number; sha256: string }>(`/api/workspaces/${workspaceId}/files`, { method: 'POST', body: form });
  },
  deleteFile: (id: number) => request<{ ok: boolean }>(`/api/files/${id}`, { method: 'DELETE' }),

  baselines: (workspaceId: number) => request<Baseline[]>(`/api/workspaces/${workspaceId}/baselines`),
  createBaseline: (workspaceId: number, name: string) =>
    request<{ id: number; version: number }>(`/api/workspaces/${workspaceId}/baselines?name=${encodeURIComponent(name)}`, { method: 'POST' }),
  deleteBaseline: (id: number) => request<{ ok: boolean }>(`/api/baselines/${id}`, { method: 'DELETE' }),

  scans: (workspaceId: number) => request<Scan[]>(`/api/workspaces/${workspaceId}/scans`),
  runScan: (baselineId: number) => request<{ id: number } & Scan['summary']>(`/api/baselines/${baselineId}/scans`, { method: 'POST' }),
  scanFindings: (scanId: number) => request<Finding[]>(`/api/scans/${scanId}/findings`),
  workspaceFindings: (workspaceId: number) => request<Finding[]>(`/api/workspaces/${workspaceId}/findings`),
  updateFinding: (id: number, reviewed: boolean, notes: string, severity: string) =>
    request<{ id: number }>(`/api/findings/${id}`, { method: 'PATCH', ...json({ reviewed, notes, severity }) }),
};
