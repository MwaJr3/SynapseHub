import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Command, Menu, PanelLeft, RefreshCw, Search, TriangleAlert, X } from 'lucide-react';
import { isTypingTarget, dialogOpen, useDebounced } from '../lib/hooks';
import { relativeTime } from '../lib/format';
import { useLibrary } from '../state/library';
import { RefreshProvider, useRefresh } from '../state/refresh';
import { useReadySession } from '../state/session';
import { CommandPalette, ShortcutsDialog } from './CommandPalette';
import { Sidebar } from './Sidebar';

function Topbar({ onMenu, onPalette, onCollapse }: { onMenu: () => void; onPalette: () => void; onCollapse: () => void }) {
  const { library, lastRefresh } = useLibrary();
  const { refreshing, refresh } = useRefresh();
  const navigate = useNavigate();
  const loc = useLocation();
  const [sp] = useSearchParams();
  const inSearch = loc.pathname === '/app/search';
  const [text, setText] = useState(inSearch ? sp.get('q') ?? '' : '');
  const debounced = useDebounced(text, 280);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!inSearch) setText(''); }, [inSearch]);
  useEffect(() => {
    if (!inSearch) return;
    const current = sp.get('q') ?? '';
    if (debounced.trim() !== current.trim() && (debounced.trim().length >= 2 || debounced.trim() === '')) {
      const next = new URLSearchParams(sp); if (debounced.trim()) next.set('q', debounced.trim()); else next.delete('q');
      navigate(`/app/search?${next}`, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === '/' && !e.metaKey && !e.ctrlKey && !isTypingTarget(e.target) && !dialogOpen()) { e.preventDefault(); input.current?.focus(); input.current?.select(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: FormEvent) => { e.preventDefault(); if (text.trim()) navigate(`/app/search?q=${encodeURIComponent(text.trim())}`); };
  const updated = lastRefresh ?? library?.last_updated ?? null;
  const errors = library?.health.error ?? 0;

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open navigation"><Menu size={22} aria-hidden /></button>
      <button className="icon-btn collapse-btn" onClick={onCollapse} aria-label="Toggle sidebar" title="Toggle sidebar"><PanelLeft size={20} aria-hidden /></button>
      <form className="topsearch" role="search" onSubmit={submit}>
        <Search size={16} aria-hidden />
        <input ref={input} type="search" aria-label="Search articles" placeholder="Search articles" value={text} onChange={(e) => setText(e.target.value)} />
        <kbd aria-hidden>/</kbd>
      </form>
      <div className="topbar-right">
        {errors > 0 && <Link className="health-pill" to="/app/feeds" title="Open feed health"><TriangleAlert size={14} aria-hidden /> <span>{errors} {errors === 1 ? 'feed needs' : 'feeds need'} attention</span></Link>}
        <span className="updated" aria-live="polite">{refreshing ? 'Refreshing…' : updated ? `Updated ${relativeTime(updated)}` : ''}</span>
        <button className="btn btn-sm refresh-btn" onClick={() => void refresh()} disabled={refreshing} aria-label="Refresh all feeds" title="Refresh all feeds">
          <RefreshCw size={15} aria-hidden className={refreshing ? 'spin' : ''} /> <span className="refresh-label">Refresh</span>
        </button>
        <button className="icon-btn palette-btn" onClick={onPalette} aria-label="Open command palette" title="Command palette (Ctrl/⌘ K)"><Command size={18} aria-hidden /></button>
      </div>
    </header>
  );
}

function GuestBanner() {
  const { user } = useReadySession();
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem('fp-guest-banner') === '1'; } catch { return false; } });
  if (!user.is_guest || hidden) return null;
  return (
    <div className="guest-banner" role="note">
      <p><strong>You’re exploring as a guest.</strong> Everything works, but this session is temporary. <span className="hide-sm">Create a free account to keep your feeds, read state and layouts across devices, and add your own sources.</span></p>
      <Link className="btn btn-sm btn-primary" to="/sign-up">Create account</Link>
      <button className="icon-btn icon-btn-sm" aria-label="Dismiss guest notice" onClick={() => { setHidden(true); try { sessionStorage.setItem('fp-guest-banner', '1'); } catch { /* ignore */ } }}><X size={16} aria-hidden /></button>
    </div>
  );
}

function ShellInner() {
  const navigate = useNavigate();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [shortcuts, setShortcuts] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('fp-sidebar') === 'collapsed'; } catch { return false; } });
  const gAt = useRef(0);

  const toggleCollapse = useCallback(() => setCollapsed((c) => { const n = !c; try { localStorage.setItem('fp-sidebar', n ? 'collapsed' : 'open'); } catch { /* ignore */ } return n; }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); return; }
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target) || dialogOpen()) return;
      if (e.key === '?') { e.preventDefault(); setShortcuts(true); return; }
      if (gAt.current && Date.now() - gAt.current < 1200) {
        const routes: Record<string, string> = { h: '/app', u: '/app/unread', s: '/app/saved', f: '/app/feeds', d: '/app/digest', c: '/app/discover' };
        const to = routes[e.key];
        gAt.current = 0;
        if (to) { e.preventDefault(); navigate(to); return; }
      }
      if (e.key === 'g') gAt.current = Date.now();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className={`shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <Sidebar open={drawer} onClose={() => setDrawer(false)} collapsed={collapsed} />
      <div className="shell-main">
        <Topbar onMenu={() => setDrawer(true)} onPalette={() => setPalette(true)} onCollapse={toggleCollapse} />
        <GuestBanner />
        <main id="main" className="main" tabIndex={-1}><Outlet /></main>
      </div>
      {palette && <CommandPalette onClose={() => setPalette(false)} onShortcuts={() => setShortcuts(true)} />}
      {shortcuts && <ShortcutsDialog onClose={() => setShortcuts(false)} />}
    </div>
  );
}

export function Shell() {
  return <RefreshProvider><ShellInner /></RefreshProvider>;
}
