import { useEffect, useState } from "react"
import { api, type DiffResult, type ScanRun } from "../lib/api"

export default function ScansPage() {
  const [runs, setRuns] = useState<ScanRun[]>([])
  const [target, setTarget] = useState("")
  const [error, setError] = useState("")
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [baseId, setBaseId] = useState("")
  const [compareId, setCompareId] = useState("")
  const load = () => api.scans().then((r) => setRuns(r.runs)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Scan runs</h1>
      <div className="notice">
        Every scan is validated against the allowlist server-side before it starts. In this deployment the
        "simulated" adapter produces labelled demo data; the "import" adapter ingests results exported from
        your own approved tooling. Target count, port count and run time are bounded.
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Run scan (simulated demo adapter)</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input aria-label="Allowlisted target" className="input" placeholder="allowlisted target" value={target} onChange={(e) => setTarget(e.target.value)} />
          <button aria-describedby="scans-assetwatch-1-hint" className="btn" disabled={!target.trim()} onClick={async () => {
            try {
              const r = await api.runScan([target], "simulated")
              if (r.error) setError(r.error); else { setTarget(""); load() }
            } catch (e) { setError(String(e)) }
          }}>Scan</button>
          <span id="scans-assetwatch-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Compare runs (exposure diff)</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <select className="input" style={{ maxWidth: "18rem" }} value={baseId} onChange={(e) => setBaseId(e.target.value)}>
            <option value="">newer run</option>
            {runs.map((r) => <option key={r.id} value={r.id}>#{r.id} {r.target} ({r.adapter})</option>)}
          </select>
          <select className="input" style={{ maxWidth: "18rem" }} value={compareId} onChange={(e) => setCompareId(e.target.value)}>
            <option value="">older run</option>
            {runs.map((r) => <option key={r.id} value={r.id}>#{r.id} {r.target} ({r.adapter})</option>)}
          </select>
          <button aria-describedby="scans-assetwatch-2-hint" className="btn secondary" disabled={!baseId || !compareId} onClick={async () => {
            try { setDiff(await api.diff(Number(baseId), Number(compareId))) }
            catch (e) { setError(String(e)) }
          }}>Compare</button>
          <span id="scans-assetwatch-2-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
        {diff && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{diff.note}</p>
            <h4>Newly observed</h4>
            {diff.newly_observed.length === 0 ? <p style={{ color: "var(--muted)" }}>Nothing new.</p> : (
              <ul>{diff.newly_observed.map((o) => <li key={`${o.target}:${o.port}`}>{o.target}:{o.port} — {o.service} {o.version}</li>)}</ul>
            )}
            <h4>No longer observed</h4>
            {diff.no_longer_observed.length === 0 ? <p style={{ color: "var(--muted)" }}>Nothing removed.</p> : (
              <ul>{diff.no_longer_observed.map((o) => <li key={`${o.target}:${o.port}`}>{o.target}:{o.port} — {o.service}</li>)}</ul>
            )}
            <h4>Version changed</h4>
            {diff.version_changed.length === 0 ? <p style={{ color: "var(--muted)" }}>No version changes.</p> : (
              <ul>{diff.version_changed.map((o) => <li key={`${o.target}:${o.port}`}>{o.target}:{o.port} — {o.before} → {o.after}</li>)}</ul>
            )}
          </div>
        )}
      </div>
      <table className="table card">
        <thead><tr><th scope="col">#</th><th scope="col">Target</th><th scope="col">Adapter</th><th scope="col">Status</th><th scope="col">Started</th><th scope="col">Limitations</th></tr></thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td><td>{r.target}</td><td>{r.adapter}</td>
              <td><span className="badge">{r.status}</span></td>
              <td>{r.started_at}</td>
              <td style={{ fontSize: "0.78rem" }}>{r.limitations}{r.error ? ` (${r.error})` : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
