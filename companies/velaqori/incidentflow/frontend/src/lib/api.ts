async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(detail.error ?? `request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export interface IncidentRow {
  id: number; title: string; kind: string; severity: string
  status: string; assignee: string; created_at: string
}
export interface IncidentDetail extends IncidentRow {
  description: string
  timeline: Array<{ at: string; actor: string; entry: string }>
  evidence: Array<{ id: number; filename: string; sha256: string; size: number; collected_by: string; notes: string }>
  tasks: Array<{ id: number; title: string; assignee: string; status: string }>
  disclaimer: string
}

export const api = {
  register: (email: string, password: string, role = "responder") =>
    req<{ ok: boolean }>("/api/auth/register", {
      method: "POST", body: JSON.stringify({ email, password, role }),
    }),
  login: (email: string, password: string, mfaCode = "") =>
    req<{ ok: boolean; email: string; role: string; mfa_enabled: boolean }>("/api/auth/login", {
      method: "POST", body: JSON.stringify({ email, password, mfa_code: mfaCode }),
    }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => req<{ email: string; role: string; mfa_enabled: boolean }>("/api/me"),
  resetRequest: (email: string) =>
    req<{ ok: boolean; dev_token?: string; dev_note?: string; note: string }>("/api/auth/reset/request", {
      method: "POST", body: JSON.stringify({ email }),
    }),
  resetConfirm: (token: string, newPassword: string) =>
    req<{ ok: boolean; note: string }>("/api/auth/reset/confirm", {
      method: "POST", body: JSON.stringify({ token, new_password: newPassword }),
    }),
  incidents: (status: string) =>
    req<{ incidents: IncidentRow[] }>(`/api/incidents?status=${encodeURIComponent(status)}`),
  incident: (id: number) => req<IncidentDetail>(`/api/incidents/${id}`),
  create: (title: string, kind: string, severity: string, description: string) =>
    req<{ id: number; status: string }>("/api/incidents", {
      method: "POST", body: JSON.stringify({ title, kind, severity, description }),
    }),
  transition: (id: number, target: string, note: string) =>
    req<{ id: number; status: string }>(`/api/incidents/${id}/transition`, {
      method: "POST", body: JSON.stringify({ target, note }),
    }),
  addEvent: (id: number, entry: string) =>
    req<{ ok: boolean }>(`/api/incidents/${id}/events`, { method: "POST", body: JSON.stringify({ entry }) }),
  addTask: (id: number, title: string, assignee: string) =>
    req<{ id: number }>(`/api/incidents/${id}/tasks`, { method: "POST", body: JSON.stringify({ title, assignee }) }),
  updateTask: (taskId: number, status: string) =>
    req<{ id: number }>(`/api/tasks/${taskId}?status=${status}`, { method: "PATCH" }),
  assign: (id: number, assignee: string) =>
    req<{ id: number }>(`/api/incidents/${id}/assign`, { method: "POST", body: JSON.stringify({ assignee }) }),
  addEvidence: (id: number, filename: string, content: string, notes: string) =>
    req<{ id: number; sha256: string; note: string }>(`/api/incidents/${id}/evidence`, {
      method: "POST", body: JSON.stringify({ filename, content, notes }),
    }),
  report: (id: number) => req<Record<string, unknown>>(`/api/incidents/${id}/report`),
  audit: () => req<{ events: Array<{ at: string; actor: string; action: string; detail: string }>; note: string }>("/api/audit"),
}
