import { useEffect, useState } from "react"
import { api, type Finding } from "../lib/api"

export default function FindingsPage() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [error, setError] = useState("")
  const [taskOwner, setTaskOwner] = useState("")
  const [flash, setFlash] = useState("")
  useEffect(() => { api.findings().then((r) => setFindings(r.findings)).catch((e) => setError(String(e))) }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Findings &amp; remediation</h1>
      <div className="notice">
        Classifications combine severity, exposure, and business importance. An observed service is an
        indicator to assess — not proof of a vulnerability or an attack.
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      {findings.length === 0 ? <p style={{ color: "var(--muted)" }}>No findings recorded.</p> : (
        <table className="table card">
          <thead><tr><th>Target</th><th>Port</th><th>Service</th><th>Severity</th><th>Exposure</th><th>Importance</th><th>Status</th><th>Remediation</th></tr></thead>
          <tbody>
            {findings.map((f) => (
              <tr key={f.id}>
                <td>{f.target}</td><td>{f.port}</td><td>{f.service}</td>
                <td><span className={`badge ${f.severity}`}>{f.severity}</span></td>
                <td>{f.exposure}</td><td>{f.business_importance}</td><td>{f.status}</td>
                <td>
                  <input className="input" placeholder="owner team" value={taskOwner} onChange={(e) => setTaskOwner(e.target.value)} style={{ maxWidth: "9rem", display: "inline-block" }} />
                  <button className="btn secondary" style={{ marginLeft: "0.4rem" }} disabled={!taskOwner.trim()}
                    onClick={async () => { await api.createTask(f.id, taskOwner, ""); setTaskOwner(""); setFlash("Remediation task created.") }}>
                    Assign
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
