export interface LookupInfo {
  provider: string
  verdict: string
  detections: number | null
  total_engines: number | null
  looked_up_at: string
  raw_summary: string
  available: boolean
  error: string
}

export interface HashRecordDetail {
  id: number
  filename: string
  size: number
  sha256: string
  sha1: string
  md5: string
  combined_verdict: string
  disposition: string
  created_at: string
  lookups: LookupInfo[]
  disclaimer: string
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(detail.error ?? `request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  register: (email: string, password: string) =>
    req<{ ok: boolean }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    req<{ ok: boolean; email: string; role: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => req<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => req<{ email: string; role: string }>("/api/me"),
  analyzeUpload: (file: File, confirmExternal: boolean) => {
    const form = new FormData()
    form.append("file", file)
    return req<HashRecordDetail>(`/api/analyze/upload?confirm_external=${confirmExternal}`, { method: "POST", body: form })
  },
  records: (q: string, verdict: string) =>
    req<{ records: Array<Partial<HashRecordDetail>>; disclaimer: string }>(
      `/api/records?q=${encodeURIComponent(q)}&verdict=${encodeURIComponent(verdict)}`),
  record: (id: number) => req<HashRecordDetail>(`/api/records/${id}`),
  setDisposition: (id: number, disposition: string) =>
    req<{ ok: boolean }>(`/api/records/${id}`, { method: "PATCH", body: JSON.stringify({ disposition }) }),
  report: (id: number) => req<Record<string, unknown>>(`/api/records/${id}/report`),
  createCase: (title: string, recordId: number | null) =>
    req<{ id: number }>("/api/cases", { method: "POST", body: JSON.stringify({ title, record_id: recordId }) }),
  cases: () => req<{ cases: Array<{ id: number; title: string; record_id: number | null; disposition: string; created_at: string }> }>("/api/cases"),
  addNote: (caseId: number, body: string) =>
    req<{ id: number }>(`/api/cases/${caseId}/notes`, { method: "POST", body: JSON.stringify({ body }) }),
  caseNotes: (caseId: number) =>
    req<{ notes: Array<{ id: number; author: string; body: string; created_at: string }> }>(`/api/cases/${caseId}/notes`),
}
