import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bookmark, ChevronRight, Compass, Folder, Inbox, Library as LibraryIcon, LogOut, Newspaper, Settings, Sparkles, TriangleAlert, X } from 'lucide-react';
import { useLibrary } from '../state/library';
import { useReadySession } from '../state/session';
import { Logo } from './Brand';
import { Count, FeedIcon } from './common';

export function Sidebar({ open, onClose, collapsed }: { open: boolean; onClose: () => void; collapsed: boolean }) {
  const { library, loading } = useLibrary();
  const { user, signOut } = useReadySession();
  const loc = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<number | 'none'>>(new Set());

  // open the category that contains the feed being viewed
  useEffect(() => {
    const m = /\/app\/feed\/(\d+)/.exec(loc.pathname);
    if (!m || !library) return;
    const f = library.feeds.find((x) => x.id === Number(m[1]));
    if (f) setExpanded((s) => new Set(s).add(f.category_id ?? 'none'));
  }, [loc.pathname, library]);

  useEffect(() => { onClose(); }, [loc.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number | 'none') => setExpanded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const feedsIn = (cat: number | null) => library?.feeds.filter((f) => f.category_id === cat) ?? [];
  const link = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? 'is-active' : ''}`;

  const renderFeeds = (cat: number | null, key: number | 'none') => expanded.has(key) && (
    <ul className="nav-feeds">
      {feedsIn(cat).map((f) => (
        <li key={f.id}>
          <NavLink to={`/app/feed/${f.id}`} className={link}>
            <FeedIcon id={f.id} title={f.title} src={f.icon_url} size={16} />
            <span className="nav-label">{f.title}</span>
            {f.status === 'error' && <TriangleAlert size={13} className="nav-warn" aria-label="Feed error" />}
            <Count n={f.unread} label={`${f.unread} unread in ${f.title}`} />
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {open && <div className="drawer-backdrop" onClick={onClose} aria-hidden />}
      <aside className={`sidebar ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`} aria-label="Sidebar">
        <div className="sidebar-head">
          <NavLink to="/app" className="brand" aria-label="Frontpage home"><Logo /><span>Frontpage</span></NavLink>
          <button className="icon-btn drawer-close" onClick={onClose} aria-label="Close navigation"><X size={20} aria-hidden /></button>
        </div>
        <nav className="sidebar-scroll" aria-label="Primary">
          <ul className="nav-list">
            <li><NavLink to="/app/digest" className={link}><Sparkles size={18} aria-hidden /><span className="nav-label">Digest</span></NavLink></li>
            <li><NavLink to="/app" end className={link}><Newspaper size={18} aria-hidden /><span className="nav-label">All articles</span><Count n={library?.totals.unread ?? 0} label={`${library?.totals.unread ?? 0} unread`} /></NavLink></li>
            <li><NavLink to="/app/unread" className={link}><Inbox size={18} aria-hidden /><span className="nav-label">Unread</span></NavLink></li>
            <li><NavLink to="/app/saved" className={link}><Bookmark size={18} aria-hidden /><span className="nav-label">Saved</span>{(library?.totals.saved ?? 0) > 0 && <span className="count count-quiet" aria-label={`${library?.totals.saved} saved`}>{library?.totals.saved}</span>}</NavLink></li>
            <li><NavLink to="/app/discover" className={link}><Compass size={18} aria-hidden /><span className="nav-label">Discover</span></NavLink></li>
          </ul>

          <h2 className="nav-heading">Categories</h2>
          {loading && !library && <div className="nav-skeleton" aria-busy="true">{[70, 55, 80, 60].map((w, i) => <span key={i} className="skeleton" style={{ width: `${w}%`, height: 14 }} />)}</div>}
          <ul className="nav-list">
            {library?.categories.map((c) => (
              <li key={c.id}>
                <div className="nav-row">
                  <button className={`twisty ${expanded.has(c.id) ? 'is-open' : ''}`} aria-expanded={expanded.has(c.id)} aria-label={`${expanded.has(c.id) ? 'Collapse' : 'Expand'} ${c.name} feeds`} onClick={() => toggle(c.id)}><ChevronRight size={14} aria-hidden /></button>
                  <NavLink to={`/app/category/${c.id}`} className={link}><Folder size={16} aria-hidden /><span className="nav-label">{c.name}</span><Count n={c.unread} label={`${c.unread} unread in ${c.name}`} /></NavLink>
                </div>
                {renderFeeds(c.id, c.id)}
              </li>
            ))}
            {library && library.uncategorized.feed_count > 0 && (
              <li>
                <div className="nav-row">
                  <button className={`twisty ${expanded.has('none') ? 'is-open' : ''}`} aria-expanded={expanded.has('none')} aria-label={`${expanded.has('none') ? 'Collapse' : 'Expand'} uncategorized feeds`} onClick={() => toggle('none')}><ChevronRight size={14} aria-hidden /></button>
                  <NavLink to="/app/uncategorized" className={link}><Folder size={16} aria-hidden /><span className="nav-label">Uncategorized</span><Count n={library.uncategorized.unread} /></NavLink>
                </div>
                {renderFeeds(null, 'none')}
              </li>
            )}
          </ul>
          {library && library.categories.length === 0 && library.uncategorized.feed_count === 0 && <p className="nav-empty">No feeds yet. <NavLink to="/app/discover">Find some</NavLink>.</p>}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/app/feeds" className={link}><LibraryIcon size={18} aria-hidden /><span className="nav-label">Manage feeds</span>{(library?.health.error ?? 0) > 0 && <span className="count count-error" aria-label={`${library?.health.error} feeds with errors`}>{library?.health.error}</span>}</NavLink>
          <NavLink to="/app/settings" className={link}><Settings size={18} aria-hidden /><span className="nav-label">Settings</span></NavLink>
          <div className="account">
            <span className="avatar" aria-hidden>{(user.display_name[0] ?? '?').toUpperCase()}</span>
            <span className="account-text"><strong>{user.display_name}</strong><small>{user.is_guest ? 'Guest session' : user.email}</small></span>
            <button className="icon-btn" aria-label="Sign out" title="Sign out" onClick={async () => { await signOut(); navigate('/', { replace: true }); }}><LogOut size={18} aria-hidden /></button>
          </div>
        </div>
      </aside>
    </>
  );
}
