import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type MessageRow } from "../lib/api"

export default function HistoryPage() {
  const [q, setQ] = useState("")
  const [severity, setSeverity] = useState("")
  const [rows, setRows] = useState<MessageRow[]>([])
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    api.messages(q, severity)
      .then((r) => setRows(r.messages))
      .catch((e) => setError(String(e)))
      .finally(() => setLoaded(true))
  }, [q, severity])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Analysis history</h1>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input className="input" placeholder="search subject or sender" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: "13rem" }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">all severities</option>
          <option>high</option><option>medium</option><option>low</option><option>informational</option>
        </select>
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {loaded && rows.length === 0 && <p style={{ color: "var(--muted)" }}>No analyses yet — paste a message on the Analyze screen.</p>}
      {rows.length > 0 && (
        <table className="table card">
          <thead><tr><th>Subject</th><th>From</th><th>Severity</th><th>Findings</th><th>Disposition</th><th>Analyzed</th></tr></thead>
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
