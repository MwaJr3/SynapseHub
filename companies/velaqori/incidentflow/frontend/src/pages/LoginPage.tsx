import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { useAuth } from "../App"

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("responder")
  const [mfaCode, setMfaCode] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [devToken, setDevToken] = useState("")
  const [error, setError] = useState("")
  const [flash, setFlash] = useState("")
  const [busy, setBusy] = useState(false)
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(""); setFlash("")
    try {
      if (mode === "register") {
        await api.register(email, password, role)
        const me = await api.login(email, password)
        setAuth({ email: me.email, role: me.role, mfa_enabled: me.mfa_enabled })
        navigate("/")
      } else if (mode === "login") {
        const me = await api.login(email, password, mfaCode)
        setAuth({ email: me.email, role: me.role, mfa_enabled: me.mfa_enabled })
        navigate("/")
      } else if (!devToken && !resetToken) {
        const r = await api.resetRequest(email)
        if (r.dev_token) { setDevToken(r.dev_token); setFlash(r.dev_note ?? r.note) }
        else setFlash(r.note)
      } else {
        const r = await api.resetConfirm(resetToken || devToken, newPassword)
        setFlash(r.note); setMode("login"); setDevToken(""); setResetToken("")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: "27rem", margin: "3rem auto" }}>
      <h1 style={{ marginTop: 0 }}>
        {mode === "login" ? "Sign in" : mode === "register" ? "Create responder account" : "Reset password"}
      </h1>
      <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
        <input aria-label="Email" className="input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {mode !== "reset" && (
          <input aria-label="Password (12+ characters)" className="input" type="password" placeholder="password (12+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
        )}
        {mode === "register" && (
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="observer">Observer (read-only)</option>
            <option value="responder">Responder</option>
            <option value="lead">Incident lead</option>
          </select>
        )}
        {mode === "login" && (
          <input aria-label="MFA code (if enabled)" className="input" placeholder="MFA code (if enabled)" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} inputMode="numeric" />
        )}
        {mode === "reset" && (devToken || resetToken) && (
          <>
            <input aria-label="Reset token" className="input" placeholder="reset token" value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
            <input aria-label="New password (12+ characters)" className="input" type="password" placeholder="new password (12+ characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </>
        )}
        {error && <p role="alert" style={{ color: "#9b2226", margin: 0 }}>{error}</p>}
        {flash && <p role="status" style={{ color: "#1b5e34", margin: 0 }}>{flash}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Working…" : mode === "login" ? "Sign in" : mode === "register" ? "Register" : "Continue"}
        </button>
      </form>
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
        <button className="btn secondary" style={{ flex: 1 }} onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Need an account?" : "Have an account?"}
        </button>
        <button className="btn secondary" style={{ flex: 1 }} onClick={() => setMode("reset")}>Forgot password</button>
      </div>
    </div>
  )
}
