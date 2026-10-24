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

export interface FeedRow {
  id: number; name: string; kind: string; enabled: boolean
  interval_minutes: number; last_run_at: string
}
export interface IndicatorRow {
  id: number; value: string; kind: string; triage: string; verdict: string
  case_ref: string; first_seen: string; last_seen: string
  sources: string[]; source_count: number; framing: string
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
  feeds: () => req<{ feeds: FeedRow[] }>("/api/feeds"),
  createFeed: (name: string, kind: string) =>
    req<{ id: number }>("/api/feeds", { method: "POST", body: JSON.stringify({ name, kind }) }),
  runFeed: (id: number) =>
    req<{ run_id: number; status: string; note: string }>(`/api/feeds/${id}/run`, { method: "POST" }),
  feedRuns: (id: number) =>
    req<{ runs: Array<{ id: number; started_at: string; status: string; fetched: number; new: number; merged: number; errors: number; note: string }> }>(`/api/feeds/${id}/runs`),
  ingest: (feedId: number, text: string) =>
    req<{ run_id: number; fetched: number; new: number; merged: number; errors: number }>(
      "/api/ingest/file", { method: "POST", body: JSON.stringify({ feed_id: feedId, text }) }),
  indicators: (q: string, triage: string, kind: string) =>
    req<{ indicators: IndicatorRow[]; disclaimer: string }>(
      `/api/indicators?q=${encodeURIComponent(q)}&triage=${encodeURIComponent(triage)}&kind=${encodeURIComponent(kind)}`),
  indicator: (id: number) =>
    req<IndicatorRow & { notes: string; disclaimer: string }>(`/api/indicators/${id}`),
  patch: (id: number, triage: string, caseRef: string, notes: string) =>
    req<{ id: number }>(`/api/indicators/${id}`, {
      method: "PATCH", body: JSON.stringify({ triage, case_ref: caseRef, notes }),
    }),
  report: (id: number) => req<Record<string, unknown>>(`/api/indicators/${id}/report`),
}
