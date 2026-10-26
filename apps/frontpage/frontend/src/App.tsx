import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Workspace } from './components/Workspace';
import { Shell } from './components/Shell';
import { Logo } from './components/Brand';
import { LibraryProvider } from './state/library';
import { SessionProvider, useSession } from './state/session';
import { ToastProvider } from './state/toast';
import { DigestPage } from './pages/Digest';
import { DiscoverPage } from './pages/DiscoverPage';
import { FeedsPage } from './pages/Feeds';
import { Landing } from './pages/Landing';
import { NotFound } from './pages/NotFound';
import { SettingsPage } from './pages/Settings';
import { ForgotPassword, ResetPassword, SignIn, SignUp } from './pages/Auth';

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading Frontpage">
      <Logo size={40} />
    </div>
  );
}

/** Everything under /app needs a session (account or guest). */
function Protected() {
  const { state } = useSession();
  const loc = useLocation();
  if (state.status === 'loading') return <Splash />;
  if (state.status === 'anon') return <Navigate to="/sign-in" replace state={{ from: loc.pathname + loc.search }} />;
  return (
    <LibraryProvider>
      <Shell />
    </LibraryProvider>
  );
}

function Public() {
  const { state } = useSession();
  if (state.status === 'loading') return <Splash />;
  return <Outlet />;
}

function IdScope({ kind }: { kind: 'category' | 'feed' }) {
  const id = Number(useParams().id);
  if (!Number.isInteger(id)) return <NotFound inApp />;
  return <Workspace key={`${kind}-${id}`} scope={{ kind, id }} />;
}

export function App() {
  return (
    <ToastProvider>
      <SessionProvider>
        <Routes>
          <Route element={<Public />}>
            <Route path="/" element={<Landing />} />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/sign-up" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
          <Route path="/app" element={<Protected />}>
            <Route index element={<Workspace key="all" scope={{ kind: 'all' }} />} />
            <Route path="unread" element={<Workspace key="unread" scope={{ kind: 'unread' }} />} />
            <Route path="saved" element={<Workspace key="saved" scope={{ kind: 'saved' }} />} />
            <Route path="search" element={<Workspace key="search" scope={{ kind: 'search' }} />} />
            <Route path="uncategorized" element={<Workspace key="uncat" scope={{ kind: 'uncategorized' }} />} />
            <Route path="category/:id" element={<IdScope kind="category" />} />
            <Route path="feed/:id" element={<IdScope kind="feed" />} />
            <Route path="digest" element={<DigestPage />} />
            <Route path="discover" element={<DiscoverPage />} />
            <Route path="feeds" element={<FeedsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound inApp />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SessionProvider>
    </ToastProvider>
  );
}
