import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api, type MessageDetail } from "../lib/api"

const DISPOSITIONS = ["unreviewed", "phishing", "suspicious", "legitimate", "false-positive"]

export default function MessagePage() {
  const { id } = useParams()
  const [rec, setRec] = useState<MessageDetail | null>(null)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.message(Number(id)).then(setRec).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [id])

  if (error) return <p role="alert" style={{ color: "#9b2226" }}>{error}</p>
  if (!rec) return <p className="loading" role="status" aria-live="polite">Loading Message…</p>

  async function exportReport() {
    const report = await api.report(rec!.id)
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `phishlens-report-${rec!.id}.json`
    a.click()
    setFlash("Report exported (JSON) with the review disclaimer.")
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>{rec.subject || "(untitled)"} <span className={`badge ${rec.worst_severity}`}>{rec.worst_severity}</span></h1>
      <div className="notice">{rec.disclaimer}</div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Findings ({rec.findings.length})</h3>
        {rec.findings.length === 0 && <p style={{ color: "var(--muted)" }}>No suspicious patterns matched. That is not proof the message is safe.</p>}
        {rec.findings.map((f, i) => (
          <div key={i} style={{ borderLeft: "4px solid var(--accent)", paddingLeft: "0.75rem", marginBottom: "0.85rem" }}>
            <strong>{f.title}</strong> <span className={`badge ${f.severity}`}>{f.severity}</span> <code>{f.code}</code>
            <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>{f.explanation}</p>
            <p style={{ margin: 0, fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>{f.evidence}</p>
          </div>
        ))}
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Review</h3>
        <select className="input" style={{ maxWidth: "14rem" }} value={rec.disposition}
          onChange={async (e) => { await api.setDisposition(rec!.id, e.target.value); load() }}>
          {DISPOSITIONS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input aria-label="Investigation note" className="input" placeholder="investigation note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button aria-describedby="message-phishlens-1-hint" className="btn secondary" disabled={!note.trim()} onClick={async () => {
            await api.addNote(rec!.id, note); setNote(""); setFlash("Note saved.")
          }}>Save note</button>
          <span id="message-phishlens-1-hint" className="hint">Fill in the field above to enable this.</span>
          <button className="btn" onClick={exportReport}>Export report</button>
        </div>
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
    </div>
  )
}
