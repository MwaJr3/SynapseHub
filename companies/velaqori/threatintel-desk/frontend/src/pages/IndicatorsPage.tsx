import { useEffect, useState } from "react"
import { BlurFade } from "../decor"
import { downloadText, toCsv } from "../lib/export"
import { api, type IndicatorRow } from "../lib/api"

const TRIAGE_MEANING: Record<string, string> = {
  unreviewed: "No analyst has looked at this indicator yet.",
  suspicious: "An analyst thinks it needs a closer look; not confirmed.",
  "confirmed-malicious": "An analyst has decided this is malicious. This is a human decision, not a feed score.",
  "false-positive": "An analyst decided this indicator is not a real threat.",
  "accepted-risk": "Known and deliberately left alone.",
}

export default function IndicatorsPage() {
  const [rows, setRows] = useState<IndicatorRow[]>([])
  const initial = new URLSearchParams(window.location.search)
  const [q, setQ] = useState(initial.get("q") ?? "")
  const [triage, setTriage] = useState(initial.get("triage") ?? "")
  const [open, setOpen] = useState<(IndicatorRow & { notes: string }) | null>(null)
  const [notes, setNotes] = useState("")
  const [caseRef, setCaseRef] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.indicators(q, triage, "")
    .then((r) => setRows(r.indicators)).catch((e) => setError(String(e)))
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (q) params.set("q", q)
    else params.delete("q")
    if (triage) params.set("triage", triage)
    else params.delete("triage")
    const qs = params.toString()
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash)
    load()
  }, [q, triage])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Indicators</h1>
      <BlurFade><div className="notice">
        Source counts are shown for every indicator. Appearing in feeds raises questions for
        review — it is not proof that an indicator is malicious. Triage is a human judgment.
      </div></BlurFade>
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input aria-label="Search value" className="input" placeholder="search value" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: "14rem" }} value={triage} onChange={(e) => setTriage(e.target.value)}>
          <option value="">all triage states</option>
          <option>unreviewed</option><option>suspicious</option><option>confirmed-malicious</option>
          <option>false-positive</option><option>accepted-risk</option>
        </select>
      </div>
      {triage && TRIAGE_MEANING[triage] && <p className="hint">{triage}: {TRIAGE_MEANING[triage]}</p>}
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      {rows.length > 0 && (
        <div>
          <button className="btn secondary" onClick={() => downloadText("threatintel-indicators.csv", toCsv(rows.map((r) => ({ ...r, sources: r.sources.join("; ") })), ["value", "kind", "source_count", "sources", "triage", "case_ref", "first_seen", "last_seen"]))}>
            Export {rows.length} shown as CSV
          </button>
        </div>
      )}
      {rows.length === 0 ? <p style={{ color: "var(--muted)" }}>{q || triage ? "No indicators match these filters. Clear the search or choose “all triage states”." : "No indicators yet — ingest feed data on the Feeds screen."}</p> : (
        <table className="table card">
          <thead><tr><th scope="col">Value</th><th scope="col">Kind</th><th scope="col">Sources</th><th scope="col">Triage</th><th scope="col">Case</th><th scope="col">Last seen</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ cursor: "pointer" }} onClick={async () => {
                const full = await api.indicator(r.id)
                setOpen(full); setNotes(full.notes); setCaseRef(full.case_ref)
              }}>
                <td className="mono">{r.value}</td>
                <td>{r.kind}</td>
                <td>{r.source_count} ({r.sources.join(", ")})</td>
                <td><span className="badge">{r.triage}</span></td>
                <td>{r.case_ref || "—"}</td>
                <td>{r.last_seen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {open && (
        <div className="card" style={{ display: "grid", gap: "0.65rem" }}>
          <h3 style={{ margin: 0 }}>{open.value}</h3>
          <p style={{ margin: 0, fontSize: "0.88rem" }}>{open.framing}</p>
          <label style={{ fontSize: "0.9rem" }}>
            Triage:{" "}
            <select className="input" style={{ maxWidth: "15rem", display: "inline-block" }} value={open.triage}
              onChange={async (e) => {
                await api.patch(open.id, e.target.value, caseRef, notes)
                setOpen({ ...open, triage: e.target.value }); load()
              }}>
              <option>unreviewed</option><option>suspicious</option><option>confirmed-malicious</option>
              <option>false-positive</option><option>accepted-risk</option>
            </select>
          </label>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <input aria-label="Case reference" className="input" placeholder="case reference" value={caseRef} onChange={(e) => setCaseRef(e.target.value)} style={{ maxWidth: "12rem" }} />
            <input aria-label="Analyst notes" className="input" placeholder="analyst notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn secondary" onClick={async () => {
              await api.patch(open.id, open.triage, caseRef, notes); setFlash("Saved.")
            }}>Save</button>
            <button className="btn" onClick={async () => {
              const report = await api.report(open.id)
              const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
              const a = document.createElement("a")
              a.href = URL.createObjectURL(blob)
              a.download = `tid-report-${open.id}.json`
              a.click()
            }}>Export report</button>
            <button className="btn secondary" onClick={() => setOpen(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
