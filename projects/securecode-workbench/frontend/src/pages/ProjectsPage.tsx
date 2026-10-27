import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type ProjectRow } from "../lib/api"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [name, setName] = useState("")
  const [path, setPath] = useState("app.py")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const [busy, setBusy] = useState(false)
  const load = () => api.projects().then((r) => setProjects(r.projects)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Projects</h1>
      <div className="notice">
        Uploads are treated as untrusted: path traversal, zip bombs, oversized archives and file-count
        abuse are refused by the backend. Files are read as text for rule matching only — code is
        never executed. Evidence in findings is redacted by default.
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Scan a zip archive</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input aria-label="Project name" className="input" placeholder="project name" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: "16rem" }} />
          <input className="input" type="file" accept=".zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button aria-describedby="projects-securecode-workbench-1-hint" className="btn" disabled={!name.trim() || !file || busy} onClick={async () => {
            setBusy(true); setError("")
            try { const r = await api.scanArchive(name, file!); setFlash(`Scanned ${r.files_scanned} files — ${r.findings} findings.`); load() }
            catch (e) { setError(String(e)) } finally { setBusy(false) }
          }}>{busy ? "Scanning…" : "Upload & scan"}</button>
          <span id="projects-securecode-workbench-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Paste source</h3>
        <input aria-label="Project name" className="input" placeholder="project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="File path (e.g. app.py)" className="input" placeholder="file path (e.g. app.py)" value={path} onChange={(e) => setPath(e.target.value)} />
        <textarea className="input" rows={6} placeholder="paste source code…" value={content} onChange={(e) => setContent(e.target.value)} />
        <button aria-describedby="projects-securecode-workbench-2-hint" className="btn" disabled={!name.trim() || !content.trim() || busy} onClick={async () => {
          setBusy(true); setError("")
          try {
            const r = await api.scanPaste(name, [{ path, content }])
            setFlash(`Scanned ${r.files_scanned} files — ${r.findings} findings. ${r.limitations}`)
            setContent(""); load()
          } catch (e) { setError(String(e)) } finally { setBusy(false) }
        }}>{busy ? "Scanning…" : "Scan pasted source"}</button>
          <span id="projects-securecode-workbench-2-hint" className="hint">Fill in the field above to enable this.</span>
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      {projects.length === 0 ? <p style={{ color: "var(--muted)" }}>No projects scanned yet.</p> : (
        <table className="table card">
          <thead><tr><th scope="col">Project</th><th scope="col">Source</th><th scope="col">Files scanned</th><th scope="col">Findings</th><th scope="col"></th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td><span className="badge">{p.source_kind}</span></td>
                <td>{p.files_scanned}</td><td>{p.findings}</td>
                <td><Link to={`/runs/${p.run_id}`}>Open findings</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
