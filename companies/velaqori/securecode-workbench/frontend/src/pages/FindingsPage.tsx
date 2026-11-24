import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { BlurFade } from "../decor"
import { downloadText, toCsv } from "../lib/export"
import { api, type Finding } from "../lib/api"

export default function FindingsPage() {
  const { runId } = useParams()
  const [findings, setFindings] = useState<Finding[]>([])
  const initial = new URLSearchParams(window.location.search)
  const [severity, setSeverity] = useState(initial.get("severity") ?? "")
  const [triageFilter, setTriageFilter] = useState(initial.get("triage") ?? "")
  const [open, setOpen] = useState<Finding | null>(null)
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.findings(Number(runId), severity, triageFilter)
    .then((r) => setFindings(r.findings)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [runId, severity, triageFilter])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    severity ? params.set("severity", severity) : params.delete("severity")
    triageFilter ? params.set("triage", triageFilter) : params.delete("triage")
    const qs = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash)
  }, [severity, triageFilter])

  async function exportReport() {
    const report = await api.report(Number(runId))
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `scw-report-${runId}.json`
    a.click()
    setFlash("Report exported with limitations and per-finding disclaimers.")
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Findings — run #{runId}</h1>
      <BlurFade><div className="notice">
        Findings are heuristic indicators to review — not proof of a vulnerability. Suggested fixes are
        guidance to evaluate, never applied automatically. Evidence is redacted.
      </div></BlurFade>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <select className="input" style={{ maxWidth: "12rem" }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">all severities</option>
          <option>critical</option><option>high</option><option>medium</option><option>low</option><option>info</option>
        </select>
        <select className="input" style={{ maxWidth: "12rem" }} value={triageFilter} onChange={(e) => setTriageFilter(e.target.value)}>
          <option value="">all triage states</option>
          <option>open</option><option>accepted</option><option>fixed</option><option>suppressed</option>
        </select>
        <button className="btn secondary" onClick={exportReport}>Export report</button>
        <button className="btn secondary" disabled={findings.length === 0} onClick={() => downloadText(`scw-findings-${runId}.csv`, toCsv(findings as unknown as Array<Record<string, unknown>>, ["rule_id", "severity", "cwe", "path", "line", "title", "triage"]))}>Export {findings.length} shown as CSV</button>
      </div>
      <p className="hint">Severity is the rule author's estimate of impact if the finding is real. It is not a confirmed exploit; triage each finding yourself. Rows are listed as returned by the scan.</p>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      {findings.length === 0 ? <p style={{ color: "var(--muted)" }}>{severity || triageFilter ? "No findings match these filters. Set both back to “all” to see every finding in this run." : "This run has no findings."}</p> : (
        <table className="table card">
          <thead><tr><th scope="col">Rule</th><th scope="col">Severity</th><th scope="col">Location</th><th scope="col">Summary</th><th scope="col">Triage</th></tr></thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => setOpen(f)}>
                <td><code>{f.rule_id}</code></td>
                <td><span className={`badge ${f.severity}`}>{f.severity}</span></td>
                <td className="mono">{f.path}:{f.line}</td>
                <td>{f.title}</td>
                <td><span className="badge">{f.triage}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <div className="card" style={{ display: "grid", gap: "0.65rem" }}>
          <h3 style={{ margin: 0 }}>{open.title} <code>{open.rule_id}</code> <span className={`badge ${open.severity}`}>{open.severity}</span> <code>{open.cwe}</code></h3>
          <p style={{ margin: 0 }}><strong>Where:</strong> <span className="mono">{open.path}:{open.line}</span></p>
          <pre className="mono" style={{ background: "#f4f1f8", padding: "0.75rem", borderRadius: 6, overflowX: "auto" }}>{open.evidence}</pre>
          <p style={{ margin: 0 }}><strong>Why it matters:</strong> {open.explanation}</p>
          <p style={{ margin: 0 }}><strong>Suggested fix (review before applying):</strong> {open.suggested_fix}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["open", "accepted", "fixed", "suppressed"].map((t) => (
              <button key={t} className={t === open.triage ? "btn" : "btn secondary"} onClick={async () => {
                await api.triage(open.id, t, ""); setOpen({ ...open, triage: t }); load()
              }}>{t}</button>
            ))}
            <button className="btn secondary" onClick={() => setOpen(null)}>Close</button>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
            Suppressed findings are added to the project baseline and matched on future scans of the same project.
          </p>
        </div>
      )}
    </div>
  )
}
