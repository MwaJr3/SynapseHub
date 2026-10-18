import { useMemo, useState } from 'react';
import type { ChallengeRecord } from '@/data/challengeManifest';
import { getAppDefinition } from '@/apps/appRegistry';

interface BookHit { key: string; title: string; author_name?: string[]; first_publish_year?: number }

interface Entry {
  id: string;
  title: string;
  detail: string;
  category: string;
  createdAt: string;
  done: boolean;
  archived: boolean;
  votes: number;
  voted: boolean;
  rating: number;
  saved: number;
}

function readEntries(key: string): Entry[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Entry => Boolean(item && typeof item.id === 'string' && typeof item.title === 'string'));
  } catch { return []; }
}

const makeEntry = (title: string, detail: string, category: string): Entry => ({
  id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title, detail, category, createdAt: new Date().toISOString(), done: false, archived: false,
  votes: 0, voted: false, rating: 1000, saved: 0,
});

const money = (value: number) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);

export function CollectionApp({ project }: { project: ChallengeRecord }) {
  const definition = getAppDefinition(project);
  const storageKey = `mwangala.local-app.${project.slug}.v1`;
  const [entries, setEntries] = useState<Entry[]>(() => readEntries(storageKey));
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState(project.slug === 'personal-reading-list' ? 'Want to read' : '');
  const [profileName, setProfileName] = useState('');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [message, setMessage] = useState('');
  const [studyId, setStudyId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [deposit, setDeposit] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState<BookHit[]>([]);
  const [bookLoading, setBookLoading] = useState(false);

  const commit = (next: Entry[]) => {
    setEntries(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setMessage('Saved in this browser.'); }
    catch { setMessage('Could not save locally. Your browser storage may be full or unavailable.'); }
  };

  const isPoll = project.slug === 'poll-creator-app';
  const activeEntries = useMemo(() => entries
    .filter((entry) => entry.archived === showArchived)
    .filter((entry) => `${entry.title} ${entry.detail} ${entry.category}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => project.slug === 'restaurant-ranking-app' ? b.rating - a.rating : b.createdAt.localeCompare(a.createdAt)),
  [entries, query, showArchived, project.slug]);

  const searchBooks = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBookLoading(true); setMessage('');
    try {
      const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(bookQuery.trim())}&limit=6`);
      if (!response.ok) throw new Error(`Open Library returned ${response.status}.`);
      const data = await response.json() as { docs?: BookHit[] };
      setBookResults(data.docs ?? []); setMessage(`${data.docs?.length ?? 0} public catalogue result(s).`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Book search failed.'); }
    finally { setBookLoading(false); }
  };

  const addBook = (book: BookHit) => {
    const author = book.author_name?.slice(0, 2).join(', ') ?? 'Author not listed';
    commit([makeEntry(book.title, author, 'Want to read'), ...entries]);
    setBookResults((items) => items.filter((item) => item.key !== book.key));
  };

  const addEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) { setMessage('Add a title before saving.'); return; }
    if (isPoll && detail.split(',').filter((option) => option.trim()).length < 2) {
      setMessage('Add at least two answer options, separated by commas.'); return;
    }
    commit([makeEntry(title.trim(), detail.trim(), category.trim()), ...entries]);
    setTitle(''); setDetail(''); setCategory(project.slug === 'personal-reading-list' ? 'Want to read' : '');
  };

  const updateEntry = (id: string, patch: Partial<Entry>) => commit(entries.map((item) => item.id === id ? { ...item, ...patch } : item));
  const activeCount = entries.filter((entry) => !entry.archived).length;
  const doneCount = entries.filter((entry) => entry.done && !entry.archived).length;
  const amountOf = (entry: Entry) => Number.parseFloat(entry.detail.replace(/[^0-9.-]/g, '')) || 0;
  const studyEntry = entries.find((entry) => entry.id === studyId);

  return (
    <div className="app-workspace">
      <div className="app-status-row"><span className="app-local-badge"><i /> Saved on this device only</span><span className="app-status-count">{activeCount} active · {doneCount} complete</span></div>

      {project.slug === 'personal-reading-list' && <section className="app-book-search"><p className="app-kicker">Open Library · public catalogue</p><form className="app-api-search" onSubmit={searchBooks}><label>Search books<input value={bookQuery} onChange={(event) => setBookQuery(event.target.value)} required placeholder="Title, author, or keyword" /></label><button className="app-button" disabled={bookLoading}>{bookLoading ? 'Searching…' : 'Search books'}</button></form>{bookResults.length > 0 && <div className="app-api-results">{bookResults.map((book) => <article key={book.key} className="app-api-result"><div><h4>{book.title}</h4><p>{book.author_name?.slice(0, 2).join(', ') || 'Author not listed'}{book.first_publish_year ? ` · ${book.first_publish_year}` : ''}</p></div><button className="app-button app-button--small" onClick={() => addBook(book)}>Add to shelf</button></article>)}</div>}<p className="app-small-note">Search terms go to Open Library. Metadata can be incomplete and is not independently verified.</p></section>}

      {project.slug === 'restaurant-ranking-app' && activeEntries.length >= 2 && <section className="app-pair-panel"><div><p className="app-kicker">Quick comparison</p><h3>Which would you choose?</h3><p>Each choice updates a simple local preference score—not an objective quality rating.</p></div>{activeEntries.slice(0, 2).map((item) => <button key={item.id} className="app-choice-button" onClick={() => updateEntry(item.id, { rating: item.rating + 25 })}><strong>{item.title}</strong><span>{item.category || 'Your shortlist'}</span><b>Prefer this</b></button>)}</section>}

      {project.slug === 'expense-splitter' && <section className="app-calculator-panel"><div><p className="app-kicker">Equal split calculator</p><h3>Split an amount</h3><label>People<input type="number" min="1" max="100" value={splitCount} onChange={(event) => setSplitCount(Math.max(1, Number(event.target.value) || 1))} /></label></div><p>Each person pays <strong>{money((activeEntries.reduce((sum, entry) => sum + amountOf(entry), 0)) / splitCount)}</strong><span> based on {money(activeEntries.reduce((sum, entry) => sum + amountOf(entry), 0))} in listed expenses.</span></p></section>}

      {project.slug === 'savings-tracker' && activeEntries.length > 0 && <section className="app-calculator-panel"><div><p className="app-kicker">Quick deposit</p><h3>Add progress to a goal</h3><label>Amount<input inputMode="decimal" value={deposit} onChange={(event) => setDeposit(event.target.value)} placeholder="0.00" /></label></div><div className="app-goal-buttons">{activeEntries.slice(0, 3).map((entry) => <button key={entry.id} className="app-button app-button--small" onClick={() => { const amount = Number.parseFloat(deposit); if (!(amount > 0)) { setMessage('Enter a deposit greater than zero.'); return; } updateEntry(entry.id, { saved: entry.saved + amount }); setDeposit(''); }}>{entry.title} · {money(entry.saved)} saved +</button>)}</div></section>}

      {project.slug === 'flashcard-app' && studyEntry && <section className="app-study-card"><p className="app-kicker">Study card</p><button className="app-flashcard" onClick={() => setFlipped((value) => !value)} aria-label={flipped ? 'Show question' : 'Flip card to reveal answer'}><span>{flipped ? studyEntry.detail || 'No answer added yet.' : studyEntry.title}</span><small>{flipped ? 'Answer · click to show question' : 'Question · click to flip'}</small></button><div className="app-inline-actions"><button className="app-button app-button--small" onClick={() => { const index = activeEntries.findIndex((item) => item.id === studyEntry.id); setStudyId(activeEntries[(index + 1) % activeEntries.length]?.id ?? null); setFlipped(false); }}>Next card</button><button className="app-button app-button--small" onClick={() => setStudyId(null)}>End study</button></div></section>}

      {project.slug === 'linksharing-app' && <section className="app-profile-preview"><div className="app-avatar" aria-hidden="true">{(profileName || 'M').slice(0, 1).toUpperCase()}</div><strong>{profileName || 'Your profile preview'}</strong><span>Preview stays in this browser</span><div>{activeEntries.slice(0, 4).map((item) => { const destination = safeDestination(item.detail); return destination ? <a key={item.id} href={destination} target="_blank" rel="noreferrer">{item.title} ↗</a> : <span key={item.id}>{item.title} · add a valid URL</span>; })}</div></section>}

      <form className="app-entry-form" onSubmit={addEntry}>
        <div className="app-form-heading"><div><p className="app-kicker">{isPoll ? 'New poll · local demo' : 'Add an entry'}</p><h3>{isPoll ? 'Ask your question' : definition.itemLabel}</h3></div><span className="app-small-note">Required fields marked *</span></div>
        {project.slug === 'linksharing-app' && <label>Profile display name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} placeholder="Your name" maxLength={80} /></label>}
        <label>{definition.itemLabel} *<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={definition.itemPlaceholder} required maxLength={120} /></label>
        <label>{definition.detailLabel || 'Notes'}{isPoll ? ' · separate options with commas' : ''}<input value={detail} onChange={(event) => setDetail(event.target.value)} placeholder={definition.detailPlaceholder} maxLength={240} required={isPoll} /></label>
        {project.slug === 'poll-creator-app' && <p className="app-small-note">This poll is stored only in this browser. Voting does not sync across people or devices.</p>}
        {project.slug === 'personal-reading-list' && <label>Shelf<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="Want to read">Want to read</option><option value="Reading">Reading</option><option value="Finished">Finished</option><option value="Custom">Custom</option></select></label>}
        {project.slug !== 'personal-reading-list' && <label>{project.slug === 'poll-creator-app' ? 'Poll note (optional)' : 'Category / tag (optional)'}<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Optional" maxLength={80} /></label>}
        <button className="app-button" type="submit">{isPoll ? 'Create local poll' : `Save ${definition.itemLabel.toLowerCase()}`}</button>
      </form>

      {message && <p className="app-feedback" role="status" aria-live="polite">{message}</p>}

      <div className="app-list-toolbar"><label className="app-search">Search your entries<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles and notes" /></label><button className="app-button app-button--quiet" onClick={() => setShowArchived((value) => !value)}>{showArchived ? 'View active' : 'View archived'}</button></div>

      {activeEntries.length === 0 ? <div className="app-empty-state"><span aria-hidden="true">✳</span><h3>{query ? 'No matching entries' : showArchived ? 'Nothing archived yet' : `No ${definition.itemLabel.toLowerCase()}s yet`}</h3><p>{query ? 'Try a shorter search.' : 'Add an entry above to start. It will remain in this browser unless you clear site data.'}</p></div> : (
        <div className="app-entry-list">
          {activeEntries.map((entry) => {
            const pollOptions = isPoll ? entry.detail.split(',').map((option) => option.trim()).filter(Boolean) : [];
            return <article className="app-entry-card" key={entry.id}>
              <div className="app-entry-top"><div><p className="app-kicker">{entry.category || new Date(entry.createdAt).toLocaleDateString()}</p><h4>{entry.title}</h4>{entry.detail && !isPoll && <p className="app-entry-detail">{entry.detail}</p>}</div><button className="app-icon-button" aria-label={`Delete ${entry.title}`} onClick={() => commit(entries.filter((item) => item.id !== entry.id))}>×</button></div>
              {isPoll && <div className="app-poll-options">{pollOptions.map((option) => <button key={option} disabled={entry.voted} onClick={() => updateEntry(entry.id, { votes: entry.votes + 1, voted: true })}><span>{option}</span><small>{entry.voted ? `Voted on this device · ${entry.votes} local vote${entry.votes === 1 ? '' : 's'}` : 'Cast one local vote'}</small></button>)}</div>}
              {project.slug === 'savings-tracker' && <div className="app-progress"><span style={{ width: `${Math.min(100, amountOf(entry) > 0 ? entry.saved / amountOf(entry) * 100 : 0)}%` }} /><small>{money(entry.saved)} saved · target {money(amountOf(entry))}</small></div>}
              {project.slug === 'restaurant-ranking-app' && <p className="app-small-note">Preference score · {entry.rating}</p>}
              {project.slug === 'product-feedback-app' && <button className={`app-vote-button ${entry.voted ? 'is-voted' : ''}`} disabled={entry.voted} onClick={() => updateEntry(entry.id, { votes: entry.votes + 1, voted: true })}>↑ {entry.votes} · {entry.voted ? 'Voted on this device' : 'Upvote once'}</button>}
              {project.slug === 'flashcard-app' && <button className="app-button app-button--small" onClick={() => { setStudyId(entry.id); setFlipped(false); }}>Study this card ↗</button>}
              {project.slug === 'personal-reading-list' && <button className="app-button app-button--small" onClick={() => updateEntry(entry.id, { category: nextShelf(entry.category) })}>Move to {nextShelf(entry.category)} ↗</button>}
              {project.slug !== 'poll-creator-app' && project.slug !== 'product-feedback-app' && <div className="app-entry-actions"><button onClick={() => updateEntry(entry.id, { done: !entry.done })}>{entry.done ? 'Mark active' : 'Mark complete'}</button><button onClick={() => updateEntry(entry.id, { archived: !entry.archived })}>{entry.archived ? 'Restore' : 'Archive'}</button></div>}
            </article>;
          })}
        </div>
      )}
      <p className="app-privacy-note">Local prototype: no account, server sync, or cross-device sharing is configured. Data is stored in browser localStorage on this device.</p>
    </div>
  );
}

function nextShelf(shelf: string) {
  const shelves = ['Want to read', 'Reading', 'Finished'];
  return shelves[(shelves.indexOf(shelf) + 1) % shelves.length] ?? shelves[0];
}

function safeDestination(value: string) {
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined; }
  catch { return undefined; }
}
