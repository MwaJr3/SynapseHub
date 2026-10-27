import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, CheckCheck, CircleCheck, Inbox, PanelRight, RefreshCw, Search as SearchIcon, TriangleAlert } from 'lucide-react';
import { api, type ItemQuery } from '../lib/api';
import { errorMessage, parseDate, plural, relativeTime } from '../lib/format';
import { dialogOpen, isTypingTarget, useItemList, useMedia } from '../lib/hooks';
import { getRecent, pushRecent, clearRecent } from '../lib/recent';
import type { Item, Layout, ReaderPrefs, Scope } from '../types';
import { useLibrary } from '../state/library';
import { useRefresh } from '../state/refresh';
import { useReadySession } from '../state/session';
import { useToast } from '../state/toast';
import { EmptyState, ErrorNotice, ItemSkeletons, Spinner } from './common';
import { ItemRow } from './ItemViews';
import { LayoutMenu } from './LayoutMenu';
import { Onboarding } from './Onboarding';
import { Reader } from './Reader';
import { SearchFilters, type SearchParamsState } from './SearchFilters';

function groupLabel(iso: string | null, now = new Date()): string {
  const d = parseDate(iso);
  if (!d) return 'No date';
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return 'This week';
  if (diff < 31) return 'This month';
  return 'Older';
}

