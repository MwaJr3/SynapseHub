import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api, type IncidentDetail } from "../lib/api"

const NEXT: Record<string, string[]> = {
  new: ["triaged"], triaged: ["contained"], contained: ["resolved"],
  resolved: ["closed", "reopened"], closed: ["reopened"], reopened: ["triaged"],
}

export default function IncidentPage() {
  const { id } = useParams()
  const [rec, setRec] = useState<IncidentDetail | null>(null)
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const [note, setNote] = useState("")
  const [taskTitle, setTaskTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [evName, setEvName] = useState("")
  const [evContent, setEvContent] = useState("")
  const load = () => api.incident(Number(id)).then(setRec).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [id])

  if (error) return <p role="alert" style={{ color: "#9b2226" }}>{error}</p>
  if (!rec) return <p>Loading…</p>

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>#{rec.id} {rec.title} <span className="badge">{rec.status}</span> <span className={`badge ${rec.severity}`}>{rec.severity}</span></h1>
      <div className="notice">{rec.disclaimer}</div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Lifecycle</h3>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {(NEXT[rec.status] ?? []).map((t) => (
            <button key={t} className="btn" onClick={async () => {
              try {
                const r = await api.transition(rec!.id, t, note)
                setFlash(`Status -> ${r.status}`); setNote("")
              } catch (e) { setError(String(e)) }
              load()
            }}>Move to {t}</button>
          ))}
          <input className="input" placeholder="transition note (optional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ maxWidth: "22rem" }} />
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input className="input" placeholder="assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)} style={{ maxWidth: "14rem" }} />
          <button className="btn secondary" disabled={!assignee.trim()} onClick={async () => {
            await api.assign(rec!.id, assignee); setAssignee(""); setFlash("Assigned."); load()
          }}>Assign</button>
          <button className="btn" onClick={async () => {
            const report = await api.report(rec!.id)
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
            const a = document.createElement("a")
            a.href = URL.createObjectURL(blob)
            a.download = `incident-${rec!.id}.json`
            a.click()
            setFlash("Report exported with limitations.")
          }}>Export report</button>
        </div>
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Timeline (recorded sequence — not proof of chronology)</h3>
        <ul>
          {rec.timeline.map((e, i) => (
            <li key={i}><strong>{e.actor}</strong> <em style={{ color: "var(--muted)" }}>{e.at}</em>: {e.entry}</li>
          ))}
        </ul>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input className="input" placeholder="add responder note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn secondary" disabled={!note.trim()} onClick={async () => {
            await api.addEvent(rec!.id, note); setNote(""); load()
          }}>Add entry</button>
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Tasks</h3>
        {rec.tasks.map((t) => (
          <div key={t.id} style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <span style={{ flex: 1 }}>{t.title} {t.assignee && <em>— {t.assignee}</em>}</span>
            {["todo", "in_progress", "done"].map((s) => (
              <button key={s} className={t.status === s ? "btn" : "btn secondary"} onClick={async () => {
                await api.updateTask(t.id, s); load()
              }}>{s}</button>
            ))}
          </div>
        ))}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input className="input" placeholder="new task" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
          <button className="btn secondary" disabled={!taskTitle.trim()} onClick={async () => {
            await api.addTask(rec!.id, taskTitle, ""); setTaskTitle(""); load()
          }}>Add task</button>
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Evidence (content-hashed; duplicates refused)</h3>
        {rec.evidence.map((e) => (
          <div key={e.id} style={{ fontSize: "0.85rem" }}>
            <strong>{e.filename}</strong> ({e.size} bytes, collected by {e.collected_by})<br />
            <span style={{ fontFamily: "monospace" }}>sha256: {e.sha256}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input className="input" placeholder="filename" value={evName} onChange={(e) => setEvName(e.target.value)} style={{ maxWidth: "14rem" }} />
          <input className="input" placeholder="paste text evidence" value={evContent} onChange={(e) => setEvContent(e.target.value)} />
          <button className="btn secondary" disabled={!evName || !evContent} onClick={async () => {
            try {
              const r = await api.addEvidence(rec!.id, evName, evContent, "")
              setFlash(r.note)
            } catch (e) { setError(String(e)) }
            setEvName(""); setEvContent(""); load()
          }}>Collect evidence</button>
        </div>
      </div>
    </div>
  )
}
