import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileUp, Rss } from 'lucide-react';
import { LookupBox, PacksGrid } from './Discover';
import { useSession } from '../state/session';

export function Onboarding() {
  const { state } = useSession();
  const name = state.status === 'ready' ? state.user.display_name : '';
  const [showUrl, setShowUrl] = useState(false);
  const urlRef = useRef<HTMLDivElement>(null);
  return (
    <div className="onboarding">
      <div className="onboarding-hero">
        <div className="onboarding-badge" aria-hidden><Rss size={22} /></div>
        <h1>{name ? `Welcome, ${name.split(' ')[0]}.` : 'Welcome.'} Let’s fill your front page.</h1>
        <p>Follow a starter pack and you’ll have real articles in about ten seconds. You can change everything later.</p>
      </div>
      <h2 className="section-title">1 · Pick a starter pack <span className="muted">(fastest)</span></h2>
      <PacksGrid compact />
      <div className="onboarding-alt">
        <div ref={urlRef}>
          <h2 className="section-title">2 · Already know a site?</h2>
          {showUrl ? <LookupBox /> : <button className="btn" onClick={() => setShowUrl(true)}>Paste a URL or search by name</button>}
        </div>
        <div>
          <h2 className="section-title">3 · Coming from another reader?</h2>
          <p className="muted">Bring your subscriptions and categories with an OPML file.</p>
          <Link className="btn" to="/app/feeds#import"><FileUp size={16} aria-hidden /> Import OPML</Link>
        </div>
      </div>
    </div>
  );
}
