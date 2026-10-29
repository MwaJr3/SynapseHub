import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import CapturesPage from "./pages/CapturesPage"
import CapturePage from "./pages/CapturePage"

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
          <strong style={{ fontSize: "1.1rem" }}>NetScope</strong>
          <nav style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Captures</Link>
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
        Metadata-only capture analysis. Packet payloads are never inspected or exported.
        Unusual-volume flags are configurable heuristics for review — not proof of an attack.
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
            <Route path="/" element={auth ? <CapturesPage /> : <Navigate to="/login" replace />} />
            <Route path="/captures/:id" element={auth ? <CapturePage /> : <Navigate to="/login" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
