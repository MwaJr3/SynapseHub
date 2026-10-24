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

export interface Finding {
  id: number; rule_id: string; title: string; severity: string; cwe: string
  path: string; line: number; evidence: string; explanation: string
  suggested_fix: string; triage: string
}
export interface ProjectRow {
  id: number; name: string; source_kind: string; run_id: number
  findings: number; files_scanned: number
}

export const api = {
  register: (email: string, password: string) =>
    req<{ ok: boolean }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    req<{ ok: boolean; email: string; role: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req<{ email: string; role: string }>("/api/me"),
  projects: () => req<{ projects: ProjectRow[] }>("/api/projects"),
  scanPaste: (name: string, files: Array<{ path: string; content: string }>, projectId?: number) =>
    req<{ project_id: number; run_id: number; findings: number; files_scanned: number; limitations: string }>(
      "/api/projects/paste", { method: "POST", body: JSON.stringify({ name, files, project_id: projectId ?? null }) }),
  scanArchive: (name: string, file: File) => {
    const form = new FormData()
    form.append("file", file)
    return req<{ project_id: number; run_id: number; findings: number; files_scanned: number; limitations: string }>(
      `/api/projects/archive?name=${encodeURIComponent(name)}`, { method: "POST", body: form })
  },
  findings: (runId: number, severity: string, triage: string) =>
    req<{ findings: Finding[] }>(`/api/runs/${runId}/findings?severity=${severity}&triage=${triage}`),
  triage: (findingId: number, triage: string, note: string) =>
    req<{ id: number; triage: string }>(`/api/findings/${findingId}/triage`, { method: "PATCH", body: JSON.stringify({ triage, note }) }),
  report: (runId: number) => req<Record<string, unknown>>(`/api/runs/${runId}/report`),
  aiReview: (runId: number, consent: boolean) =>
    req<{ sent: boolean; reason: string }>("/api/ai-review", { method: "POST", body: JSON.stringify({ run_id: runId, consent }) }),
}
