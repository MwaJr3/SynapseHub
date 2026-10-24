import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { api, type CaptureDetail, type CaptureRow } from "../lib/api"

export default function CapturePage() {
  const { id } = useParams()
  const [rec, setRec] = useState<CaptureDetail | null>(null)
  const [others, setOthers] = useState<CaptureRow[]>([])
  const [compareId, setCompareId] = useState("")
  const [diff, setDiff] = useState<Awaited<ReturnType<typeof api.compare>> | null>(null)
  const [label, setLabel] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => Promise.all([api.capture(Number(id)), api.captures()])
    .then(([c, list]) => { setRec(c); setOthers(list.captures.filter((x) => x.id !== Number(id))); setLabel(c.label) })
    .catch((e) => setError(String(e)))
  useEffect(() => { load() }, [id])

  if (error) return <p role="alert" style={{ color: "#9b2226" }}>{error}</p>
  if (!rec) return <p>Loading…</p>
  const s = rec.summary as Record<string, unknown>
  const byProtocol = (s.by_protocol ?? {}) as Record<string, number>
  const sources = (s.top_sources ?? []) as Array<[string, number]>
  const destinations = (s.top_destinations ?? []) as Array<[string, number]>
  const anomalies = (s.anomalies ?? []) as string[]

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>{rec.filename} <span className="badge">{rec.status}</span></h1>
      <div className="notice">{rec.disclaimer}</div>
      {rec.status === "failed" && <p role="alert" style={{ color: "#9b2226" }}>{rec.error}</p>}
      <div className="card" style={{ display: "grid", gap: "0.5rem" }}>
        <h3 style={{ margin: 0 }}>Summary</h3>
        <p style={{ margin: 0 }}>Packets: <strong>{String(s.packets ?? 0)}</strong> · Bytes: <strong>{String(s.bytes_total ?? 0)}</strong> · Malformed: {String(s.malformed_packets ?? 0)}</p>
        <div>
          <h4>Protocol distribution</h4>
          {Object.entries(byProtocol).map(([proto, n]) => (
            <div key={proto} style={{ display: "flex", gap: "0.5rem", fontSize: "0.9rem" }}>
              <span style={{ minWidth: "5rem" }}>{proto}</span>
              <div style={{ background: "#e0ecec", borderRadius: 4, height: "0.85rem", width: `${Math.min(100, (n / Math.max(1, Number(s.packets ?? 1))) * 100)}%` }} />
              <span>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div><h4>Top sources</h4><ul>{sources.map(([ip, n]) => <li key={ip}>{ip} — {n}</li>)}</ul></div>
          <div><h4>Top destinations</h4><ul>{destinations.map(([ip, n]) => <li key={ip}>{ip} — {n}</li>)}</ul></div>
        </div>
        <h4>Volume flags (heuristics for review — not proof)</h4>
        {anomalies.length === 0 ? <p style={{ color: "var(--muted)", margin: 0 }}>No volume flags at the configured threshold.</p> : (
          <ul>{anomalies.map((a) => <li key={a}>{a}</li>)}</ul>
        )}
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Label &amp; export</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} style={{ maxWidth: "18rem" }} />
          <button className="btn secondary" onClick={async () => { await api.setLabel(rec!.id, label); setFlash("Label saved.") }}>Save label</button>
          <button className="btn" onClick={async () => {
            const report = await api.report(rec!.id)
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
            const a = document.createElement("a")
            a.href = URL.createObjectURL(blob)
            a.download = `netscope-report-${rec!.id}.json`
            a.click()
            setFlash("Pseudonymised report exported (stable pseudonyms; payloads never included).")
          }}>Export report (pseudonymised)</button>
        </div>
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Compare with another capture</h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <select className="input" style={{ maxWidth: "20rem" }} value={compareId} onChange={(e) => setCompareId(e.target.value)}>
            <option value="">select capture…</option>
            {others.map((o) => <option key={o.id} value={o.id}>#{o.id} {o.filename} ({o.status})</option>)}
          </select>
          <button className="btn secondary" disabled={!compareId} onClick={async () => {
            setDiff(await api.compare(Number(id), Number(compareId)))
          }}>Compare</button>
        </div>
        {diff && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{diff.note}</p>
            <h4>Protocol volume changes</h4>
            <ul>
              {Object.entries(diff.protocol_volume_delta).map(([proto, d]) => (
                <li key={proto}>{proto}: {d.base} vs {d.compare} ({d.delta > 0 ? "+" : ""}{d.delta})</li>
              ))}
            </ul>
            <h4>New flags</h4>
            {diff.new_anomalies.length ? <ul>{diff.new_anomalies.map((a) => <li key={a}>{a}</li>)}</ul> : <p style={{ color: "var(--muted)" }}>None.</p>}
            <h4>Resolved flags</h4>
            {diff.resolved_anomalies.length ? <ul>{diff.resolved_anomalies.map((a) => <li key={a}>{a}</li>)}</ul> : <p style={{ color: "var(--muted)" }}>None.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
