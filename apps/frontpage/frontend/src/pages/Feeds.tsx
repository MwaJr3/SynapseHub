import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowDown, ArrowUp, CircleCheck, Clock, Download, FileUp, Pencil, Plus, RefreshCw, Trash2, TriangleAlert, Upload } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage, plural, relativeTime } from '../lib/format';
import type { Feed, FeedPreview, OpmlPreview, OpmlResult } from '../types';
import { useLibrary } from '../state/library';
import { useToast } from '../state/toast';
import { ErrorNotice, FeedIcon, Spinner } from '../components/common';

const NEW_CATEGORY = '__new__';

export function statusInfo(feed: Pick<Feed, 'status' | 'error_kind' | 'last_success_at' | 'error'>) {
  const ago = feed.last_success_at ? relativeTime(feed.last_success_at) : 'never';
  if (feed.status === 'error') {
    const gone = feed.error_kind === 'permanent';
    return { label: gone ? 'Gone' : 'Error', tone: 'error', Icon: TriangleAlert, detail: `${feed.error ?? 'Last fetch failed.'} Last success: ${ago}.` };
  }
  if (feed.status === 'stale') return { label: 'Stale', tone: 'warning', Icon: Clock, detail: `No new posts in over 30 days. Last fetched ${ago}.` };
  return { label: 'Healthy', tone: 'success', Icon: CircleCheck, detail: `Last fetched ${ago}.` };
}

// ------------------------------------------------------------------------------------------------
function HealthSummary() {
  const { library } = useLibrary();
  if (!library) return null;
  const { active, stale, error } = library.health;
  return (
    <ul className="health-grid" aria-label="Feed health summary">
      <li className="is-success"><CircleCheck size={18} aria-hidden /><strong>{active}</strong><span>healthy</span></li>
      <li className="is-warning"><Clock size={18} aria-hidden /><strong>{stale}</strong><span>stale</span></li>
      <li className="is-error"><TriangleAlert size={18} aria-hidden /><strong>{error}</strong><span>{error === 1 ? 'needs attention' : 'need attention'}</span></li>
    </ul>
  );
}

