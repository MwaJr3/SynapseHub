import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { useAuth } from "../App"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mode, setMode] = useState<"login" | "register">("login")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError("")
    try {
      if (mode === "register") await api.register(email, password)
      const me = await api.login(email, password)
      setAuth({ email: me.email, role: me.role })
      navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: "26rem", margin: "3rem auto" }}>
      <h1 style={{ marginTop: 0 }}>{mode === "login" ? "Sign in" : "Create analyst account"}</h1>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <input className="input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="password (12+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
