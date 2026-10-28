import { useEffect, useState } from "react"
import { api } from "../lib/api"

export default function DashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null)
  const [error, setError] = useState("")
  useEffect(() => { api.dashboard().then(setData).catch((e) => setError(String(e))) }, [])
  if (error) return <p role="alert" style={{ color: "#9b2226" }}>{error}</p>
  if (!data) return <p className="loading" role="status" aria-live="polite">Loading Dashboard…</p>
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Exposure dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(12rem, 1fr))", gap: "1rem" }}>
        <div className="card stat"><div className="n">{data.assets}</div><div>Assets tracked</div></div>
        <div className="card stat"><div className="n">{data.scan_runs}</div><div>Scan runs recorded</div></div>
        <div className="card stat"><div className="n">{data.open_findings}</div><div>Open findings</div></div>
        <div className="card stat"><div className="n" style={{ fontSize: "1.15rem" }}>{data.scan_mode}</div><div>Configured scan mode</div></div>
      </div>
      <div className="notice">{data.note}</div>
    </div>
  )
}
