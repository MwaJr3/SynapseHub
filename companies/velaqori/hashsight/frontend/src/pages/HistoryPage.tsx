import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api } from "../lib/api"

export default function HistoryPage() {
  const [q, setQ] = useState("")
  const [verdict, setVerdict] = useState("")
  const [rows, setRows] = useState<Array<Record<string, string>>>([])
  const [error, setError] = useState("")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    api.records(q, verdict)
      .then((r) => setRows(r.records as Array<Record<string, string>>))
      .catch((e) => setError(e instanceof Error ? e.message : "failed"))
      .finally(() => setLoaded(true))
  }, [q, verdict])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Scan history</h1>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input aria-label="Search hash or filename" className="input" placeholder="search hash or filename" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: "14rem" }} value={verdict} onChange={(e) => setVerdict(e.target.value)}>
          <option value="">all verdicts</option>
          <option>KNOWN_MALICIOUS</option><option>NO_KNOWN_DETECTION</option>
          <option>UNKNOWN</option><option>CONFLICTING</option><option>UNAVAILABLE</option>
        </select>
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {loaded && rows.length === 0 && <p style={{ color: "var(--muted)" }}>No records yet — analyze a file on the Lookup screen.</p>}
      {rows.length > 0 && (
        <table className="table card">
          <thead><tr><th scope="col">File</th><th scope="col">SHA-256</th><th scope="col">Verdict</th><th scope="col">Disposition</th><th scope="col">Analyzed</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/records/${r.id}`}>{r.filename}</Link></td>
                <td style={{ fontFamily: "monospace" }}>{String(r.sha256).slice(0, 16)}…</td>
                <td><span className={`verdict ${r.combined_verdict}`}>{r.combined_verdict}</span></td>
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
