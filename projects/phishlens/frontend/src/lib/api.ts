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

export interface MessageRow {
  id: number; subject: string; from_header: string; worst_severity: string
  finding_count: number; disposition: string; created_at: string
}
export interface Finding {
  code: string; severity: string; title: string; explanation: string; evidence: string
}
export interface MessageDetail extends MessageRow {
  findings: Finding[]; disclaimer: string
}

export const api = {
  register: (email: string, password: string) =>
    req<{ ok: boolean }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
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
  mfaEnroll: () => req<{ secret: string; otpauth_url: string; note: string }>("/api/auth/mfa/enroll", { method: "POST" }),
  mfaEnable: (code: string) => req<{ ok: boolean; mfa_enabled: boolean }>("/api/auth/mfa/enable", { method: "POST", body: JSON.stringify({ code }) }),
  analyze: (raw: string, subject: string) =>
    req<{ id: number; worst_severity: string; findings: number; disclaimer: string }>("/api/messages", {
      method: "POST", body: JSON.stringify({ raw, subject, source_kind: "paste" }),
    }),
  messages: (q: string, severity: string) =>
    req<{ messages: MessageRow[]; disclaimer: string }>(
      `/api/messages?q=${encodeURIComponent(q)}&severity=${encodeURIComponent(severity)}`),
  message: (id: number) => req<MessageDetail>(`/api/messages/${id}`),
  setDisposition: (id: number, disposition: string) =>
    req<{ id: number }>(`/api/messages/${id}`, { method: "PATCH", body: JSON.stringify({ disposition }) }),
  notes: (id: number) => req<{ notes: Array<{ id: number; body: string; created_at: string }> }>(`/api/messages/${id}/notes`),
  addNote: (id: number, body: string) =>
    req<{ id: number }>(`/api/messages/${id}/notes`, { method: "POST", body: JSON.stringify({ body }) }),
  report: (id: number) => req<Record<string, unknown>>(`/api/messages/${id}/report`),
}
