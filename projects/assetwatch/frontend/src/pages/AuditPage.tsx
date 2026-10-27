import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function AuditPage() {
  const [events, setEvents] = useState<Array<{ at: string; actor: string; action: string; detail: string }>>([])
  const [error, setError] = useState("")
  useEffect(() => { api.audit().then((r) => setEvents(r.events)).catch((e) => setError(String(e))) }, [])
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Audit events</h1>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {events.length === 0 ? <p style={{ color: "var(--muted)" }}>No audit events yet.</p> : (
        <table className="table card">
          <thead><tr><th scope="col">Time</th><th scope="col">Actor</th><th scope="col">Action</th><th scope="col">Detail</th></tr></thead>
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
