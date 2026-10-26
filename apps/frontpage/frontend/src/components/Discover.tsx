import { useEffect, useId, useState, type FormEvent } from 'react';
import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage, plural } from '../lib/format';
import type { LookupResult, Pack } from '../types';
import { useLibrary } from '../state/library';
import { useSession } from '../state/session';
import { useToast } from '../state/toast';
import { ErrorNotice, Skeleton, Spinner } from './common';

export function PacksGrid({ compact = false }: { compact?: boolean }) {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, Set<string>>>({});
  const { reload } = useLibrary();
  const { markOnboarded } = useSession();
  const toast = useToast();

  const load = () => api.packs().then((r) => setPacks(r.packs)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { void load(); }, []);

  const follow = async (pack: Pack, urls?: string[]) => {
    setBusy(pack.id);
    try {
      const res = await api.followPack(pack.id, urls);
      markOnboarded();
      await Promise.all([reload(), load()]);
      const msg = res.added.length ? `Added ${plural(res.added.length, 'feed')} to ${res.category}` : 'You already follow these';
      toast.show(res.failed.length ? `${msg}. ${plural(res.failed.length, 'feed')} couldn’t be reached right now.` : msg, { tone: res.added.length ? 'success' : 'info' });
    } catch (err) {
      toast.show(errorMessage(err), { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  if (error) return <ErrorNotice message={error} onRetry={() => { setError(null); void load(); }} />;
  if (!packs) return <div className="packs">{[0, 1, 2].map((i) => <div key={i} className="pack"><Skeleton style={{ width: '40%', height: 18 }} /><Skeleton style={{ width: '90%', height: 12, marginTop: 10 }} /><Skeleton style={{ width: '100%', height: 36, marginTop: 16 }} /></div>)}</div>;

  return (
    <div className={`packs ${compact ? 'packs-compact' : ''}`}>
      {packs.map((pack) => {
        const done = pack.followed_count === pack.feeds.length;
        const sel = picked[pack.id] ?? new Set(pack.feeds.filter((f) => !f.followed).map((f) => f.url));
        const expanded = open === pack.id;
        return (
          <section key={pack.id} className="pack" aria-labelledby={`pack-${pack.id}`}>
            <h3 id={`pack-${pack.id}`}>{pack.name}</h3>
            <p className="pack-desc">{pack.description}</p>
            <p className="pack-sources">{pack.feeds.slice(0, 4).map((f) => f.title).join(' · ')}{pack.feeds.length > 4 ? ` · +${pack.feeds.length - 4} more` : ''}</p>
            {expanded && (
              <ul className="pack-feeds">
                {pack.feeds.map((f) => (
                  <li key={f.url}>
                    <label className={f.followed ? 'is-followed' : ''}>
                      <input
                        type="checkbox"
                        disabled={f.followed}
                        checked={f.followed || sel.has(f.url)}
                        onChange={(e) => {
                          const next = new Set(sel);
                          if (e.target.checked) next.add(f.url); else next.delete(f.url);
                          setPicked((p) => ({ ...p, [pack.id]: next }));
                        }}
                      />
                      <span><strong>{f.title}</strong>{f.followed && <em> · following</em>}<small>{f.description}</small></span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="pack-actions">
              {done ? (
                <span className="pack-done"><Check size={16} aria-hidden /> Following all {pack.feeds.length}</span>
              ) : expanded ? (
                <button className="btn btn-primary" disabled={busy !== null || sel.size === 0} onClick={() => follow(pack, [...sel])}>
                  {busy === pack.id ? <><Spinner /> Adding…</> : `Follow ${plural(sel.size, 'selected feed')}`}
                </button>
              ) : (
                <button className="btn btn-primary" disabled={busy !== null} onClick={() => follow(pack)}>
                  {busy === pack.id ? <><Spinner /> Checking feeds…</> : <><Plus size={16} aria-hidden /> Follow {pack.feeds.length - pack.followed_count === pack.feeds.length ? `all ${pack.feeds.length}` : `${pack.feeds.length - pack.followed_count} more`}</>}
                </button>
              )}
              {!done && (
                <button className="btn btn-ghost" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : pack.id)}>
                  Choose feeds <ChevronDown size={16} aria-hidden className={expanded ? 'flip' : ''} />
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function LookupBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LookupResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState('');
  const { library, reload } = useLibrary();
  const { markOnboarded } = useSession();
  const toast = useToast();
  const inputId = useId();

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true); setError(null); setResults(null);
    try { setResults((await api.lookup(query.trim())).results); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  const follow = async (r: LookupResult) => {
    setAdding(r.url);
    try {
      const chosen = library?.categories.find((c) => String(c.id) === category);
      await api.addFeed({ url: r.url, category_id: chosen?.id ?? null, category_name: !chosen && r.pack ? r.pack : null });
      setAdded((s) => new Set(s).add(r.url));
      markOnboarded();
      await reload();
      toast.show(`Following ${r.title}`, { tone: 'success' });
    } catch (err) {
      toast.show(errorMessage(err), { tone: 'error' });
    } finally { setAdding(null); }
  };

  return (
    <div className="lookup">
      <form onSubmit={search} role="search" aria-label="Find feeds" className="lookup-form">
        <label htmlFor={inputId} className="sr-only">Site address, feed URL or topic</label>
        <div className="input-icon"><Search size={18} aria-hidden /><input id={inputId} className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Paste a site or feed URL, or search by name (e.g. “CSS”)" inputMode="url" autoComplete="off" /></div>
        <button className="btn btn-primary" disabled={busy || query.trim().length < 2}>{busy ? <><Spinner /> Looking…</> : 'Find feeds'}</button>
      </form>
      {library && library.categories.length > 0 && (
        <label className="lookup-category">Add to&nbsp;
          <select className="select select-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Suggested category</option>
            {library.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      {error && <ErrorNotice message={error} />}
      {results && results.length === 0 && <p className="muted">No matches. Try the site’s address (like <code>example.com</code>) and we’ll look for its feed.</p>}
      {results && results.length > 0 && (
        <ul className="lookup-results">
          {results.map((r) => {
            const isAdded = added.has(r.url) || r.duplicate;
            return (
              <li key={r.url}>
                <div>
                  <strong>{r.title}</strong>
                  <span className="chip">{r.source === 'discovered' ? 'Found on that site' : `Starter pack · ${r.pack}`}</span>
                  {r.description && <p>{r.description}</p>}
                </div>
                {isAdded ? <span className="pack-done"><Check size={16} aria-hidden /> Following</span> : (
                  <button className="btn" disabled={adding !== null} onClick={() => follow(r)}>{adding === r.url ? <Spinner /> : <Plus size={16} aria-hidden />} Follow</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
