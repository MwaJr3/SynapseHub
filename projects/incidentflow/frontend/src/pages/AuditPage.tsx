import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function AuditPage() {
  const [events, setEvents] = useState<Array<{ at: string; actor: string; action: string; detail: string }>>([])
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  useEffect(() => {
    api.audit().then((r) => { setEvents(r.events); setNote(r.note) }).catch((e) => setError(String(e)))
  }, [])
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Audit trail</h1>
      {note && <div className="notice">{note}</div>}
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {events.length === 0 ? <p style={{ color: "var(--muted)" }}>No audit entries yet.</p> : (
        <table className="table card">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr></thead>
          <tbody>
            {events.map((e, i) => (
              <tr key={i}><td>{e.at}</td><td>{e.actor}</td><td><span className="badge">{e.action}</span></td><td>{e.detail}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
