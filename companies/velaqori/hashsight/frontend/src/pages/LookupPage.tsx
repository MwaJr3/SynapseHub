import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { BlurFade } from "../decor"
import { api, type HashRecordDetail } from "../lib/api"

export default function LookupPage() {
  const [file, setFile] = useState<File | null>(null)
  const [confirmExternal, setConfirmExternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<HashRecordDetail | null>(null)
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setBusy(true); setError("")
    try {
      const rec = await api.analyzeUpload(file, confirmExternal)
      setResult(rec)
    } catch (err) {
      setError(err instanceof Error ? err.message : "analysis failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Hash lookup</h1>
      <BlurFade><div className="notice">
        Files are hashed locally and are never executed. In demo mode nothing leaves this machine.
        Enabling an external provider sends only the digest, and only when you tick the confirmation below.
      </div></BlurFade>
      <form className="card" onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <input className="input" type="file" accept="*/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", fontSize: "0.9rem" }}>
          <input type="checkbox" checked={confirmExternal} onChange={(e) => setConfirmExternal(e.target.checked)} />
          I understand that, if an external provider is configured, this file's digest will be sent to it (the file itself is never uploaded).
        </label>
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
        <button aria-describedby="lookup-hashsight-1-hint" className="btn" disabled={busy || !file}>{busy ? "Hashing…" : "Analyze file"}</button>
          <span id="lookup-hashsight-1-hint" className="hint">Fill in the field above to enable this.</span>
      </form>
      {result && (
        <BlurFade><div className="card">
          <h2 style={{ marginTop: 0 }}>{result.filename} <span className={`verdict ${result.combined_verdict}`}>{result.combined_verdict}</span></h2>
          <table className="table">
            <tbody>
              <tr><th scope="col">SHA-256</th><td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{result.sha256}</td></tr>
              <tr><th scope="col">SHA-1</th><td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{result.sha1}</td></tr>
              <tr><th scope="col">MD5</th><td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{result.md5}</td></tr>
            </tbody>
          </table>
          <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            MD5/SHA-1 are for indicator compatibility only — not for collision resistance.
          </p>
          <button className="btn" onClick={() => navigate(`/records/${result.id}`)}>Open record</button>
        </div></BlurFade>
      )}
    </div>
  )
}
