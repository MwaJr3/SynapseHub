import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type IncidentRow } from "../lib/api"

const STATUSES = ["new", "triaged", "contained", "resolved", "closed", "reopened"]

export default function BoardPage() {
  const [rows, setRows] = useState<IncidentRow[]>([])
  const [status, setStatus] = useState("")
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState("medium")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.incidents(status).then((r) => setRows(r.incidents)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [status])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Incidents</h1>
      <div className="notice">
        The lifecycle runs new → triaged → contained → resolved → closed (reopened where needed).
        Transitions are enforced server-side; closing requires the lead role.
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Open an incident</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input aria-label="Title" className="input" placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ maxWidth: "22rem" }} />
          <select className="input" style={{ maxWidth: "10rem" }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option>low</option><option>medium</option><option>high</option><option>critical</option>
          </select>
          <button aria-describedby="board-incidentflow-1-hint" className="btn" disabled={!title.trim()} onClick={async () => {
            try {
              await api.create(title, "security-event", severity, description)
              setTitle(""); setDescription(""); setFlash("Incident created."); load()
            } catch (e) { setError(String(e)) }
          }}>Create</button>
          <span id="board-incidentflow-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
        <textarea className="input" rows={2} placeholder="initial description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className={status === "" ? "btn" : "btn secondary"} onClick={() => setStatus("")}>all</button>
        {STATUSES.map((s) => (
          <button key={s} className={status === s ? "btn" : "btn secondary"} onClick={() => setStatus(s)}>{s}</button>
        ))}
      </div>
      {rows.length === 0 ? <p style={{ color: "var(--muted)" }}>No incidents in this view.</p> : (
        <table className="table card">
          <thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Created</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td><Link to={`/incidents/${r.id}`}>{r.title}</Link></td>
                <td><span className={`badge ${r.severity}`}>{r.severity}</span></td>
                <td><span className="badge">{r.status}</span></td>
                <td>{r.assignee || "—"}</td>
                <td>{r.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
