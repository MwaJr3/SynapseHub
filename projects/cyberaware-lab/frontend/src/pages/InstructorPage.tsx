import { useEffect, useState } from "react"
import { api, type ProgressRow } from "../lib/api"

const BANNER_HINT = "Every simulation is stored with a mandatory visible training banner (added server-side). Password fields, real-organization references, and non-fictional domains are rejected."

export default function InstructorPage() {
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState("phishing_email")
  const [content, setContent] = useState("")
  const [quizJson, setQuizJson] = useState("[]")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const [groups, setGroups] = useState<Array<{ id: number; name: string }>>([])
  const [templates, setTemplates] = useState<Array<{ id: number; title: string; kind: string }>>([])
  const [groupId, setGroupId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [memberEmail, setMemberEmail] = useState("")
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [note, setNote] = useState("")
  const load = () => {
    api.groups().then((r) => setGroups(r.groups)).catch(() => {})
    api.templates().then((r) => setTemplates(r.templates)).catch(() => {})
    api.progress().then((r) => setProgress(r.report)).catch(() => {})
  }
  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Instructor console</h1>
      <div className="notice">{BANNER_HINT}</div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Scenario-safe content editor</h3>
        <input className="input" placeholder="title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="phishing_email">Phishing email simulation</option>
          <option value="incident_briefing">Incident briefing</option>
          <option value="quiz">Quiz</option>
        </select>
        <textarea className="input" rows={6} placeholder="fictional scenario content (use .example/.test/.invalid domains)"
          value={content} onChange={(e) => setContent(e.target.value)} />
        <textarea className="input" rows={2} placeholder='quiz JSON, e.g. [{"prompt":"Real?","choices":["Yes","No"],"correct":1}]'
          value={quizJson} onChange={(e) => setQuizJson(e.target.value)} />
        <button className="btn" disabled={!title.trim() || !content.trim()} onClick={async () => {
          setError(""); setFlash("")
          try {
            const r = await api.createTemplate(title, kind, content, quizJson)
            setFlash(`Template saved. Banner: ${r.banner}`)
            setTitle(""); setContent(""); load()
          } catch (e) { setError(String(e)) }
        }}>Save template</button>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Groups &amp; assignments</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input className="input" placeholder="new group name" id="gname" style={{ maxWidth: "16rem" }} />
          <button className="btn secondary" onClick={async () => {
            const el = document.getElementById("gname") as HTMLInputElement
            if (el?.value) { await api.createGroup(el.value); el.value = ""; load() }
          }}>Create group</button>
          <input className="input" placeholder="member email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} style={{ maxWidth: "16rem" }} />
          <select className="input" style={{ maxWidth: "12rem" }} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">group…</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button className="btn secondary" disabled={!memberEmail || !groupId} onClick={async () => {
            try { await api.addMember(Number(groupId), memberEmail); setMemberEmail(""); setFlash("Member added.") }
            catch (e) { setError(String(e)) }
          }}>Add member</button>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <select className="input" style={{ maxWidth: "16rem" }} value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            <option value="">template…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <button className="btn" disabled={!templateId || !groupId} onClick={async () => {
            try { await api.createAssignment(Number(groupId), Number(templateId)); setFlash("Assigned."); load() }
            catch (e) { setError(String(e)) }
          }}>Assign to group</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Progress &amp; participation</h3>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
          Completion is not proof of lasting awareness — these figures describe recorded activity in this lab.
        </p>
        <table className="table">
          <thead><tr><th>Group</th><th>Exercise</th><th>Participation</th><th>Avg. checkpoint score</th><th>After-action note</th></tr></thead>
          <tbody>
            {progress.map((p) => (
              <tr key={p.assignment_id}>
                <td>{p.group}</td><td>{p.title}</td><td>{p.participation}</td>
                <td>{p.average_score ?? "—"}</td>
                <td>
                  <input className="input" placeholder="note" value={note} onChange={(e) => setNote(e.target.value)} style={{ maxWidth: "12rem", display: "inline-block" }} />
                  <button className="btn secondary" style={{ marginLeft: "0.4rem" }} disabled={!note}
                    onClick={async () => { await api.addNote(p.assignment_id, note); setNote(""); setFlash("Note saved.") }}>
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
