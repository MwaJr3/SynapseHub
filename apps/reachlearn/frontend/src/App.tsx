import { useCallback, useEffect, useState } from 'react';
import { api, type User } from './api';
import { ErrorBanner, Field, Loading } from './ui';
import { DeliveryPage, SettingsPage, StudioPage } from './pages';

type Route = 'studio' | 'delivery' | 'settings';
const NAV: { id: Route; label: string }[] = [
  { id: 'studio', label: 'Content studio & previews' },
  { id: 'delivery', label: 'Delivery queue' },
  { id: 'settings', label: 'Settings' },
];

function useHashRoute(): [Route, (r: Route) => void] {
  const read = (): Route => {
    const hash = window.location.hash.replace('#/', '') as Route;
    return NAV.some((n) => n.id === hash) ? hash : 'studio';
  };
  const [route, setRoute] = useState<Route>(read);
  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const navigate = useCallback((next: Route) => { window.location.hash = `#/${next}`; setRoute(next); }, []);
  return [route, navigate];
}

function AuthScreen({ onSignedIn }: { onSignedIn: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('educator');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const user = mode === 'login' ? await api.login(email, password) : await api.register(email, password, displayName, role);
      onSignedIn(user);
    } catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed.'); } finally { setBusy(false); }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-teal-300">ReachLearn</h1>
          <p className="mt-1 text-sm text-slate-400">SMS, USSD and IVR microlearning.</p>
        </div>
        {error ? <ErrorBanner message={error} /> : null}
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password (min 8 characters)"><input className="input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {mode === 'register' ? (
          <>
            <Field label="Display name"><input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
            <Field label="Role">
              <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="educator">Educator</option>
                <option value="learner">Learner</option>
                <option value="admin">Program administrator</option>
                <option value="provider_admin">Provider administrator</option>
              </select>
            </Field>
          </>
        ) : null}
        <button className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <button type="button" className="btn-ghost w-full justify-center" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [route, navigate] = useHashRoute();
  useEffect(() => { api.me().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false)); }, []);
  if (checking) return <div className="flex min-h-screen items-center justify-center"><Loading /></div>;
  if (!user) return <AuthScreen onSignedIn={setUser} />;
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-slate-800 bg-slate-900/60 p-4 md:w-56 md:border-b-0 md:border-r">
        <div className="mb-4 px-2">
          <div className="text-lg font-semibold text-teal-300">ReachLearn</div>
          <div className="text-xs text-slate-500">Microlearning gateway</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((item) => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm whitespace-nowrap ${route === item.id ? 'bg-teal-950 text-teal-200' : 'text-slate-300 hover:bg-slate-800'}`}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-400">
          <div className="truncate px-2">{user.display_name}</div>
          <div className="px-2 uppercase">{user.role}</div>
          <button className="btn-ghost mt-2 w-full justify-center" onClick={async () => { await api.logout(); setUser(null); }}>Sign out</button>
        </div>
      </aside>
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {route === 'studio' ? <StudioPage /> : null}
        {route === 'delivery' ? <DeliveryPage /> : null}
        {route === 'settings' ? <SettingsPage user={user} /> : null}
      </main>
    </div>
  );
}
