import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api, type HashRecordDetail } from "../lib/api"

const DISPOSITIONS = ["unreviewed", "suspicious", "malicious", "benign", "false-positive"]

export default function RecordPage() {
  const { id } = useParams()
  const [rec, setRec] = useState<HashRecordDetail | null>(null)
  const [error, setError] = useState("")
  const [note, setNote] = useState("")
  const [caseTitle, setCaseTitle] = useState("")
  const [flash, setFlash] = useState("")

  const load = () => api.record(Number(id)).then(setRec).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [id])

  if (error) return <p role="alert" style={{ color: "#9b2226" }}>{error}</p>
  if (!rec) return <p className="loading" role="status" aria-live="polite">Loading Record…</p>

  async function exportReport() {
    const report = await api.report(rec!.id)
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `hashsight-report-${rec!.id}.json`
    a.click()
    setFlash("Report exported (JSON) with sources and lookup timestamps.")
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>{rec.filename} <span className={`verdict ${rec.combined_verdict}`}>{rec.combined_verdict}</span></h1>
      <div className="notice">{rec.disclaimer}</div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Digests</h3>
        <p style={{ fontFamily: "monospace", wordBreak: "break-all", margin: "0.25rem 0" }}>SHA-256: {rec.sha256}</p>
        <p style={{ fontFamily: "monospace", wordBreak: "break-all", margin: "0.25rem 0" }}>SHA-1: {rec.sha1}</p>
        <p style={{ fontFamily: "monospace", wordBreak: "break-all", margin: "0.25rem 0" }}>MD5: {rec.md5}</p>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Provider results</h3>
        <table className="table">
          <thead><tr><th scope="col">Provider</th><th scope="col">Verdict</th><th scope="col">Detections</th><th scope="col">Looked up</th><th scope="col">Summary</th></tr></thead>
          <tbody>
            {rec.lookups.map((l, i) => (
              <tr key={i}>
                <td>{l.provider}</td>
                <td><span className={`verdict ${l.verdict}`}>{l.verdict}</span></td>
                <td>{l.detections === null ? "—" : `${l.detections}${l.total_engines ? `/${l.total_engines}` : ""}`}</td>
                <td>{l.looked_up_at}</td>
                <td style={{ fontSize: "0.82rem" }}>{l.raw_summary}{l.error ? ` (${l.error})` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ marginTop: 0 }}>Analyst review</h3>
        <label style={{ fontSize: "0.9rem" }}>
          Disposition:{" "}
          <select className="input" style={{ maxWidth: "14rem", display: "inline-block" }} value={rec.disposition}
            onChange={async (e) => { await api.setDisposition(rec!.id, e.target.value); load() }}>
            {DISPOSITIONS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input aria-label="Investigation note" className="input" placeholder="investigation note" value={note} onChange={(e) => setNote(e.target.value)} />
          <button aria-describedby="record-hashsight-1-hint" className="btn secondary" onClick={async () => {
            const c = await api.createCase(`Notes for ${rec!.filename}`, rec!.id)
            await api.addNote(c.id, note)
            setNote(""); setFlash("Note saved to a new case.")
          }} disabled={!note.trim()}>Save note to case</button>
          <span id="record-hashsight-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input aria-label="New case title" className="input" placeholder="new case title" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} />
          <button aria-describedby="record-hashsight-2-hint" className="btn secondary" onClick={async () => {
            await api.createCase(caseTitle, rec!.id); setCaseTitle(""); setFlash("Case created.")
          }} disabled={!caseTitle.trim()}>Create case</button>
          <span id="record-hashsight-2-hint" className="hint">Fill in the field above to enable this.</span>
          <button className="btn" onClick={exportReport}>Export report</button>
        </div>
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
    </div>
  )
}
