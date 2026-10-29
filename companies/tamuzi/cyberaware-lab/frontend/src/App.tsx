import { createContext, useContext, useEffect, useState } from "react"
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom"
import { api } from "./lib/api"
import LoginPage from "./pages/LoginPage"
import LearnerHomePage from "./pages/LearnerHomePage"
import SimulationPage from "./pages/SimulationPage"
import InstructorPage from "./pages/InstructorPage"

type Auth = { email: string; role: string; display_name: string } | null
const AuthCtx = createContext<{ auth: Auth; setAuth: (a: Auth) => void }>({ auth: null, setAuth: () => {} })
export const useAuth = () => useContext(AuthCtx)

function Shell({ children }: { children: React.ReactNode }) {
  const { auth, setAuth } = useAuth()
  const navigate = useNavigate()
  return (
    <div>
      <header style={{ background: "var(--accent)", color: "white" }}>
        <div className="shell" style={{ display: "flex", gap: "1.25rem", alignItems: "center", padding: "0.85rem 1.25rem" }}>
          <strong style={{ fontSize: "1.1rem" }}>CyberAware Lab</strong>
          <nav style={{ display: "flex", gap: "1rem", flex: 1 }}>
            <Link to="/" style={{ color: "white" }}>Home</Link>
            {auth?.role === "instructor" && <Link to="/instructor" style={{ color: "white" }}>Instructor</Link>}
          </nav>
          {auth && (
            <span style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.85rem" }}>
              {auth.display_name || auth.email} ({auth.role})
              <button className="btn secondary" onClick={() => { setAuth(null); navigate("/login") }}>Sign out</button>
            </span>
          )}
        </div>
      </header>
      <main className="shell">{children}</main>
      <footer className="shell" style={{ color: "var(--muted)", fontSize: "0.8rem", paddingBottom: "2rem" }}>
        All simulations are fictional training material with visible banners. CyberAware Lab never
        collects real passwords, never impersonates real organizations, and uses only fictional
        domains. Participation data is demonstration data.
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
            <Route path="/" element={auth ? <LearnerHomePage /> : <Navigate to="/login" replace />} />
            <Route path="/assignments/:assignmentId" element={auth ? <SimulationPage /> : <Navigate to="/login" replace />} />
            <Route path="/instructor" element={auth?.role === "instructor" ? <InstructorPage /> : <Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </BrowserRouter>
    </AuthCtx.Provider>
  )
}
