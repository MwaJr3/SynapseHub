import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import BoardPage from "./pages/BoardPage"
import IncidentPage from "./pages/IncidentPage"
import AuditPage from "./pages/AuditPage"

type Auth = { email: string; role: string; mfa_enabled: boolean } | null
const AuthCtx = createContext<{ auth: Auth; setAuth: (a: Auth) => void }>({ auth: null, setAuth: () => {} })
export const useAuth = () => useContext(AuthCtx)

function Shell({ children }: { children: React.ReactNode }) {
  const { auth, setAuth } = useAuth()
  const navigate = useNavigate()
  return (
    <div>
      <header style={{ background: "var(--accent)", color: "white" }}>
        <div className="shell" style={{ display: "flex", gap: "1.25rem", alignItems: "center", padding: "0.85rem 1.25rem" }}>
          <strong style={{ fontSize: "1.1rem" }}>IncidentFlow</strong>
          <nav style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Incidents</Link>
            <Link to="/audit" style={{ color: "white" }}>Audit</Link>
          </nav>
          {auth && (
            <span style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.85rem" }}>
              {auth.email} ({auth.role})
              <button className="btn secondary" onClick={async () => { await api.logout(); setAuth(null); navigate("/login") }}>
                Sign out
              </button>
            </span>
          )}
        </div>
      </header>
      <main className="shell">{children}</main>
      <footer className="shell" style={{ color: "var(--muted)", fontSize: "0.8rem", paddingBottom: "2rem" }}>
        Incident records are working notes — not proof of chronology or fact. Hash verification shows
        integrity since collection only. This is not a forensic/legal admissibility tool.
      </footer>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<Auth>(null)
  useEffect(() => { api.me().then(setAuth).catch(() => setAuth(null)) }, [])
  return (
    <AuthCtx.Provider value={{ auth, setAuth }}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={auth ? <BoardPage /> : <Navigate to="/login" replace />} />
            <Route path="/incidents/:id" element={auth ? <IncidentPage /> : <Navigate to="/login" replace />} />
            <Route path="/audit" element={auth ? <AuditPage /> : <Navigate to="/login" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