export function Workspace({ scope }: { scope: Scope }) {
  const { prefs, updatePrefs } = useReadySession();
  const { library, applyItemChange, reload: reloadLibrary, feedById, categoryById } = useLibrary();
  const refresher = useRefresh();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();

  const q = sp.get('q') ?? '';
  const filters: SearchParamsState = {
    feed: sp.get('feed') ?? '', cat: sp.get('cat') ?? '', from: sp.get('from') ?? '', to: sp.get('to') ?? '',
    sort: sp.get('sort') ?? (scope.kind === 'saved' ? 'saved' : 'newest'), unread: sp.get('unread') === '1',
  };
  const readId = Number(sp.get('read')) || null;

  const setParams = useCallback((patch: Record<string, string | null>, replace = true) => {
    setSp((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') next.delete(k); else next.set(k, v); }
      return next;
    }, { replace });
  }, [setSp]);

  // ---- query ---------------------------------------------------------------------------------
  const query = useMemo<ItemQuery | null>(() => {
    const base: ItemQuery = {};
    if (filters.unread) base.unread_only = true;
    switch (scope.kind) {
      case 'all': return { ...base, scope: 'all' };
      case 'unread': return { scope: 'unread' };
      case 'saved': return { ...base, scope: 'saved', q: q || undefined, sort: filters.sort === 'newest' ? 'newest' : 'saved' };
      case 'category': return { ...base, category_id: scope.id };
      case 'uncategorized': return { ...base, uncategorized: true };
      case 'feed': return { ...base, feed_id: scope.id };
      case 'search': {
        const any = q.trim() || filters.feed || filters.cat || filters.from || filters.to;
        if (!any) return null;
        return {
          ...base, q: q.trim() || undefined, feed_id: filters.feed ? Number(filters.feed) : undefined,
          category_id: filters.cat ? Number(filters.cat) : undefined, since: filters.from || undefined, until: filters.to || undefined,
          sort: filters.sort === 'oldest' ? 'oldest' : 'newest',
        };
      }
    }
  }, [scope, q, filters.unread, filters.sort, filters.feed, filters.cat, filters.from, filters.to]);
  const key = JSON.stringify(query);
  const list = useItemList(query, key);
  const itemsRef = useRef(list.items);
  itemsRef.current = list.items;

  useEffect(() => { if (scope.kind === 'search' && q.trim().length >= 2 && list.status === 'ready') pushRecent(q); }, [scope.kind, q, list.status]);

  // ---- layout ----------------------------------------------------------------------------------
  const feed = scope.kind === 'feed' ? feedById(scope.id) : undefined;
  const layoutCategoryId = scope.kind === 'category' ? scope.id : feed?.category_id ?? null;
  const layoutCategory = layoutCategoryId !== null ? categoryById(layoutCategoryId) : undefined;
  const override = layoutCategoryId !== null ? prefs.category_layouts[String(layoutCategoryId)] : undefined;
  const layout: Layout = override ?? prefs.layout;
  const wide = useMedia('(min-width: 1100px)');
  const listLayout = layout === 'compact' || layout === 'comfortable';
  const paneMode = prefs.split_reader && wide && listLayout;

  const setLayout = (l: Layout) => {
    if (override && layoutCategoryId !== null) void updatePrefs({ category_layouts: { ...prefs.category_layouts, [String(layoutCategoryId)]: l } });
    else void updatePrefs({ layout: l });
  };
  const togglePerCategory = (on: boolean) => {
    if (layoutCategoryId === null) return;
    const next = { ...prefs.category_layouts };
    if (on) next[String(layoutCategoryId)] = layout; else delete next[String(layoutCategoryId)];
    void updatePrefs({ category_layouts: next });
  };

  // ---- selection + reader ----------------------------------------------------------------------
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [orphan, setOrphan] = useState<Item | null>(null);
  const pendingSelect = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const readerItem = readId !== null ? list.items.find((i) => i.id === readId) ?? (orphan?.id === readId ? orphan : null) : null;
  useEffect(() => {
    if (readId === null || list.items.some((i) => i.id === readId) || orphan?.id === readId) return;
    if (list.status !== 'ready') return;
    api.item(readId).then(setOrphan).catch(() => setParams({ read: null }));
  }, [readId, list.items, list.status, orphan, setParams]);

  const readerIndex = readerItem ? list.items.findIndex((i) => i.id === readerItem.id) : -1;

  const mutate = useCallback(async (item: Item, change: { is_read?: boolean; is_bookmarked?: boolean }) => {
    const current = itemsRef.current.find((i) => i.id === item.id) ?? item;
    const readChanged = change.is_read !== undefined && change.is_read !== current.is_read;
    const saveChanged = change.is_bookmarked !== undefined && change.is_bookmarked !== current.is_bookmarked;
    if (!readChanged && !saveChanged) return;
    const apply = (c: typeof change, undo = false) => {
      list.patch(item.id, { ...c, ...(c.is_bookmarked !== undefined ? { bookmarked_at: c.is_bookmarked ? new Date().toISOString() : null } : {}) });
      applyItemChange(item, { read: readChanged ? (undo ? !c.is_read : c.is_read) : undefined, bookmarked: saveChanged ? (undo ? !c.is_bookmarked : c.is_bookmarked) : undefined });
    };
    apply(change);
    try {
      await api.patchItem(item.id, change);
    } catch (err) {
      list.patch(item.id, { is_read: current.is_read, is_bookmarked: current.is_bookmarked });
      applyItemChange(item, { read: readChanged ? current.is_read : undefined, bookmarked: saveChanged ? current.is_bookmarked : undefined });
      toast.show(errorMessage(err), { tone: 'error' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyItemChange, list.patch, toast]);

  const openOriginal = useCallback((item: Item) => {
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    void mutate(item, { is_read: true });
  }, [mutate]);

  const select = useCallback((item: Item, opts: { open?: boolean } = {}) => {
    setSelectedId(item.id);
    const readerOpen = readId !== null;
    if (opts.open || readerOpen) {
      setParams({ read: String(item.id) }, readerOpen);
      void mutate(item, { is_read: true });
    }
  }, [readId, setParams, mutate]);

  const activate = useCallback((item: Item) => {
    // Full article available → in-app reader. Excerpt-only → straight to the original site (new tab),
    // unless the reader is already open, in which case we keep reading in place.
    if (item.has_full_content || readId !== null || !item.url) { select(item, { open: true }); return; }
    setSelectedId(item.id);
    openOriginal(item);
  }, [readId, select, openOriginal]);

  const toggleSave = useCallback((item: Item) => {
    const cur = itemsRef.current.find((i) => i.id === item.id) ?? item;
    const next = !cur.is_bookmarked;
    void mutate(cur, { is_bookmarked: next });
    if (!next && scope.kind === 'saved') {
      window.setTimeout(() => list.remove(cur.id), 180);
      toast.show('Removed from saved', { action: { label: 'Undo', run: () => { list.insert({ ...cur, is_bookmarked: false }); void mutate({ ...cur, is_bookmarked: false }, { is_bookmarked: true }); } } });
    } else if (next) toast.show('Saved for later', { ms: 2200 });
  }, [mutate, scope.kind, list, toast]);
  const toggleRead = useCallback((item: Item) => {
    const cur = itemsRef.current.find((i) => i.id === item.id) ?? item;
    void mutate(cur, { is_read: !cur.is_read });
  }, [mutate]);

  const closeReader = useCallback(() => {
    setParams({ read: null }, true);
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`)?.focus({ preventScroll: true }));
  }, [setParams, selectedId]);

  // keep the selected row in view; follow with focus for keyboard + screen-reader users
  const focusNext = useRef(false);
  useEffect(() => {
    if (selectedId === null) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-item-id="${selectedId}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'nearest', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (focusNext.current) { el.focus({ preventScroll: true }); focusNext.current = false; }
  }, [selectedId, list.items.length]);

  const move = useCallback((delta: 1 | -1) => {
    const items = itemsRef.current;
    if (!items.length) return;
    const from = selectedId !== null ? items.findIndex((i) => i.id === selectedId) : -1;
    const to = Math.min(Math.max(from + delta, 0), items.length - 1);
    if (from === items.length - 1 && delta === 1) {
      if (list.hasMore) { pendingSelect.current = items.length; list.loadMore(); }
      return;
    }
    const target = items[to];
    if (!target) return;
    focusNext.current = true;
    select(target);
  }, [selectedId, select, list]);

  useEffect(() => {
    if (pendingSelect.current !== null && list.items[pendingSelect.current]) {
      const target = list.items[pendingSelect.current];
      pendingSelect.current = null;
      if (target) { focusNext.current = true; select(target); }
    }
  }, [list.items, select]);

  // ---- keyboard ----------------------------------------------------------------------------------
  const kb = useRef({ move, activate, toggleSave, toggleRead, openOriginal, closeReader, selectedId, readId });
  kb.current = { move, activate, toggleSave, toggleRead, openOriginal, closeReader, selectedId, readId };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target) || dialogOpen()) return;
      const { move, activate, toggleSave, toggleRead, openOriginal, closeReader, selectedId, readId } = kb.current;
      const sel = itemsRef.current.find((i) => i.id === selectedId);
      switch (e.key) {
        case 'j': case 'ArrowDown': if (e.key === 'ArrowDown' && readId === null) return; e.preventDefault(); move(1); break;
        case 'k': case 'ArrowUp': if (e.key === 'ArrowUp' && readId === null) return; e.preventDefault(); move(-1); break;
        case 'o': if (sel) { e.preventDefault(); activate(sel); } break;
        case 's': if (sel) { e.preventDefault(); toggleSave(sel); } break;
        case 'm': if (sel) { e.preventDefault(); toggleRead(sel); } break;
        case 'v': if (sel) { e.preventDefault(); openOriginal(sel); } break;
        case 'Escape': if (readId !== null) { e.preventDefault(); closeReader(); } break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---- infinite scroll -----------------------------------------------------------------------------
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !list.hasMore || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) list.loadMore(); }, { rootMargin: '700px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [list.hasMore, list.loadMore, list.items.length]);

  // ---- new article banner ----------------------------------------------------------------------------
  const [newCount, setNewCount] = useState(0);
  const watchNew = scope.kind === 'all' || scope.kind === 'unread';
  useEffect(() => { setNewCount(0); }, [list.loadedAt]);
  useEffect(() => {
    if (!watchNew || list.status !== 'ready') return;
    const check = () => { if (document.visibilityState === 'visible') api.newCount(list.loadedAt).then((r) => setNewCount(r.count)).catch(() => {}); };
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [watchNew, list.status, list.loadedAt]);
  useEffect(() => {
    if (!watchNew || list.status !== 'ready' || refresher.tick === 0) return;
    api.newCount(list.loadedAt).then((r) => setNewCount(r.count)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresher.tick]);

  // ---- mark all read (inline confirm, no modal) -----------------------------------------------------------
  const [confirming, setConfirming] = useState(false);
  const [marking, setMarking] = useState(false);
  useEffect(() => { if (!confirming) return; const t = window.setTimeout(() => setConfirming(false), 6000); return () => window.clearTimeout(t); }, [confirming]);
  useEffect(() => setConfirming(false), [scope.kind, (scope as { id?: number }).id]);

  const unreadInScope = !library ? 0
    : scope.kind === 'all' || scope.kind === 'unread' ? library.totals.unread
    : scope.kind === 'category' ? categoryById(scope.id)?.unread ?? 0
    : scope.kind === 'uncategorized' ? library.uncategorized.unread
    : scope.kind === 'feed' ? feed?.unread ?? 0 : 0;
  const canMarkAll = ['all', 'unread', 'category', 'uncategorized', 'feed'].includes(scope.kind) && unreadInScope > 0;

  const markAll = async () => {
    setMarking(true);
    try {
      await api.markRead(
        scope.kind === 'category' ? { scope: 'category', category_id: scope.id }
        : scope.kind === 'feed' ? { scope: 'feed', feed_id: scope.id }
        : scope.kind === 'uncategorized' ? { scope: 'uncategorized' } : { scope: 'all' });
      list.markAllLocal(true);
      await reloadLibrary();
      toast.show(`Marked ${plural(unreadInScope, 'article')} as read`, { tone: 'success' });
    } catch (err) { toast.show(errorMessage(err), { tone: 'error' }); }
    finally { setMarking(false); setConfirming(false); }
  };

  const retryFeed = async () => {
    if (!feed) return;
    try {
      const res = await api.refreshFeed(feed.id);
      toast.show(res.error ? `Still failing: ${res.error}` : res.new_items ? `${plural(res.new_items, 'new article')} from ${feed.title}` : `${feed.title} is up to date`, { tone: res.error ? 'error' : 'success' });
      await reloadLibrary();
      list.reload();
    } catch (err) { toast.show(errorMessage(err), { tone: 'error' }); }
  };

  // ---- header ----------------------------------------------------------------------------------------
  const title = scope.kind === 'all' ? 'All articles' : scope.kind === 'unread' ? 'Unread' : scope.kind === 'saved' ? 'Saved'
    : scope.kind === 'category' ? categoryById(scope.id)?.name ?? 'Category' : scope.kind === 'uncategorized' ? 'Uncategorized'
    : scope.kind === 'feed' ? feed?.title ?? 'Feed' : 'Search';

  const noFeeds = library !== null && library.totals.feeds === 0 && scope.kind !== 'search';
  const readerOpen = readerItem !== null;
  const showReaderPane = paneMode && readerOpen;
  const showSheet = !paneMode && readerOpen;
  const effectiveLayout: Layout = showReaderPane ? (layout === 'compact' ? 'compact' : 'comfortable') : layout;
  const searchTerm = scope.kind === 'search' || scope.kind === 'saved' ? q : '';

  const rows: React.ReactNode[] = [];
  let lastGroup = '';
  const grouped = listLayout && !(scope.kind === 'saved' && filters.sort === 'saved');
  list.items.forEach((item, idx) => {
    if (grouped) {
      const g = groupLabel(item.published_at);
      if (g !== lastGroup) { lastGroup = g; rows.push(<h2 key={`g-${g}-${idx}`} className="group-label">{g}</h2>); }
    }
    rows.push(
      <ItemRow key={item.id} item={item} layout={effectiveLayout} selected={selectedId === item.id || (selectedId === null && idx === 0)} active={readId === item.id}
        hero={effectiveLayout === 'magazine' && idx === 0} query={searchTerm} onOpen={activate} onToggleSave={toggleSave} onToggleRead={toggleRead} onOriginal={openOriginal} />,
    );
  });

  const setReaderPrefs = (reader: ReaderPrefs) => void updatePrefs({ reader });

  return (
    <div className={`workspace ${showReaderPane ? 'has-pane' : ''}`}>
      <div className="list-col" {...(showSheet ? { inert: true } : {})}>
        <div className="list-inner">
          <header className="view-head">
            <div className="view-title">
              <h1>{title}</h1>
              {list.status === 'ready' && !noFeeds && <p className="muted" aria-live="polite">{scope.kind === 'search' && !query ? '' : `${list.total.toLocaleString()} ${list.total === 1 ? 'article' : 'articles'}${filters.unread ? ' unread' : ''}`}{scope.kind === 'feed' && feed?.last_success_at ? ` · updated ${relativeTime(feed.last_success_at)}` : ''}</p>}
            </div>
            <div className="view-tools">
              {scope.kind === 'feed' && feed && <button className="btn btn-sm" onClick={retryFeed}><RefreshCw size={14} aria-hidden /> Refresh feed</button>}
              {scope.kind === 'category' && <button className="btn btn-sm" disabled={refresher.refreshing} onClick={() => void refresher.refresh({ categoryId: scope.id })}>{refresher.refreshing ? <Spinner /> : <RefreshCw size={14} aria-hidden />} Refresh category</button>}
              {canMarkAll && (confirming ? (
                <span className="confirm-inline" role="group" aria-label="Confirm mark all as read">
                  <span>Mark {plural(unreadInScope, 'article')} read?</span>
                  <button className="btn btn-sm btn-primary" onClick={markAll} disabled={marking} data-autofocus>{marking ? <Spinner /> : 'Yes, mark read'}</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
                </span>
              ) : <button className="btn btn-sm" onClick={() => setConfirming(true)}><CheckCheck size={14} aria-hidden /> Mark all read</button>)}
              {wide && listLayout && (
                <button className="icon-btn" aria-pressed={prefs.split_reader} aria-label="Reader pane" title={`Reader pane: ${prefs.split_reader ? 'on' : 'off'}`} onClick={() => void updatePrefs({ split_reader: !prefs.split_reader })}><PanelRight size={18} aria-hidden /></button>
              )}
              <LayoutMenu value={layout} onChange={setLayout} categoryName={layoutCategory?.name ?? (feed ? categoryById(feed.category_id ?? -1)?.name : undefined)} perCategory={override !== undefined} onTogglePerCategory={togglePerCategory} />
            </div>
          </header>

          {scope.kind === 'feed' && feed?.status === 'error' && (
            <div className="notice notice-error" role="alert">
              <TriangleAlert size={18} aria-hidden />
              <div>
                <strong>{feed.error_kind === 'permanent' ? 'This feed looks gone.' : 'We couldn’t fetch this feed just now.'}</strong>
                <p>{feed.error}{feed.last_success_at ? ` Last updated ${relativeTime(feed.last_success_at)}.` : ''} {feed.error_kind === 'permanent' ? 'You may want to remove it or look for its new address.' : 'We’ll keep retrying with increasing delays.'}</p>
              </div>
              <button className="btn btn-sm" onClick={retryFeed}>Retry now</button>
            </div>
          )}
          {scope.kind === 'feed' && feed?.status === 'stale' && <div className="notice"><span>No new posts from this source in over 30 days. It may just publish rarely.</span></div>}

          {scope.kind === 'saved' && (
            <div className="saved-tools">
              <div className="input-icon"><SearchIcon size={16} aria-hidden /><input className="input input-sm" type="search" aria-label="Search saved articles" placeholder="Search saved articles" value={q} onChange={(e) => setParams({ q: e.target.value || null })} /></div>
              <label className="filter inline"><span>Sort</span>
                <select className="select select-sm" value={filters.sort} onChange={(e) => setParams({ sort: e.target.value })}>
                  <option value="saved">Date saved</option><option value="newest">Date published</option>
                </select>
              </label>
            </div>
          )}
          {scope.kind === 'search' && <SearchFilters library={library} value={filters} onChange={(patch) => setParams({ feed: patch.feed ?? filters.feed, cat: patch.cat ?? filters.cat, from: patch.from ?? filters.from, to: patch.to ?? filters.to, sort: patch.sort ?? filters.sort, unread: (patch.unread ?? filters.unread) ? '1' : null })} />}
          {['category', 'feed', 'all'].includes(scope.kind) && !noFeeds && (
            <label className="check check-sm unread-toggle"><input type="checkbox" checked={filters.unread} onChange={(e) => setParams({ unread: e.target.checked ? '1' : null })} /><span>Unread only</span></label>
          )}

          {newCount > 0 && (
            <button className="banner" onClick={() => { list.reload(); setNewCount(0); window.scrollTo({ top: 0 }); }}>
              <RefreshCw size={14} aria-hidden /> {plural(newCount, 'new article')} — show
            </button>
          )}

          {noFeeds ? <Onboarding /> : (
            <div className="list-body" ref={listRef}>
              {list.status === 'loading' && <ItemSkeletons layout={effectiveLayout} />}
              {list.status === 'error' && <ErrorNotice message={list.error ?? 'Something went wrong.'} onRetry={list.reload} />}
              {list.status === 'idle' && scope.kind === 'search' && <SearchIdle />}
              {list.status === 'ready' && list.items.length === 0 && <NothingHere scope={scope} q={q} hasFilters={Boolean(filters.unread || filters.feed || filters.cat || filters.from || filters.to)} />}
              {list.items.length > 0 && list.status !== 'loading' && (
                <div className={`items items-${effectiveLayout} ${effectiveLayout === 'compact' || effectiveLayout === 'comfortable' ? 'items-list' : ''}`} aria-label="Articles">{rows}</div>
              )}
              {list.hasMore && <div ref={sentinel} className="sentinel">{list.loadingMore && <Spinner label="Loading more articles" />}</div>}
              {list.status === 'ready' && !list.hasMore && list.items.length > 20 && <p className="end-note">That’s everything — {plural(list.items.length, 'article')}.</p>}
            </div>
          )}
        </div>
      </div>

      {(showReaderPane || showSheet) && readerItem && (
        <>
          {showSheet && <div className="sheet-backdrop" onClick={closeReader} aria-hidden />}
          <div className={showSheet ? 'sheet' : 'pane'}>
            <Reader
              item={readerItem} prefs={prefs.reader} mode={showSheet ? 'overlay' : 'pane'}
              hasPrev={readerIndex > 0} hasNext={readerIndex >= 0 && (readerIndex < list.items.length - 1 || list.hasMore)}
              position={readerIndex >= 0 ? `${readerIndex + 1} of ${list.total.toLocaleString()}` : undefined}
              onPrev={() => move(-1)} onNext={() => move(1)} onClose={closeReader}
              onToggleSave={toggleSave} onToggleRead={toggleRead} onOriginal={(i) => void mutate(i, { is_read: true })} onPrefs={setReaderPrefs}
            />
          </div>
        </>
      )}
    </div>
  );
}

function SearchIdle() {
  const [recent, setRecent] = useState(getRecent());
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden><SearchIcon size={28} /></div>
      <h2>Search every feed you follow</h2>
      <p className="empty-body">Type in the search bar above. Press <kbd>/</kbd> from anywhere to jump there.</p>
      {recent.length > 0 && (
        <div className="recent">
          <p className="muted">Recent searches <button className="link-btn" onClick={() => { clearRecent(); setRecent([]); }}>Clear</button></p>
          <ul>{recent.map((r) => <li key={r}><Link className="chip chip-link" to={`/app/search?q=${encodeURIComponent(r)}`}>{r}</Link></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function NothingHere({ scope, q, hasFilters }: { scope: Scope; q: string; hasFilters: boolean }) {
  if (scope.kind === 'search') return (
    <EmptyState icon={<SearchIcon size={28} />} title={q ? `No results for “${q}”` : 'No results'}>
      <ul className="tips"><li>Check the spelling or try fewer words.</li><li>Search matches titles, excerpts and authors.</li>{hasFilters && <li>Try clearing the filters above.</li>}</ul>
    </EmptyState>
  );
  if (scope.kind === 'saved') return <EmptyState icon={<Bookmark size={28} />} title={q ? 'No saved articles match' : 'Nothing saved yet'}>{q ? <p>Try a different search.</p> : <p>Press <kbd>s</kbd> on any article, or use the bookmark button, to keep it here for later.</p>}</EmptyState>;
  if (scope.kind === 'unread' || hasFilters) return <EmptyState icon={<CircleCheck size={28} />} title={hasFilters ? 'No unread articles here' : 'You’re all caught up'} actions={<Link className="btn" to="/app/digest">See the digest</Link>}><p>{hasFilters ? 'Everything in this view has been read.' : 'Nothing unread across your feeds. Nice.'}</p></EmptyState>;
  return <EmptyState icon={<Inbox size={28} />} title="No articles yet"><p>Articles show up as soon as this source publishes. Use <strong>Refresh</strong> in the top bar to check now.</p></EmptyState>;
}
