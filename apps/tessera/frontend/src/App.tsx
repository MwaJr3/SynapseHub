import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError } from './api';
import { ChessPage, ConceptPage, KnowledgePage, MapPage, SignInPage, SourcesPage, TodayPage } from './pages';
import { CompetencyPage } from './competency';
import { DataControls } from './data';
import { DevelopmentPage } from './development';
import { ConnectedApps, ConsentPage, readConsentParams } from './integration';
import { LibraryPage } from './library';
import { ProfilePage } from './profile';
import { QuestsPage } from './quests';
import { ReviewPage } from './review';
import { parentLabel, parentLink } from './site';
import { TutorPage } from './tutor';
import { Loading } from './ui';

type Route =
  | { name: 'connect' }
  | { name: 'today' }
  | { name: 'profile' }
  | { name: 'quests' }
  | { name: 'development' }
  | { name: 'library' }
  | { name: 'review' }
  | { name: 'competency' }
  | { name: 'knowledge' }
  | { name: 'map' }
  | { name: 'chess' }
  | { name: 'tutor' }
  | { name: 'sources' }
  | { name: 'concept'; id: string };

/** The document title and the hidden h1 both come from here, so they cannot drift. */
const SECTION: Record<Route['name'], string> = {
  connect: 'Connecting an app',
  today: 'Today',
  profile: 'Profile',
  quests: 'Quests',
  development: 'Development',
  library: 'Library',
  review: 'Review',
  competency: 'Competency',
  knowledge: 'Knowledge bank',
  map: 'Knowledge map',
  chess: 'Tactics',
  tutor: 'Tutor',
  sources: 'Sources',
  concept: 'Concept',
};

const NAV: { label: string; route: Route }[] = [
  { label: 'Today', route: { name: 'today' } },
  { label: 'Profile', route: { name: 'profile' } },
  { label: 'Library', route: { name: 'library' } },
  { label: 'Review', route: { name: 'review' } },
  { label: 'Quests', route: { name: 'quests' } },
  { label: 'Development', route: { name: 'development' } },
  { label: 'Competency', route: { name: 'competency' } },
  { label: 'Knowledge', route: { name: 'knowledge' } },
  { label: 'Map', route: { name: 'map' } },
  { label: 'Chess', route: { name: 'chess' } },
  { label: 'Tutor', route: { name: 'tutor' } },
  { label: 'Sources', route: { name: 'sources' } },
];

export default function App() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  // Shown on the sign-in screen after a deletion, so the learner is not left
  // wondering whether the click worked.
  const [notice, setNotice] = useState('');
  // A connection request arrives as a top-level navigation; it takes precedence
  // over the default route so a learner is never dropped on Today with the
  // consent question unanswered in the address bar.
  const [route, setRoute] = useState<Route>(() => (readConsentParams() ? { name: 'connect' } : { name: 'today' }));

  const mainRef = useRef<HTMLElement>(null);
  /** Skip the focus move on first paint: nothing has been navigated to yet. */
  const navigated = useRef(false);
  const section = SECTION[route.name];

  useEffect(() => {
    // 2.4.2 Page Titled, for a single-page app: the title names the section the
    // learner moved to, and says nothing has changed when they are signed out.
    document.title = signedIn ? `${section} — Tessera` : 'Tessera — adaptive learning';
  }, [section, signedIn]);

  useEffect(() => {
    if (!navigated.current) {
      navigated.current = true;
      return;
    }
    // The nav is a set of buttons in a single document, so swapping the content
    // leaves focus on the button that was pressed and says nothing to a screen
    // reader. Focusing the main region announces the new section instead.
    mainRef.current?.focus();
  }, [route]);

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
    setNotice('');
    setRoute({ name: 'today' });
  };

  const accountDeleted = (message: string) => {
    // The session the delete ran on no longer exists; drop the shell rather than
    // leave a signed-in frame around an account that is gone.
    setSignedIn(false);
    setEmail('');
    setNotice(message);
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
            {parentLink() ? (
              <a
                className="text-xs text-[color:var(--muted)] hover:underline"
                href={parentLink()!.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {parentLink()!.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <p className="text-xs text-[color:var(--muted)]">{parentLabel()}</p>
            )}
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

      <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto max-w-5xl p-4 md:p-6">
        {/* Every screen's visible title is an h2 inside a card; the document
            needs one h1, and this is it. Hidden rather than repeated on screen. */}
        <h1 className="sr-only">{signedIn ? `${section} — Tessera` : 'Sign in — Tessera'}</h1>
        {!signedIn ? (
          <SignInPage
            onSignedIn={() => {
              setNotice('');
              void checkSession();
            }}
            notice={notice}
          />
        ) : (
          <>
            {route.name === 'today' && <TodayPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />}
            {route.name === 'profile' && (
              <>
                <ProfilePage />
                <ConnectedApps />
                <DataControls onDeleted={accountDeleted} />
              </>
            )}
            {route.name === 'connect' && <ConsentPage />}
            {route.name === 'library' && (
              <LibraryPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />
            )}
            {route.name === 'review' && (
              <ReviewPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />
            )}
            {route.name === 'quests' && <QuestsPage />}
            {route.name === 'development' && <DevelopmentPage />}
            {route.name === 'competency' && (
              <CompetencyPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />
            )}
            {route.name === 'knowledge' && <KnowledgePage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />}
            {route.name === 'map' && <MapPage onOpenConcept={(id) => setRoute({ name: 'concept', id })} />}
            {route.name === 'chess' && <ChessPage />}
            {route.name === 'tutor' && <TutorPage />}
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
          here; nothing is inferred from other activity. The tutor section reports whether a model is configured
          instead of implying one is.
        </p>
        <p className="mt-1">Tessera is a Tamuzi Learning product and is operated independently of any other company.</p>
      </footer>
    </div>
  );
}
