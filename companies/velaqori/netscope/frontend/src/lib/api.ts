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

export interface CaptureRow {
  id: number; filename: string; label: string; status: string
  packet_count: number; byte_count: number; created_at: string
}
export interface CaptureDetail extends CaptureRow {
  error: string; summary: Record<string, unknown>; disclaimer: string
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
  upload: (file: File, label: string) => {
    const form = new FormData()
    form.append("file", file)
    return req<{ id: number; status: string; note: string }>(
      `/api/captures?label=${encodeURIComponent(label)}`, { method: "POST", body: form })
  },
  captures: () => req<{ captures: CaptureRow[] }>("/api/captures"),
  capture: (id: number) => req<CaptureDetail>(`/api/captures/${id}`),
  setLabel: (id: number, label: string) =>
    req<{ id: number }>(`/api/captures/${id}`, { method: "PATCH", body: JSON.stringify({ label }) }),
  remove: (id: number) => req<{ ok: boolean }>(`/api/captures/${id}`, { method: "DELETE" }),
  report: (id: number) => req<Record<string, unknown>>(`/api/captures/${id}/report`),
  compare: (base: number, other: number) =>
    req<{ protocol_volume_delta: Record<string, { base: number; compare: number; delta: number }>
          new_anomalies: string[]; resolved_anomalies: string[]; note: string }>(
      `/api/compare?base_id=${base}&compare_id=${other}`),
}
