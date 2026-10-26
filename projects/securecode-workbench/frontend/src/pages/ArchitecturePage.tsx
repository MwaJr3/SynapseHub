export default function ArchitecturePage() {
  const stages = [
    { title: "Ingest", body: "Zip archive (sandboxed extraction: traversal/bomb/size/file-count limits) · pasted source · Bandit JSON" },
    { title: "Rules engine", body: "Modular rule sets: Python security heuristics (PY-*) + secret detection (SEC-*). Rules are data — completely separate from presentation" },
    { title: "Normalize", body: "Common finding schema: severity, CWE, file, line, evidence, explanation, suggested fix" },
    { title: "Triage", body: "Human review workflow: open / accepted / fixed / suppressed + project baseline for known items" },
    { title: "Report", body: "Export with summary, per-finding disclaimers, and limitations (including: absence of findings is not proof of security)" },
    { title: "Optional AI review", body: "Off by default. Requires configuration AND explicit per-run consent. No provider is configured in this deployment — no source is ever sent" },
  ]
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Architecture &amp; security posture</h1>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        {stages.map((s, i) => (
          <div key={s.title} style={{ borderLeft: "4px solid var(--accent)", paddingLeft: "0.85rem" }}>
            <strong>{i + 1}. {s.title}</strong>
            <p style={{ margin: "0.25rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>{s.body}</p>
          </div>
        ))}
      </div>
      <div className="notice">
        Hard boundaries: uploaded code is <strong>never executed</strong>; evidence is redacted before
        display; suggested fixes are never auto-applied; nothing is sent to external AI services
        without explicit consent; findings are indicators, not proof.
      </div>
    </div>
  )
}
