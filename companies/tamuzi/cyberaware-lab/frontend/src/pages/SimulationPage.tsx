import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { api, type AssignmentRow, type TemplateView } from "../lib/api"

export default function SimulationPage() {
  const { assignmentId } = useParams()
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null)
  const [tpl, setTpl] = useState<TemplateView | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [reflection, setReflection] = useState("")
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  const [flash, setFlash] = useState("")
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")
  const draftKey = `cyberaware-draft-${assignmentId}`
  const restored = useRef(false)

  // Restore an unfinished draft (answers + reflection) kept on this device only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const d = JSON.parse(raw) as { answers?: number[]; reflection?: string }
        if (Array.isArray(d.answers)) setAnswers(d.answers)
        if (typeof d.reflection === "string") setReflection(d.reflection)
      }
    } catch { /* storage unavailable: start fresh */ }
    restored.current = true
  }, [draftKey])

  // Autosave after a short pause and say so, so nothing is lost on a refresh or a dropped connection.
  useEffect(() => {
    if (!restored.current || (answers.length === 0 && reflection === "")) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ answers, reflection }))
        setSaved("Draft saved on this device")
      } catch { setSaved("") }
    }, 600)
    return () => clearTimeout(t)
  }, [answers, reflection, draftKey])

  useEffect(() => {
    api.assignments().then(async (r) => {
      const found = r.assignments.find((a) => a.id === Number(assignmentId)) ?? null
      setAssignment(found)
      if (found) setTpl(await api.template(found.template_id))
    }).catch((e) => setError(String(e)))
  }, [assignmentId])

  async function finish() {
    try {
      if (tpl && tpl.questions.length > 0) {
        setResult(await api.quizAttempt(Number(assignmentId), answers))
      }
      await api.complete(Number(assignmentId), reflection)
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      setSaved("")
      setFlash("Completion recorded. Thank you — your reflection is stored with the exercise.")
    } catch (e) {
      setError(String(e))
    }
  }

  if (error) return <p role="alert" style={{ color: "#9b2226" }}>{error}</p>
  if (!tpl) return <p className="loading" role="status" aria-live="polite">Loading exercise…</p>

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="training-banner" role="alert">
        TRAINING SIMULATION — this is a fictional exercise created for learning. It is not a real
        message, website, or organization. Never enter a real password anywhere in this lab.
      </div>
      <h1>{assignment?.title ?? tpl.title}</h1>
      <pre style={{ background: "white", border: "1px solid #e8d9cd", borderRadius: 8, padding: "1rem", whiteSpace: "pre-wrap" }}>{tpl.content}</pre>
      {tpl.questions.length > 0 && (
        <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>Awareness checkpoint</h3>
          {tpl.questions.map((q, qi) => (
            <div key={qi}>
              <p style={{ margin: "0 0 0.35rem" }}>{q.prompt}</p>
              {q.choices.map((c, ci) => (
                <label key={ci} style={{ display: "block", fontSize: "0.92rem" }}>
                  <input type="radio" name={`q${qi}`} onChange={() => {
                    const next = [...answers]; next[qi] = ci; setAnswers(next)
                  }} /> {c}
                </label>
              ))}
            </div>
          ))}
          {result && <p role="status"><strong>Checkpoint result:</strong> {result.score}/{result.total} (a score is a learning signal, not a verdict on you)</p>}
        </div>
      )}
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Reflection</h3>
        <textarea className="input" rows={3} placeholder="What signals helped you recognize this simulation?"
          value={reflection} onChange={(e) => setReflection(e.target.value)} />
        {saved && <p role="status" style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>{saved}. You can leave and come back.</p>}
        <button className="btn" onClick={finish}>Complete exercise</button>
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
      </div>
    </div>
  )
}
