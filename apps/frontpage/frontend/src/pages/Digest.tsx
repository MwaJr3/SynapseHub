import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage, plural, relativeTime } from '../lib/format';
import type { Digest, DigestWindow } from '../types';
import { useReadySession } from '../state/session';
import { EmptyState, ErrorNotice, FeedIcon, Segmented, Skeleton } from '../components/common';

const WINDOWS: { value: DigestWindow; label: string }[] = [
  { value: 'since_visit', label: 'Since last visit' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
];

export function DigestPage() {
  const { prefs, updatePrefs } = useReadySession();
  const [window, setWindow] = useState<DigestWindow>(prefs.digest_window);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setDigest(null); setError(null);
    api.digest(window).then((d) => alive && setDigest(d)).catch((e) => alive && setError(errorMessage(e)));
    return () => { alive = false; };
  }, [window, attempt]);

  const choose = (w: DigestWindow) => { setWindow(w); if (w !== prefs.digest_window) void updatePrefs({ digest_window: w }); };

  return (
    <div className="page digest">
      <header className="page-head">
        <h1>Digest</h1>
        <p className="muted">What you missed, ranked. Each pick says why it’s here.</p>
        <Segmented label="Digest window" value={window} options={WINDOWS} onChange={choose} />
      </header>
      {error && <ErrorNotice message={error} onRetry={() => setAttempt((n) => n + 1)} />}
      {!digest && !error && (
        <div aria-busy="true" aria-label="Building your digest">
          {[0, 1, 2].map((i) => <div key={i} className="digest-card"><Skeleton style={{ width: '30%', height: 12 }} /><Skeleton style={{ width: '80%', height: 18, marginTop: 10 }} /><Skeleton style={{ width: '95%', height: 12, marginTop: 10 }} /></div>)}
        </div>
      )}
      {digest && digest.groups.length === 0 && (
        <EmptyState icon={<CircleCheck size={28} />} title="Nothing new to catch up on" actions={<Link className="btn" to="/app">Browse all articles</Link>}>
          <p>You’ve read everything published in this window. Try a longer window to look further back.</p>
        </EmptyState>
      )}
      {digest && digest.groups.length > 0 && (
        <>
          <p className="digest-summary" aria-live="polite">
            <Sparkles size={16} aria-hidden /> {plural(digest.shown, 'pick')} from {plural(digest.sources, 'source')}
            {digest.total_new > digest.shown ? ` · ${plural(digest.total_new, 'unread article')} in this window` : ''}
            {' '}— since {relativeTime(digest.window.start)}.
          </p>
          {digest.groups.map((g) => (
            <section key={g.category} className="digest-group" aria-labelledby={`dg-${g.category}`}>
              <h2 id={`dg-${g.category}`} className="section-title">{g.category}</h2>
              <ul className="digest-list">
                {g.items.map((item) => (
                  <li key={item.id} className="digest-card">
                    <div className="item-meta"><FeedIcon id={item.feed_id} title={item.feed_title} src={item.feed_icon} size={16} /><span className="meta-source">{item.feed_title}</span><span aria-hidden className="meta-dot">·</span><time dateTime={item.published_at ?? undefined}>{relativeTime(item.published_at)}</time></div>
                    <h3 className="item-title"><Link to={`/app?read=${item.id}`}>{item.title}</Link></h3>
                    {item.summary && <p className="item-excerpt">{item.summary}</p>}
                    <p className="digest-reason">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {digest.remaining > 0 && <p className="end-note">{plural(digest.remaining, 'more unread article')} not shown. <Link to="/app/unread">See everything unread</Link>.</p>}
        </>
      )}
    </div>
  );
}
