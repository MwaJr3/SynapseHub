import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './features/auth/auth-context';
import { Layout } from './components/Layout';
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const TeamsPage = lazy(() => import('./pages/TeamsPage'));
const TasksPage = lazy(() => import('./pages/TasksPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const AuditPage = lazy(() => import('./pages/AuditPage'));
const UsagePage = lazy(() => import('./pages/UsagePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PlatformPage = lazy(() => import('./pages/PlatformPage'));
const IsolationPage = lazy(() => import('./pages/IsolationPage'));

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-ink-950 text-white"><div className="text-center"><Loader2 className="mx-auto animate-spin text-brand-500" /><p className="mt-3 text-sm text-slate-500">Verifying your session…</p></div></div>;
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  return <Suspense fallback={<div className="grid min-h-[50vh] place-items-center"><Loader2 className="animate-spin text-brand-600" /></div>}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<Protected />}>
      <Route path="/" element={<Navigate to={user?.is_platform_admin ? '/platform' : '/dashboard'} replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/teams" element={<TeamsPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/members" element={<MembersPage />} />
      <Route path="/usage" element={<UsagePage />} />
      <Route path="/audit" element={<AuditPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/isolation" element={<IsolationPage />} />
      <Route path="/platform" element={<PlatformPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Suspense>;
}
