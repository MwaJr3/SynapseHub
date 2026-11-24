import { useEffect, useState } from "react"
import { api } from "../lib/api"
import { BlurFade, NumberTicker } from "../decor"

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
        <BlurFade className="card stat"><div className="n"><NumberTicker value={data.assets} /></div><div>Assets tracked</div></BlurFade>
        <BlurFade className="card stat"><div className="n"><NumberTicker value={data.scan_runs} /></div><div>Scan runs recorded</div></BlurFade>
        <BlurFade className="card stat"><div className="n"><NumberTicker value={data.open_findings} /></div><div>Open findings</div></BlurFade>
        <div className="card stat"><div className="n" style={{ fontSize: "1.15rem" }}>{data.scan_mode}</div><div>Configured scan mode</div></div>
      </div>
      <div className="notice">{data.note}</div>
    </div>
  )
}
