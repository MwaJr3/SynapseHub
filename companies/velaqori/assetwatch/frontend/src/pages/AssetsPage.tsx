import { useEffect, useState } from "react"
import { api, type Asset } from "../lib/api"

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [hostname, setHostname] = useState("")
  const [importance, setImportance] = useState("medium")
  const [ownerName, setOwnerName] = useState("")
  const [entry, setEntry] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const load = () => api.assets().then((r) => setAssets(r.assets)).catch((e) => setError(String(e)))
  useEffect(() => { load() }, [])

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1>Asset inventory</h1>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Register asset</h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input aria-label="Hostname or IP (must be authorized)" className="input" placeholder="hostname or IP (must be authorized)" value={hostname} onChange={(e) => setHostname(e.target.value)} />
          <input aria-label="Owner team" className="input" placeholder="owner team" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} style={{ maxWidth: "12rem" }} />
          <select className="input" style={{ maxWidth: "10rem" }} value={importance} onChange={(e) => setImportance(e.target.value)}>
            <option>low</option><option>medium</option><option>high</option><option>critical</option>
          </select>
          <button aria-describedby="assets-assetwatch-1-hint" className="btn" disabled={!hostname.trim()} onClick={async () => {
            try { await api.createAsset({ hostname, importance, owner_name: ownerName }); setHostname(""); setFlash("Asset created."); load() }
            catch (e) { setError(String(e)) }
          }}>Add asset</button>
          <span id="assets-assetwatch-1-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
      </div>
      <div className="card" style={{ display: "grid", gap: "0.75rem" }}>
        <h3 style={{ margin: 0 }}>Authorization allowlist</h3>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
          Scans are refused for any target not listed here — including hostnames, IPs, and CIDR ranges. Validated server-side on every scan.
        </p>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <input aria-label="10.0.0.0/24 or host.example" className="input" placeholder="10.0.0.0/24 or host.example" value={entry} onChange={(e) => setEntry(e.target.value)} />
          <button aria-describedby="assets-assetwatch-2-hint" className="btn secondary" disabled={!entry.trim()} onClick={async () => {
            try { await api.addAllowlist(entry, "authorized scope"); setEntry(""); setFlash("Allowlist entry added.") }
            catch (e) { setError(String(e)) }
          }}>Authorize</button>
          <span id="assets-assetwatch-2-hint" className="hint">Fill in the field above to enable this.</span>
        </div>
      </div>
      {error && <p role="alert" style={{ color: "#9b2226" }}>{error}</p>}
      {flash && <p role="status" style={{ color: "#1b5e34" }}>{flash}</p>}
      {assets.length === 0
        ? <p style={{ color: "var(--muted)" }}>No assets recorded yet.</p>
        : (
          <table className="table card">
            <thead><tr><th scope="col">Hostname</th><th scope="col">Kind</th><th scope="col">Environment</th><th scope="col">Owner</th><th scope="col">Importance</th></tr></thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a.id}>
                  <td>{a.hostname}</td><td>{a.kind}</td><td>{a.environment}</td><td>{a.owner_name || "—"}</td>
                  <td><span className={`badge ${a.importance}`}>{a.importance}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}
