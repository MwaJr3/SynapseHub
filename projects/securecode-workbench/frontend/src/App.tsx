import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import ProjectsPage from "./pages/ProjectsPage"
import FindingsPage from "./pages/FindingsPage"
import ArchitecturePage from "./pages/ArchitecturePage"

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
          <strong style={{ fontSize: "1.1rem" }}>SecureCode Workbench</strong>
          <nav style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Projects</Link>
            <Link to="/architecture" style={{ color: "white" }}>Architecture</Link>
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
        Code review assistance only. Uploaded code is never executed; archives are sandboxed with
        traversal/bomb/size limits. Findings are indicators to review — not proof of vulnerabilities —
        and an empty result is not proof of security. Source is never sent to AI services without
        explicit consent (and no AI provider is configured in this deployment).
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
            <Route path="/" element={auth ? <ProjectsPage /> : <Navigate to="/login" replace />} />
            <Route path="/runs/:runId" element={auth ? <FindingsPage /> : <Navigate to="/login" replace />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
