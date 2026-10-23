/** Typed API client for DependSecure. Cookie-session auth. */

export interface User {
  id: number;
  email: string;
  display_name: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  repository_ref: string;
  created_at: string | null;
  manifest_count: number;
  scan_count: number;
  finding_count: number;
}

export interface Manifest {
  id: number;
  filename: string;
  kind: string;
  package_count: number;
  errors: { line_no: number; reason: string; raw: string }[];
  selected: boolean;
  uploaded_at: string | null;
}

export interface Scan {
  id: number;
  manifest_id: number;
  status: string;
  tool: string;
  started_at: string | null;
  finished_at: string | null;
  error: string;
  finding_count: number;
}

export interface Finding {
  id: number;
  scan_id: number;
  package: string;
  version: string;
  advisory_id: string;
  aliases: string[];
  source: string;
  description: string;
  fix_versions: string[];
  remediation: { status: string; assignee: string; notes: string; exception_reason: string };
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

  projects: () => request<Project[]>('/api/projects'),
  createProject: (name: string, description: string, repository_ref: string) =>
    request<{ id: number }>('/api/projects', json({ name, description, repository_ref })),
  updateProject: (id: number, name: string, description: string, repository_ref: string) =>
    request<{ id: number }>(`/api/projects/${id}`, { method: 'PATCH', ...json({ name, description, repository_ref }) }),
  deleteProject: (id: number) => request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  manifests: (projectId: number) => request<Manifest[]>(`/api/projects/${projectId}/manifests`),
  uploadManifest: (projectId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ id: number; package_count: number }>(`/api/projects/${projectId}/manifests`, { method: 'POST', body: form });
  },
  selectManifest: (id: number) => request<{ id: number }>(`/api/manifests/${id}/select`, { method: 'POST' }),
  deleteManifest: (id: number) => request<{ ok: boolean }>(`/api/manifests/${id}`, { method: 'DELETE' }),

  scans: (projectId: number) => request<Scan[]>(`/api/projects/${projectId}/scans`),
  runScan: (manifestId: number) =>
    request<{ id: number; status: string; findings: number; error: string }>(`/api/manifests/${manifestId}/scans`, { method: 'POST' }),
  scanFindings: (scanId: number) => request<Finding[]>(`/api/scans/${scanId}/findings`),
  projectFindings: (projectId: number) => request<Finding[]>(`/api/projects/${projectId}/findings`),
  setRemediation: (
    findingId: number,
    status: string,
    assignee: string,
    notes: string,
    exception_reason: string,
  ) =>
    request<{ id: number }>(`/api/findings/${findingId}/remediation`, {
      method: 'PUT',
      ...json({ status, assignee, notes, exception_reason }),
    }),
};
