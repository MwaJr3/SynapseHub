import { useEffect, useState } from "react"
import { api, type FeedRow } from "../lib/api"

export default function DeskPage() {
  const [feeds, setFeeds] = useState<FeedRow[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [runs, setRuns] = useState<Array<{ id: number; started_at: string; status: string; fetched: number; new: number; merged: number; errors: number; note: string }>>([])
  const [name, setName] = useState("")
  const [kind, setKind] = useState("simulated")
  const [importFeed, setImportFeed] = useState("")
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.feeds().then((r) => setFeeds(r.feeds)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Feeds &amp; ingestion</h1>
      <div className="notice">
        Ingestion normalizes and deduplicates indicators (same value from two feeds merges into one
        record with both sources). Simulated feeds produce labelled fictional demo data. Scheduled
        ingestion runs via each feed's interval — trigger runs here or from your scheduler against
        the run endpoint.
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Add a feed</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input aria-label="Feed name" className="input" placeholder="feed name" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: "18rem" }} />
          <select className="input" style={{ maxWidth: "12rem" }} value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="simulated">simulated (demo)</option>
            <option value="file">file import</option>
            <option value="manual">manual</option>
          </select>
          <button aria-describedby="desk-threatintel-desk-1-hint" className="btn" disabled={!name.trim()} onClick={async () => {
            try { await api.createFeed(name, kind); setName(""); setFlash("Feed created."); load() }
            catch (e) { setError(String(e)) }
          }}>Create feed</button>
          <span id="desk-threatintel-desk-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Import indicator lines</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <select className="input" style={{ maxWidth: "16rem" }} value={importFeed} onChange={(e) => setImportFeed(e.target.value)}>
            <option value="">feed…</option>
            {feeds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <button aria-describedby="desk-threatintel-desk-2-hint" className="btn secondary" disabled={!importFeed || !text.trim()} onClick={async () => {
            try {
              const r = await api.ingest(Number(importFeed), text)
              setFlash(`Fetched ${r.fetched}: ${r.new} new, ${r.merged} merged, ${r.errors} rejected.`)
              setText(""); load()
            } catch (e) { setError(String(e)) }
          }}>Ingest lines</button>
          <span id="desk-threatintel-desk-2-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
        <textarea className="input" rows={5} placeholder={"one indicator per line — domain, IP, URL or hash\nbad.example\n8.8.8.8"} value={text} onChange={(e) => setText(e.target.value)} />
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      <table className="table card">
        <thead><tr><th scope="col">Feed</th><th scope="col">Kind</th><th scope="col">Interval</th><th scope="col">Last run</th><th scope="col"></th></tr></thead>
        <tbody>
          {feeds.map((f) => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td><span className="badge">{f.kind}</span></td>
              <td>{f.interval_minutes} min</td>
              <td>{f.last_run_at || "never"}</td>
              <td>
                <button className="btn secondary" onClick={async () => {
                  const r = await api.runFeed(f.id); setFlash(r.note); load()
                }}>Run now</button>
                <button className="btn secondary" style={{ marginLeft: "0.4rem" }} onClick={async () => {
                  setSelected(f.id); setRuns((await api.feedRuns(f.id)).runs)
                }}>History</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selected !== null && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Run history — feed #{selected}</h3>
          <table className="table">
            <thead><tr><th scope="col">Started</th><th scope="col">Status</th><th scope="col">Fetched</th><th scope="col">New</th><th scope="col">Merged</th><th scope="col">Errors</th><th scope="col">Note</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{r.started_at}</td><td><span className="badge">{r.status}</span></td>
                  <td>{r.fetched}</td><td>{r.new}</td><td>{r.merged}</td><td>{r.errors}</td>
                  <td style={{ fontSize: "0.8rem" }}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