function AddFeed() {
  const { library, reload } = useLibrary();
  const toast = useToast();
  const urlId = useId();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<FeedPreview | null>(null);
  const [category, setCategory] = useState('');
  const [newName, setNewName] = useState('');
  const [title, setTitle] = useState('');

  const check = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setPreview(null);
    try { const p = await api.previewFeed(url.trim()); setPreview(p); setTitle(''); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const add = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const cat = library?.categories.find((c) => String(c.id) === category);
      await api.addFeed({ url: preview.url, category_id: cat?.id ?? null, category_name: category === NEW_CATEGORY ? newName.trim() || null : null, custom_title: title.trim() || null });
      toast.show(`Following ${title.trim() || preview.title}`, { tone: 'success' });
      setUrl(''); setPreview(null); setCategory(''); setNewName('');
      await reload();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="add-title" className="panel">
      <h2 id="add-title" className="section-title">Add a feed</h2>
      <form onSubmit={check} className="lookup-form">
        <label htmlFor={urlId} className="sr-only">Feed URL</label>
        <input id={urlId} className="input" type="url" inputMode="url" required placeholder="https://example.com/feed.xml" value={url} onChange={(e) => setUrl(e.target.value)} aria-describedby={error ? `${urlId}-err` : undefined} />
        <button className="btn btn-primary" disabled={busy || !url.trim()}>{busy && !preview ? <><Spinner /> Checking…</> : 'Check feed'}</button>
      </form>
      {error && <p id={`${urlId}-err`} className="field-error" role="alert">{error}</p>}
      {preview && (
        <div className="preview">
          <div className="preview-head">
            <FeedIcon id={0} title={preview.title} src={preview.icon_url} size={28} />
            <div><strong>{preview.title}</strong><p className="muted">{preview.description || 'No description provided.'}</p>
              <p className="muted">{preview.format?.toUpperCase() ?? 'Feed'} · {plural(preview.item_count, 'article')} found</p></div>
          </div>
          {preview.warnings.length > 0 && <ul className="preview-warn">{preview.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
          {preview.sample.length > 0 && <ul className="preview-sample">{preview.sample.slice(0, 3).map((s) => <li key={s.title}>{s.title}</li>)}</ul>}
          {preview.duplicate ? (
            <div className="notice">You already follow this feed as “{preview.duplicate.title}”.</div>
          ) : (
            <div className="preview-form">
              <label className="field-inline">Title (optional)<input className="input input-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={preview.title} /></label>
              <label className="field-inline">Category
                <select className="select select-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Uncategorized</option>
                  {library?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={NEW_CATEGORY}>New category…</option>
                </select>
              </label>
              {category === NEW_CATEGORY && <label className="field-inline">New category name<input className="input input-sm" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} /></label>}
              <button className="btn btn-primary" onClick={add} disabled={busy || (category === NEW_CATEGORY && !newName.trim())}>{busy ? <><Spinner /> Adding…</> : <><Plus size={16} aria-hidden /> Follow feed</>}</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
function FeedRow({ feed }: { feed: Feed }) {
  const { library, reload } = useLibrary();
  const toast = useToast();
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [title, setTitle] = useState(feed.custom_title ?? '');
  const [category, setCategory] = useState(feed.category_id === null ? '' : String(feed.category_id));
  const [busy, setBusy] = useState(false);
  const info = statusInfo(feed);
  const Icon = info.Icon;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (err) { toast.show(errorMessage(err), { tone: 'error' }); } finally { setBusy(false); }
  };
  const save = () => run(async () => {
    await api.patchFeed(feed.id, { custom_title: title.trim() || null, category_id: category ? Number(category) : null, clear_category: !category });
    await reload(); setMode('view'); toast.show('Feed updated', { tone: 'success' });
  });
  const retry = () => run(async () => {
    const res = await api.refreshFeed(feed.id);
    await reload();
    toast.show(res.error ? `Still failing: ${res.error}` : res.new_items ? `${plural(res.new_items, 'new article')} from ${feed.title}` : `${feed.title} is up to date`, { tone: res.error ? 'error' : 'success' });
  });
  const remove = () => run(async () => {
    const res = await api.deleteFeed(feed.id);
    await reload(); toast.show(`Removed ${feed.title} and ${plural(res.items_removed, 'article')}`, { tone: 'info' });
  });

  return (
    <li className="feed-row">
      <div className="feed-main">
        <FeedIcon id={feed.id} title={feed.title} src={feed.icon_url} size={22} />
        <div className="feed-text">
          <strong>{feed.title}</strong>
          <span className="muted feed-url">{feed.url}</span>
          <span className={`status status-${info.tone}`} aria-label={`Feed status: ${info.label.toLowerCase()}. ${info.detail}`}><Icon size={14} aria-hidden /> {info.label}<span className="status-detail"> · {info.detail}</span></span>
        </div>
        <div className="feed-actions">
          <button className="icon-btn icon-btn-sm" onClick={retry} disabled={busy} aria-label={`Refresh ${feed.title}`} title="Refresh now">{busy && mode === 'view' ? <Spinner /> : <RefreshCw size={16} aria-hidden />}</button>
          <button className="icon-btn icon-btn-sm" onClick={() => setMode(mode === 'edit' ? 'view' : 'edit')} aria-expanded={mode === 'edit'} aria-label={`Edit ${feed.title}`} title="Edit"><Pencil size={16} aria-hidden /></button>
          <button className="icon-btn icon-btn-sm" onClick={() => setMode('delete')} aria-label={`Remove ${feed.title}`} title="Remove"><Trash2 size={16} aria-hidden /></button>
        </div>
      </div>
      {mode === 'edit' && (
        <div className="feed-edit">
          <label className="field-inline">Title<input className="input input-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={feed.original_title ?? feed.title} /></label>
          <label className="field-inline">Category
            <select className="select select-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Uncategorized</option>
              {library?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn btn-sm btn-primary" onClick={save} disabled={busy}>Save</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setMode('view')}>Cancel</button>
        </div>
      )}
      {mode === 'delete' && (
        <div className="feed-edit confirm-inline" role="group" aria-label={`Confirm removing ${feed.title}`}>
          <span>Remove this feed and its {plural(feed.total, 'article')}? Saved articles from it are removed too.</span>
          <button className="btn btn-sm btn-danger" onClick={remove} disabled={busy} data-autofocus>{busy ? <Spinner /> : 'Remove feed'}</button>
          <button className="btn btn-sm btn-ghost" onClick={() => setMode('view')}>Cancel</button>
        </div>
      )}
    </li>
  );
}

function FeedList() {
  const { library, loading, error, reload } = useLibrary();
  const [filter, setFilter] = useState<'all' | 'error' | 'stale'>('all');
  if (error && !library) return <ErrorNotice message={error} onRetry={() => void reload()} />;
  if (loading && !library) return <div className="panel" aria-busy="true"><Spinner label="Loading feeds" /></div>;
  const feeds = (library?.feeds ?? []).filter((f) => filter === 'all' || f.status === filter).sort((a, b) => a.title.localeCompare(b.title));
  return (
    <section aria-labelledby="feeds-title" className="panel">
      <div className="panel-head">
        <h2 id="feeds-title" className="section-title">Your feeds ({library?.totals.feeds ?? 0})</h2>
        <div className="seg-links" role="group" aria-label="Filter feeds by status">
          {(['all', 'error', 'stale'] as const).map((f) => <button key={f} className={`chip chip-link ${filter === f ? 'is-active' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f === 'error' ? 'Errors' : 'Stale'}</button>)}
        </div>
      </div>
      {feeds.length === 0 ? <p className="muted">{filter === 'all' ? 'You’re not following any feeds yet. Add one above or visit Discover.' : 'No feeds with this status. Nice.'}</p> : <ul className="feed-list">{feeds.map((f) => <FeedRow key={f.id} feed={f} />)}</ul>}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
function Categories() {
  const { library, reload } = useLibrary();
  const toast = useToast();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const [busy, setBusy] = useState(false);
  if (!library) return null;
  const cats = library.categories;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); await reload(); } catch (err) { toast.show(errorMessage(err), { tone: 'error' }); } finally { setBusy(false); }
  };
  const move = (index: number, delta: -1 | 1) => {
    const ids = cats.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    if (moved === undefined) return;
    ids.splice(index + delta, 0, moved);
    void run(async () => { await api.reorderCategories(ids); });
  };

  return (
    <section aria-labelledby="cat-title" className="panel">
      <h2 id="cat-title" className="section-title">Categories</h2>
      <form className="lookup-form" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n) return; void run(async () => { await api.createCategory(n); setName(''); toast.show(`Created ${n}`, { tone: 'success' }); }); }}>
        <label htmlFor="new-cat" className="sr-only">New category name</label>
        <input id="new-cat" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category, for example Newsletters" maxLength={80} />
        <button className="btn" disabled={busy || !name.trim()}><Plus size={16} aria-hidden /> Add category</button>
      </form>
      {cats.length === 0 ? <p className="muted">No categories yet. Feeds without one live under Uncategorized.</p> : (
        <ol className="cat-list">
          {cats.map((c, i) => (
            <li key={c.id}>
              {editing === c.id ? (
                <form className="cat-edit" onSubmit={(e) => { e.preventDefault(); const n = draft.trim(); if (!n) return; void run(async () => { await api.renameCategory(c.id, n); setEditing(null); }); }}>
                  <label className="sr-only" htmlFor={`rename-${c.id}`}>Rename {c.name}</label>
                  <input id={`rename-${c.id}`} className="input input-sm" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={80} data-autofocus autoFocus />
                  <button className="btn btn-sm btn-primary" disabled={busy || !draft.trim()}>Save</button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                </form>
              ) : (
                <div className="cat-row">
                  <span className="cat-name"><strong>{c.name}</strong> <span className="muted">{plural(c.feed_count, 'feed')}</span></span>
                  <div className="feed-actions">
                    <button className="icon-btn icon-btn-sm" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label={`Move ${c.name} up`}><ArrowUp size={16} aria-hidden /></button>
                    <button className="icon-btn icon-btn-sm" onClick={() => move(i, 1)} disabled={busy || i === cats.length - 1} aria-label={`Move ${c.name} down`}><ArrowDown size={16} aria-hidden /></button>
                    <button className="icon-btn icon-btn-sm" onClick={() => { setEditing(c.id); setDraft(c.name); }} aria-label={`Rename ${c.name}`}><Pencil size={16} aria-hidden /></button>
                    <button className="icon-btn icon-btn-sm" onClick={() => { setDeleting(c.id); setMoveTo(''); }} aria-label={`Delete ${c.name}`}><Trash2 size={16} aria-hidden /></button>
                  </div>
                </div>
              )}
              {deleting === c.id && (
                <div className="feed-edit confirm-inline" role="group" aria-label={`Confirm deleting ${c.name}`}>
                  <span>Delete “{c.name}”? Its {plural(c.feed_count, 'feed')} will move to:</span>
                  <select className="select select-sm" aria-label="Move feeds to" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                    <option value="">Uncategorized</option>
                    {cats.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                  <button className="btn btn-sm btn-danger" disabled={busy} data-autofocus onClick={() => void run(async () => { const r = await api.deleteCategory(c.id, moveTo ? Number(moveTo) : null); setDeleting(null); toast.show(`Deleted ${c.name}. ${plural(r.feeds_moved, 'feed')} moved to ${r.moved_to}.`, { tone: 'info' }); })}>Delete category</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------
function OpmlPanel() {
  const { reload } = useLibrary();
  const toast = useToast();
  const loc = useLocation();
  const ref = useRef<HTMLElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<OpmlPreview | null>(null);
  const [result, setResult] = useState<OpmlResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (loc.hash === '#import') ref.current?.scrollIntoView({ block: 'start' }); }, [loc.hash]);

  const pick = async (f: File | null) => {
    setFile(f); setPreview(null); setResult(null); setError(null);
    if (!f) return;
    setBusy(true);
    try { setPreview(await api.opmlPreview(f)); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const doImport = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const r = await api.opmlImport(file);
      setResult(r); setPreview(null); await reload();
      toast.show(`Imported ${plural(r.summary.added, 'feed')}`, { tone: 'success' });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <section id="import" ref={ref} aria-labelledby="opml-title" className="panel">
      <h2 id="opml-title" className="section-title">Import and export (OPML)</h2>
      <p className="muted">Move your subscriptions and categories to or from another reader.</p>
      <div className="opml-actions">
        <label className="btn"><Upload size={16} aria-hidden /> Choose OPML file<input type="file" accept=".opml,.xml,text/xml,text/x-opml,application/xml" className="sr-only" onChange={(e) => void pick(e.target.files?.[0] ?? null)} /></label>
        <a className="btn" href={api.opmlExportUrl} download><Download size={16} aria-hidden /> Export subscriptions</a>
        {file && <span className="muted" aria-live="polite"><FileUp size={14} aria-hidden /> {file.name}</span>}
      </div>
      {busy && !preview && <p aria-live="polite"><Spinner /> Reading file…</p>}
      {error && <ErrorNotice message={error} />}
      {preview && (
        <div className="opml-preview">
          <p aria-live="polite"><strong>{plural(preview.summary.new, 'feed')}</strong> to add · {preview.summary.duplicate} duplicate{preview.summary.duplicate === 1 ? '' : 's'} skipped · {preview.summary.invalid} invalid</p>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Feeds found in the OPML file</caption>
              <thead><tr><th scope="col">Feed</th><th scope="col">Category</th><th scope="col">Result</th></tr></thead>
              <tbody>
                {preview.entries.map((r, i) => (
                  <tr key={`${r.url}-${i}`}>
                    <td><strong>{r.title || r.url || 'Untitled'}</strong>{r.url && r.title && <span className="muted feed-url">{r.url}</span>}</td>
                    <td>{r.category ?? '—'}</td>
                    <td><span className={`status status-${r.status === 'new' ? 'success' : r.status === 'duplicate' ? 'warning' : 'error'}`}>{r.status === 'new' ? 'Will add' : r.status === 'duplicate' ? 'Duplicate' : 'Invalid'}</span>{r.reason && <span className="muted"> {r.reason}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" onClick={doImport} disabled={busy || preview.summary.new === 0}>{busy ? <><Spinner /> Importing and checking feeds…</> : `Import ${plural(preview.summary.new, 'feed')}`}</button>
        </div>
      )}
      {result && (
        <div className="notice" role="status">
          <p><strong>Import finished:</strong> {result.summary.added} added · {result.summary.duplicates} duplicate{result.summary.duplicates === 1 ? '' : 's'} skipped · {result.summary.failed} couldn’t be reached · {result.summary.invalid} invalid.</p>
          {result.failed.length > 0 && <ul>{result.failed.map((f, i) => <li key={i}>{f.title || f.url}: {f.reason}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}

export function FeedsPage() {
  return (
    <div className="page feeds-page">
      <header className="page-head"><h1>Manage feeds</h1><p className="muted">Add sources, keep them healthy and organise them into categories.</p></header>
      <HealthSummary />
      <AddFeed />
      <FeedList />
      <Categories />
      <OpmlPanel />
    </div>
  );
}
