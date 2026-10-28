import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import LookupPage from "./pages/LookupPage"
import HistoryPage from "./pages/HistoryPage"
import RecordPage from "./pages/RecordPage"
import CasesPage from "./pages/CasesPage"

type Auth = { email: string; role: string } | null
const AuthCtx = createContext<{ auth: Auth; setAuth: (a: Auth) => void }>({ auth: null, setAuth: () => {} })
export const useAuth = () => useContext(AuthCtx)

function Shell({ children }: { children: React.ReactNode }) {
  const { auth, setAuth } = useAuth()
  const navigate = useNavigate()
  return (
    <div>
      <header style={{ background: "var(--accent)", color: "white" }}>
        <div className="shell" style={{ display: "flex", gap: "1.25rem", alignItems: "center", padding: "0.85rem 1.25rem" }}>
          <strong style={{ fontSize: "1.1rem" }}>HashSight</strong>
          <nav style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Lookup</Link>
            <Link to="/history" style={{ color: "white" }}>History</Link>
            <Link to="/cases" style={{ color: "white" }}>Cases</Link>
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
        HashSight computes hashes locally. Reputation results are point-in-time reports about a digest —
        "no known detection" does not prove a file is safe. Demonstration provider data is simulated.
      </footer>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<Auth>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api.me().then(setAuth).catch(() => setAuth(null)).finally(() => setLoading(false))
  }, [])
  if (loading) <div className="shell"><p className="loading" role="status" aria-live="polite">Loading your session…</p></div>
  return (
    <AuthCtx.Provider value={{ auth, setAuth }}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={auth ? <LookupPage /> : <Navigate to="/login" replace />} />
            <Route path="/history" element={auth ? <HistoryPage /> : <Navigate to="/login" replace />} />
            <Route path="/records/:id" element={auth ? <RecordPage /> : <Navigate to="/login" replace />} />
            <Route path="/cases" element={auth ? <CasesPage /> : <Navigate to="/login" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
