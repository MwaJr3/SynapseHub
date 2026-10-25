import { useCallback, useEffect, useState } from 'react';

import { api, ApiError } from './api';
import { ChessPage, ConceptPage, KnowledgePage, MapPage, SignInPage, SourcesPage, TodayPage } from './pages';
import { Loading } from './ui';

type Route =
  | { name: 'today' }
  | { name: 'knowledge' }
  | { name: 'map' }
  | { name: 'chess' }
  | { name: 'sources' }
  | { name: 'concept'; id: string };

const NAV: { label: string; route: Route }[] = [
  { label: 'Today', route: { name: 'today' } },
  { label: 'Knowledge', route: { name: 'knowledge' } },
  { label: 'Map', route: { name: 'map' } },
  { label: 'Chess', route: { name: 'chess' } },
  { label: 'Sources', route: { name: 'sources' } },
];

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [route, setRoute] = useState<Route>({ name: 'today' });

  const checkSession = useCallback(async () => {
    try {
      const me = await api.me();
      setEmail(me.email);
      setSignedIn(true);
    } catch (cause) {
      // 401 simply means "not signed in"; anything else is surfaced as such.
      if (cause instanceof ApiError && cause.status === 401) {
        setSignedIn(false);
      } else {
        setSignedIn(false);
      }
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const signOut = async () => {
    await api.logout();
    setSignedIn(false);
    setRoute({ name: 'today' });
  };

  if (signedIn === null) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <Loading label="Starting Tessera" />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:bg-white focus:p-2">
        Skip to content
      </a>

      <header className="border-b bg-white" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-lg font-semibold" style={{ color: 'var(--accent)' }}>Tessera</p>
            <p className="text-xs text-[color:var(--muted)]">A Tamuzi Learning product</p>
          </div>
          {signedIn ? (
            <nav aria-label="Sections" className="flex flex-wrap items-center gap-1">
              {NAV.map((item) => {
                const active = route.name === item.route.name;
                return (
                  <button
                    key={item.label}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setRoute(item.route)}
                    className={`rounded-md px-3 py-1.5 text-sm ${active ? 'font-semibold' : ''}`}
                    style={active ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button type="button" className="btn ml-2" onClick={signOut}>Sign out</button>
            </nav>
          ) : null}
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl p-4 md:p-6">
        {!signedIn ? (
          <SignInPage onSignedIn={() => { void checkSession(); }} />
        ) : (
          <>
            {route.name === 'today' && <TodayPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />}
            {route.name === 'knowledge' && <KnowledgePage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />}
            {route.name === 'map' && <MapPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />}
            {route.name === 'chess' && <ChessPage />}
            {route.name === 'sources' && <SourcesPage />}
            {route.name === 'concept' && (
              <ConceptPage conceptId={route.id} onBack={() => setRoute({ name: 'knowledge' })} />
            )}
          </>
        )}
      </main>

      <footer className="mx-auto max-w-5xl p-4 text-xs text-[color:var(--muted)] md:p-6">
        <p>
          {signedIn ? `Signed in as ${email}. ` : ''}
          Demo content is original material written for this project. Mastery reflects only answers you have given
          here; nothing is inferred from other activity.
        </p>
        <p className="mt-1">Tessera is a Tamuzi Learning product and is operated independently of any other company.</p>
      </footer>
    </div>
  );
}
