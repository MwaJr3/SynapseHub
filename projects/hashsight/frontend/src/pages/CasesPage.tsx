import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function CasesPage() {
  const [cases, setCases] = useState<Array<{ id: number; title: string; disposition: string; created_at: string }>>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [notes, setNotes] = useState<Array<{ id: number; author: string; body: string; created_at: string }>>([])
  const [body, setBody] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    api.cases().then((r) => setCases(r.cases)).catch((e) => setError(String(e)))
  }, [])

  async function open(id: number) {
    setSelected(id)
    setNotes((await api.caseNotes(id)).notes)
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Investigation cases</h1>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {cases.length === 0 && <p style={{ color: "var(--muted)" }}>No cases yet — create one from a record.</p>}
      <table className="table card">
        <thead><tr><th>Title</th><th>Disposition</th><th>Created</th></tr></thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => open(c.id)}>
              <td>{c.title}</td><td>{c.disposition}</td><td>{c.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected !== null && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Case #{selected} notes</h3>
          <ul>
            {notes.map((n) => <li key={n.id}><strong>{n.author}</strong>: {n.body} <em style={{ color: "var(--muted)" }}>{n.created_at}</em></li>)}
          </ul>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="add note" />
            <button className="btn" disabled={!body.trim()} onClick={async () => {
              await api.addNote(selected, body); setBody(""); setNotes((await api.caseNotes(selected)).notes)
            }}>Add note</button>
          </div>
        </div>
      )}
    </div>
  )
}
