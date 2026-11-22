import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { useAuth } from "../App"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("learner")
  const [mode, setMode] = useState<"login" | "register">("login")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      if (mode === "register") await api.register(email, password, role, displayName)
      const me = await api.login(email, password)
      setAuth({ email: me.email, role: me.role, display_name: me.display_name })
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: "26rem", margin: "3rem auto" }}>
      <h1 style={{ marginTop: 0 }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <input aria-label="Email" className="input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input aria-label="Account password (12+ characters)" className="input" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="account password (12+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {mode === "register" && (
          <>
            <input aria-label="Display name" className="input" placeholder="display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="learner">Learner</option>
              <option value="instructor">Instructor</option>
            </select>
          </>
        )}
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
        <button className="btn" disabled={busy}>{busy ? "Working…" : mode === "login" ? "Sign in" : "Register"}</button>
      </form>
      <button className="btn secondary" style={{ marginTop: "0.75rem", width: "100%" }}
        onClick={() => setMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
      </button>
    </div>
  )
}
