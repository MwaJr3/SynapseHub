import { Link } from 'react-router-dom';
import { Bookmark, Compass, Keyboard, LayoutGrid, Rss, Sparkles } from 'lucide-react';
import { Logo } from '../components/Brand';
import { useSession } from '../state/session';
import { GuestButton } from './Auth';

const SAMPLE = [
  { src: 'Cloudflare Blog', title: 'How we reduced P99 latency by 60% with edge-first caching', tag: 'Backend & DevOps', unread: true },
  { src: 'Josh W. Comeau', title: 'The surprising truth about CSS container queries', tag: 'Frontend', unread: true },
  { src: 'Nielsen Norman Group', title: 'A practical guide to designing for colorblind users', tag: 'Design', unread: true },
  { src: 'Simon Willison', title: 'Building effective RAG systems: what actually works in production', tag: 'AI & ML', unread: false },
];

const FEATURES = [
  { icon: <Rss size={20} aria-hidden />, title: 'Every source in one timeline', body: 'Follow any RSS or Atom feed, sort it into your own categories and read it all newest-first.' },
  { icon: <Sparkles size={20} aria-hidden />, title: 'A digest for busy days', body: 'See the few articles worth your time since your last visit, each with the reason it was picked.' },
  { icon: <LayoutGrid size={20} aria-hidden />, title: 'Your layout, per category', body: 'Dense list for news, cards for design. Switch layouts anywhere and keep a different one per category.' },
  { icon: <Keyboard size={20} aria-hidden />, title: 'Fast from the keyboard', body: 'j and k to move, s to save, Ctrl K for everything else. Mouse and touch work just as well.' },
];

export function Landing() {
  const { state } = useSession();
  const signedIn = state.status === 'ready';
  return (
    <div className="landing">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="land-nav">
        <Link to="/" className="brand" aria-label="Frontpage home"><Logo /><span>Frontpage</span></Link>
        <nav aria-label="Account" className="land-nav-links">
          {signedIn ? <Link className="btn btn-primary btn-sm" to="/app">Open Frontpage</Link> : <><Link className="btn btn-ghost btn-sm" to="/sign-in">Sign in</Link><Link className="btn btn-sm" to="/sign-up">Sign up</Link></>}
        </nav>
      </header>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Your personalized front page for tech content.</h1>
            <p className="hero-lede">Follow the blogs, newsletters and changelogs you care about. Frontpage pulls them into one calm place to read, search and catch up.</p>
            <div className="hero-cta">
              {signedIn ? <Link className="btn btn-primary btn-lg" to="/app">Open Frontpage</Link> : <><Link className="btn btn-primary btn-lg" to="/sign-up">Sign up free</Link><GuestButton /></>}
            </div>
            <p className="hero-note muted">Guest mode loads 19 real feeds across five categories. No account needed.</p>
          </div>
          <div className="hero-visual" aria-hidden>
            <div className="mock">
              <div className="mock-side">
                <span className="mock-brand"><Logo size={18} /> Frontpage</span>
                {['All articles', 'Digest', 'Saved'].map((l, i) => <span key={l} className={`mock-nav ${i === 0 ? 'is-on' : ''}`}>{l}</span>)}
                <span className="mock-head">Categories</span>
                {['Frontend', 'Design', 'Backend & DevOps', 'AI & ML'].map((c) => <span key={c} className="mock-nav">{c}</span>)}
              </div>
              <div className="mock-list">
                {SAMPLE.map((s) => (
                  <div key={s.title} className={`mock-item ${s.unread ? '' : 'is-read'}`}>
                    <span className="mock-src"><i className={s.unread ? 'dot' : 'dot is-read'} />{s.src}</span>
                    <strong>{s.title}</strong>
                    <span className="mock-tag">{s.tag}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="features" aria-labelledby="features-title">
          <h2 id="features-title" className="sr-only">What Frontpage does</h2>
          <ul>
            {FEATURES.map((f) => (
              <li key={f.title}><span className="feature-icon">{f.icon}</span><h3>{f.title}</h3><p>{f.body}</p></li>
            ))}
          </ul>
        </section>

        <section className="land-band" aria-labelledby="band-title">
          <div>
            <h2 id="band-title">Start with real articles in about ten seconds.</h2>
            <p>Pick a starter pack, paste a site address, or import an OPML file from your old reader. Your categories come with you.</p>
          </div>
          <ul className="band-points">
            <li><Compass size={18} aria-hidden /> Find feeds by site name or address</li>
            <li><Bookmark size={18} aria-hidden /> Save articles and search them later</li>
          </ul>
        </section>
      </main>
      <footer className="land-foot">
        <span>Frontpage is part of the SynapseHub portfolio. Feed content belongs to its publishers.</span>
      </footer>
    </div>
  );
}
