import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"

export default function AnalyzePage() {
  const [raw, setRaw] = useState("")
  const [subject, setSubject] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ id: number; worst_severity: string; findings: number; disclaimer: string } | null>(null)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      setResult(await api.analyze(raw, subject))
    } catch (err) {
      setError(err instanceof Error ? err.message : "analysis failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Analyze a message</h1>
      <div className="notice">
        Paste the raw message (headers + body). Links are never visited and attachments are never
        opened — the engine only reads the text you paste. Findings are warnings for review, not proof.
      </div>
      <form className="card" onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <input className="input" placeholder="label for this analysis (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <textarea className="input" rows={10} placeholder={"From: someone@example.test\nSubject: ...\n\nMessage body…"} value={raw} onChange={(e) => setRaw(e.target.value)} required />
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
        <button className="btn" disabled={busy || !raw.trim()}>{busy ? "Analyzing…" : "Analyze message"}</button>
      </form>
      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>
            Result: <span className={`badge ${result.worst_severity}`}>{result.worst_severity}</span> — {result.findings} finding(s)
          </h2>
          <p style={{ fontSize: "0.88rem", color: "var(--muted)" }}>{result.disclaimer}</p>
          <button className="btn" onClick={() => navigate(`/messages/${result.id}`)}>Open full analysis</button>
        </div>
      )}
    </div>
  )
}
