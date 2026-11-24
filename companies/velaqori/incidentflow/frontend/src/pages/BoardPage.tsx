import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { BlurFade } from "../decor"
import { downloadText, toCsv } from "../lib/export"
import { api, type IncidentRow } from "../lib/api"

const STATUSES = ["new", "triaged", "contained", "resolved", "closed", "reopened"]

export default function BoardPage() {
  const [rows, setRows] = useState<IncidentRow[]>([])
  const initial = new URLSearchParams(window.location.search)
  const [status, setStatus] = useState(initial.get("status") ?? "")
  const [search, setSearch] = useState(initial.get("q") ?? "")
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState("medium")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.incidents(status).then((r) => setRows(r.incidents)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [status])
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    status ? params.set("status", status) : params.delete("status")
    search ? params.set("q", search) : params.delete("q")
    const qs = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash)
  }, [status, search])
  const shown = rows.filter((r) => !search.trim() || r.title.toLowerCase().includes(search.trim().toLowerCase()))

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Incidents</h1>
      <BlurFade><div className="notice">
        The lifecycle runs new → triaged → contained → resolved → closed (reopened where needed).
        Transitions are enforced server-side; closing requires the lead role.
      </div></BlurFade>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Open an incident</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input aria-label="Title" className="input" placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ maxWidth: "22rem" }} />
          <select className="input" style={{ maxWidth: "10rem" }} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option>low</option><option>medium</option><option>high</option><option>critical</option>
          </select>
          <span className="hint">Severity guide: low = minor, no urgency; medium = limited impact; high = significant impact, act soon; critical = major impact, act now.</span>
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
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        <input aria-label="Search incident titles" className="input" placeholder="search titles" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: "18rem" }} />
        <span className="hint">Showing {shown.length} of {rows.length}</span>
        <button className="btn secondary" disabled={shown.length === 0} onClick={() => downloadText("incidents.csv", toCsv(shown as unknown as Array<Record<string, unknown>>, ["id", "title", "severity", "status", "assignee", "created_at"]))}>Export CSV</button>
      </div>
      {shown.length === 0 ? <p style={{ color: "var(--muted)" }}>{search || status ? "No incidents match. Clear the search or choose “all” to see every incident." : "No incidents in this view."}</p> : (
        <table className="table card">
          <thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Severity</th><th scope="col">Status</th><th scope="col">Assignee</th><th scope="col">Created</th></tr></thead>
          <tbody>
            {shown.map((r) => (
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
