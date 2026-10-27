import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type AssignmentRow } from "../lib/api"

export default function LearnerHomePage() {
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [error, setError] = useState("")
  useEffect(() => { api.assignments().then((r) => setRows(r.assignments)).catch((e) => setError(String(e))) }, [])
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Your training assignments</h1>
      <div className="notice">
        Every exercise is a fictional simulation with a visible training banner. You will never be
        asked for a real password, and simulated senders use fictional domains only.
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {rows.length === 0 ? <p style={{ color: "var(--muted)" }}>No assignments yet — your instructor will add them.</p> : (
        <table className="table card">
          <thead><tr><th scope="col">Exercise</th><th scope="col">Type</th><th scope="col">Due</th><th scope="col">Status</th><th scope="col"></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}</td>
                <td><span className="badge">{r.kind.replace("_", " ")}</span></td>
                <td>{r.due_at || "—"}</td>
                <td>{r.completed ? <span className="badge">completed</span> : <span className="badge">pending</span>}</td>
                <td><Link to={`/assignments/${r.id}`}>{r.completed ? "Review" : "Start"}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
