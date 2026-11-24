import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { downloadText, toCsv } from "../lib/export"
import { SEVERITY_MEANING } from "../lib/severity"
import { api, type MessageRow } from "../lib/api"

export default function HistoryPage() {
  const initial = new URLSearchParams(window.location.search)
  const [q, setQ] = useState(initial.get("q") ?? "")
  const [severity, setSeverity] = useState(initial.get("severity") ?? "")
  const [rows, setRows] = useState<MessageRow[]>([])
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    q ? params.set("q", q) : params.delete("q")
    severity ? params.set("severity", severity) : params.delete("severity")
    const qs = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash)
    api.messages(q, severity)
      .then((r) => setRows(r.messages))
      .catch((e) => setError(String(e)))
      .finally(() => setLoaded(true))
  }, [q, severity])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Analysis history</h1>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input aria-label="Search subject or sender" className="input" placeholder="search subject or sender" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: "13rem" }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">all severities</option>
          <option>high</option><option>medium</option><option>low</option><option>informational</option>
        </select>
      </div>
      {severity && SEVERITY_MEANING[severity] && <p className="hint">{severity}: {SEVERITY_MEANING[severity]}</p>}
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {loaded && rows.length === 0 && (
        <p style={{ color: "var(--muted)" }}>
          {q || severity ? "No analyses match these filters. Clear the search or choose “all severities”." : "No analyses yet — paste a message on the Analyze screen."}
        </p>
      )}
      {rows.length > 0 && (
        <div>
          <button className="btn secondary" onClick={() => downloadText("phishlens-history.csv", toCsv(rows as unknown as Array<Record<string, unknown>>, ["subject", "from_header", "worst_severity", "finding_count", "disposition", "created_at"]))}>
            Export {rows.length} shown as CSV
          </button>
        </div>
      )}
      {rows.length > 0 && (
        <table className="table card">
          <thead><tr><th scope="col">Subject</th><th scope="col">From</th><th scope="col">Severity</th><th scope="col">Findings</th><th scope="col">Disposition</th><th scope="col">Analyzed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/messages/${r.id}`}>{r.subject || "(untitled)"}</Link></td>
                <td style={{ fontSize: "0.82rem" }}>{r.from_header || "—"}</td>
                <td><span className={`badge ${r.worst_severity}`}>{r.worst_severity}</span></td>
                <td>{r.finding_count}</td>
                <td>{r.disposition}</td>
                <td>{r.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
