import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type CaptureRow } from "../lib/api"

export default function CapturesPage() {
  const [rows, setRows] = useState<CaptureRow[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const [busy, setBusy] = useState(false)
  const load = () => api.captures().then((r) => setRows(r.captures)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Captures</h1>
      <div className="notice">
        Upload a pcap file for offline metadata analysis: protocol distribution, talkers, per-minute
        volumes and heuristic volume flags. Packet payloads are never inspected or exported. Large
        captures are analyzed in the background — the row updates when processing completes.
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Upload capture</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input className="input" type="file" accept=".pcap" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <input aria-label="Label (optional)" className="input" placeholder="label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ maxWidth: "14rem" }} />
          <button aria-describedby="captures-netscope-1-hint" className="btn" disabled={!file || busy} onClick={async () => {
            setBusy(true); setError("")
            try {
              const r = await api.upload(file!, label)
              setFlash(r.status === "processing" ? r.note : "Analyzed.")
              load()
            } catch (e) { setError(String(e)) } finally { setBusy(false); setFile(null) }
          }}>{busy ? "Uploading…" : "Upload & analyze"}</button>
          <span id="captures-netscope-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
      {rows.length === 0 ? <p style={{ color: "var(--muted)" }}>No captures yet.</p> : (
        <table className="table card">
          <thead><tr><th scope="col">File</th><th scope="col">Label</th><th scope="col">Status</th><th scope="col">Packets</th><th scope="col">Bytes</th><th scope="col">Uploaded</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/captures/${r.id}`}>{r.filename}</Link></td>
                <td>{r.label || "—"}</td>
                <td><span className="badge">{r.status}</span></td>
                <td>{r.status === "completed" ? r.packet_count : "—"}</td>
                <td>{r.status === "completed" ? r.byte_count : "—"}</td>
                <td>{r.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
