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

export interface Asset { id: number; hostname: string; kind: string; environment: string; owner_name: string; importance: string; description: string }
export interface ScanRun { id: number; target: string; adapter: string; status: string; started_at: string; limitations: string; error: string }
export interface DiffResult { newly_observed: Array<{ target: string; port: number; service: string; version: string }>; no_longer_observed: Array<{ target: string; port: number; service: string; version: string }>; version_changed: Array<{ target: string; port: number; before: string; after: string }>; note: string }
export interface Finding { id: number; target: string; port: number; service: string; severity: string; exposure: string; business_importance: string; status: string }

export const api = {
  register: (email: string, password: string) => req<{ ok: boolean }>("/api/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => req<{ ok: boolean; email: string; role: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req<{ email: string; role: string }>("/api/me"),
  dashboard: () => req<{ assets: number; scan_runs: number; open_findings: number; scan_mode: string; note: string }>("/api/dashboard"),
  assets: () => req<{ assets: Asset[] }>("/api/assets"),
  createAsset: (body: Partial<Asset>) => req<{ id: number }>("/api/assets", { method: "POST", body: JSON.stringify(body) }),
  allowlist: () => req<{ entries: Array<{ id: number; entry: string; note: string }> }>("/api/allowlist"),
  addAllowlist: (entry: string, note: string) => req<{ id: number }>("/api/allowlist", { method: "POST", body: JSON.stringify({ entry, note }) }),
  scans: () => req<{ runs: ScanRun[] }>("/api/scans"),
  runScan: (targets: string[], adapter: string, rows?: Array<Record<string, unknown>>) =>
    req<{ runs: Array<{ id: number; target: string; status: string; limitations: string }>; error?: string }>(
      "/api/scans", { method: "POST", body: JSON.stringify({ targets, adapter, rows }) }),
  observations: (runId: number) => req<{ observations: Array<{ target: string; port: number; service: string; version: string }>; limitations: string }>(`/api/scans/${runId}/observations`),
  diff: (base: number, compare: number) => req<DiffResult>(`/api/diff?base_run_id=${base}&compare_run_id=${compare}`),
  findings: () => req<{ findings: Finding[] }>("/api/findings"),
  createFinding: (body: Partial<Finding>) => req<{ id: number }>("/api/findings", { method: "POST", body: JSON.stringify(body) }),
  createTask: (finding_id: number, owner_name: string, note: string) =>
    req<{ id: number; status: string }>("/api/remediation", { method: "POST", body: JSON.stringify({ finding_id, owner_name, note }) }),
  audit: () => req<{ events: Array<{ at: string; actor: string; action: string; detail: string }> }>("/api/audit"),
}
