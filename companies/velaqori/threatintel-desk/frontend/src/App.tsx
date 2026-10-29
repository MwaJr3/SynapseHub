import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import DeskPage from "./pages/DeskPage"
import IndicatorsPage from "./pages/IndicatorsPage"

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
          <strong style={{ fontSize: "1.1rem" }}>ThreatIntel Desk</strong>
          <nav style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Feeds</Link>
            <Link to="/indicators" style={{ color: "white" }}>Indicators</Link>
          </nav>
          {auth && (
            <span style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.85rem" }}>
              {auth.email}
              <button className="btn secondary" onClick={async () => { await api.logout(); setAuth(null); navigate("/login") }}>
                Sign out
              </button>
            </span>
          )}
        </div>
      </header>
      <main className="shell">{children}</main>
      <footer className="shell" style={{ color: "var(--muted)", fontSize: "0.8rem", paddingBottom: "2rem" }}>
        Feed observations and provider verdicts are unverified third-party claims. Appearing in one
        feed is not proof of maliciousness; absence from feeds is not proof of safety. Triage is a
        human judgment.
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
            <Route path="/" element={auth ? <DeskPage /> : <Navigate to="/login" replace />} />
            <Route path="/indicators" element={auth ? <IndicatorsPage /> : <Navigate to="/login" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
