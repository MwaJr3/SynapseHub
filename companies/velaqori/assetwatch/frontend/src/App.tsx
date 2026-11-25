import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import DashboardPage from "./pages/DashboardPage"
import AssetsPage from "./pages/AssetsPage"
import ScansPage from "./pages/ScansPage"
import FindingsPage from "./pages/FindingsPage"
import AuditPage from "./pages/AuditPage"

type Auth = { email: string; role: string } | null
const AuthCtx = createContext<{ auth: Auth; setAuth: (a: Auth) => void }>({ auth: null, setAuth: () => {} })
export const useAuth = () => useContext(AuthCtx)

function Shell({ children }: { children: React.ReactNode }) {
  const { auth, setAuth } = useAuth()
  const navigate = useNavigate()
  return (
    <div>
      <header style={{ background: "var(--accent)", color: "white" }}>
        <div className="shell" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem 1.25rem", alignItems: "center", padding: "0.85rem 1.25rem" }}>
          <strong style={{ fontSize: "1.1rem" }}>AssetWatch</strong>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem 1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Dashboard</Link>
            <Link to="/assets" style={{ color: "white" }}>Assets</Link>
            <Link to="/scans" style={{ color: "white" }}>Scans</Link>
            <Link to="/findings" style={{ color: "white" }}>Findings</Link>
            <Link to="/audit" style={{ color: "white" }}>Audit</Link>
          </nav>
          {auth && (
            <span style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.85rem" }}>
              {auth.email}
              <button className="btn secondary" onClick={() => { setAuth(null); navigate("/login") }}>Sign out</button>
            </span>
          )}
        </div>
      </header>
      <main className="shell">{children}</main>
      <footer className="shell" style={{ color: "var(--muted)", fontSize: "0.8rem", paddingBottom: "2rem" }}>
        Authorized asset management and exposure monitoring only. Scans run exclusively against
        explicitly allowlisted targets, validated server-side before every scan. No exploitation,
        credential attacks, or stealth techniques. Simulated results are labelled.
      </footer>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<Auth>(null)
  useEffect(() => {
    api.me().then(setAuth).catch(() => setAuth(null))
  }, [])
  return (
    <AuthCtx.Provider value={{ auth, setAuth }}>
      <BrowserRouter>
        <Shell>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={auth ? <DashboardPage /> : <Navigate to="/login" replace />} />
            <Route path="/assets" element={auth ? <AssetsPage /> : <Navigate to="/login" replace />} />
            <Route path="/scans" element={auth ? <ScansPage /> : <Navigate to="/login" replace />} />
            <Route path="/findings" element={auth ? <FindingsPage /> : <Navigate to="/login" replace />} />
            <Route path="/audit" element={auth ? <AuditPage /> : <Navigate to="/login" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
