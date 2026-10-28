import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CloudPanel } from './CloudPanel';
import { Link } from 'react-router-dom';
import {
  captureItem,
  decodeWorkspace,
  emptyWorkspace,
  persistWorkspace,
  STORAGE_KEY,
  updateItem,
} from './workspace';
import type { Capture, Item, ItemKind, Workspace } from './workspace';
import './synapsehub.css';

const freshCapture = (kind: ItemKind = 'task', origin = ''): Capture => ({
  kind,
  title: '',
  body: '',
  url: '',
  due: '',
  priority: 'normal',
  origin,
});
const sections = [
  'Overview',
  'Tasks',
  'Notes',
  'Sources',
  'Connections',
] as const;
type Section = (typeof sections)[number];
export default function SynapseHubPage({
  session = null,
  recovery = false,
  onRecovered = () => {},
}: {
  session?: Session | null;
  recovery?: boolean;
  onRecovered?: () => void;
}) {
  const storageKey = session
    ? `${STORAGE_KEY}.${session.user.id}`
    : STORAGE_KEY;
  const [loaded] = useState(() => {
    try {
      return {
        state: decodeWorkspace(localStorage.getItem(storageKey)),
        error: '',
      };
    } catch {
      return {
        state: emptyWorkspace(),
        error:
          'Could not open local data. It has not been overwritten. Export the stored data for recovery, or reload after restoring a valid backup.',
      };
    }
  });
  const [state, setState] = useState<Workspace>(loaded.state);
  const [section, setSection] = useState<Section>('Overview');
  const [query, setQuery] = useState('');
  const [capture, setCapture] = useState<Capture>(freshCapture());
  const [capturing, setCapturing] = useState(false);
  const [selected, setSelected] = useState<string>('');
  const [editing, setEditing] = useState<Item | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(loaded.error);
  const titleRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLButtonElement>(null);
  const active = state.items.find((i) => i.id === selected);
  const tasks = state.items.filter((i) => i.kind === 'task');
  const open = tasks.filter((t) => !t.completed);
  useEffect(() => {
    if (capturing) titleRef.current?.focus();
  }, [capturing]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCapturing(true);
      }
      if (event.key === 'Escape') {
        setCapturing(false);
        captureRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  function save(next: Workspace, feedback: string): boolean {
    if (loaded.error) return false;
    try {
      setState(persistWorkspace(state, next, localStorage, storageKey));
      setError('');
      setMessage(feedback);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Save failed. Check browser storage permissions and available space.',
      );
      return false;
    }
  }
  function loadCloud(next: Workspace) {
    if (
      !save(
        { ...next, revision: state.revision },
        'Cloud snapshot saved to this account’s local cache.',
      )
    )
      throw new Error(
        'Could not persist downloaded data. Local copy was not replaced.',
      );
  }
  function create() {
    try {
      if (
        save(captureItem(state, capture), 'Captured and saved on this device.')
      ) {
        setCapture(freshCapture(capture.kind));
        setCapturing(false);
        captureRef.current?.focus();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not capture item.');
    }
  }
  function exportData() {
    try {
      const raw = localStorage.getItem(storageKey) ?? JSON.stringify(state);
      const url = URL.createObjectURL(
        new Blob([raw], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = 'synapsehub-workspace.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Local workspace export downloaded.');
    } catch {
      setError('Export failed. Browser storage may be unavailable.');
    }
  }
  function derive(item: Item, kind: ItemKind) {
    setCapture({ ...freshCapture(kind, item.id), body: item.body });
    setCapturing(true);
  }
  const visible = state.items.filter(
    (i) =>
      (section === 'Overview' ||
        section === 'Connections' ||
        i.kind ===
          (
            { Tasks: 'task', Notes: 'note', Sources: 'source' } as Record<
              string,
              string
            >
          )[section]) &&
      `${i.title} ${i.body}`.toLowerCase().includes(query.toLowerCase()),
  );
  const relationLabel = (id: string) =>
    state.items.find((i) => i.id === id)?.title ?? 'Unavailable item';
  return (
    <div className="sh-app">
      <aside className="sh-sidebar">
        <Link to="/synapsehub" className="sh-brand">
          <span aria-hidden="true">✳</span> SynapseHub
        </Link>
        <p className="sh-caption">PERSONAL WORKSPACE</p>
        <nav aria-label="Workspace">
          {sections.map((s, n) => (
            <button
              key={s}
              aria-current={section === s ? 'page' : undefined}
              onClick={() => {
                setSection(s);
                setSelected('');
                setEditing(null);
              }}
            >
              <span aria-hidden="true">{['◈', '☑', '▤', '▥', '⌘'][n]}</span>
              {s}
              <span className="sh-count">
                {s === 'Tasks'
                  ? open.length
                  : s === 'Notes'
                    ? state.items.filter((i) => i.kind === 'note').length
                    : s === 'Sources'
                      ? state.items.filter((i) => i.kind === 'source').length
                      : ''}
              </span>
            </button>
          ))}
        </nav>
        <div className="sh-local">
          <span className="sh-dot" /> Local workspace
          <p>
            {session
              ? 'Account cache in this browser.'
              : 'Stored in this browser only.'}
            <br />
            {session
              ? 'Explicit cloud actions below.'
              : 'Cloud features require sign-in.'}
          </p>
          <button onClick={exportData}>Export workspace ↗</button>
        </div>
        <Link className="sh-back" to="/">
          ← Back to portfolio
        </Link>
      </aside>
      <main className="sh-main">
        <header className="sh-topbar">
          <span>
            Workspace <span aria-hidden="true">/</span>{' '}
            <strong>{section}</strong>
          </span>
          <button
            className="sh-primary"
            ref={captureRef}
            onClick={() => setCapturing(!capturing)}
            aria-expanded={capturing}
          >
            + Quick capture <kbd>⌘ / Ctrl K</kbd>
          </button>
        </header>
        <div className="sh-content">
          <div className="sh-heading">
            <div>
              <p className="sh-caption">
                YOUR KNOWLEDGE, CONNECTED TO YOUR WORK
              </p>
              <h1>
                {section === 'Overview'
                  ? 'Make room for meaningful work.'
                  : section}
              </h1>
              <p>
                {section === 'Overview'
                  ? 'Capture an idea. Keep its context. Turn it into your next step.'
                  : section === 'Connections'
                    ? 'Trace every saved relationship back to its origin.'
                    : `Your ${section.toLowerCase()}, with their context close at hand.`}
              </p>
            </div>
            <span className="sh-badge">CONNECTED BETA</span>
          </div>
          <div role="status" className="sh-status">
            {message}
          </div>
          {error && (
            <div role="alert" className="sh-error">
              {error}
            </div>
          )}
          {capturing && (
            <form
              className="sh-capture sh-panel"
              onSubmit={(e) => {
                e.preventDefault();
                create();
              }}
            >
              <div className="sh-panel-title">
                <h2>Capture something worth keeping</h2>
                <button
                  type="button"
                  onClick={() => {
                    setCapturing(false);
                    captureRef.current?.focus();
                  }}
                >
                  Cancel
                </button>
              </div>
              <div className="sh-form-grid">
                <label>
                  Type
                  <select
                    aria-label="Type"
                    value={capture.kind}
                    onChange={(e) =>
                      setCapture({
                        ...capture,
                        kind: e.target.value as ItemKind,
                      })
                    }
                  >
                    <option value="task">Task</option>
                    <option value="note">Note</option>
                    <option value="source">Source excerpt</option>
                  </select>
                </label>
                <label>
                  Title
                  <input
                    ref={titleRef}
                    required
                    maxLength={200}
                    value={capture.title}
                    onChange={(e) =>
                      setCapture({ ...capture, title: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                {capture.kind === 'source'
                  ? 'Source excerpt (paste original text)'
                  : 'Content'}
                <textarea
                  maxLength={50000}
                  rows={3}
                  value={capture.body}
                  onChange={(e) =>
                    setCapture({ ...capture, body: e.target.value })
                  }
                />
              </label>
              {capture.kind === 'source' && (
                <label>
                  Original URL (optional)
                  <input
                    type="url"
                    value={capture.url}
                    onChange={(e) =>
                      setCapture({ ...capture, url: e.target.value })
                    }
                  />
                  <small>
                    Manual capture only. URLs are not fetched or indexed.
                  </small>
                </label>
              )}
              {capture.kind === 'task' && (
                <div className="sh-form-grid">
                  <label>
                    Due date
                    <input
                      type="date"
                      value={capture.due}
                      onChange={(e) =>
                        setCapture({ ...capture, due: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Priority
                    <select
                      value={capture.priority}
                      onChange={(e) =>
                        setCapture({
                          ...capture,
                          priority: e.target.value as 'normal' | 'high',
                        })
                      }
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
              )}
              <label>
                Derived from
                <select
                  value={capture.origin}
                  onChange={(e) =>
                    setCapture({ ...capture, origin: e.target.value })
                  }
                >
                  <option value="">No linked origin</option>
                  {state.items.map((i) => (
                    <option value={i.id} key={i.id}>
                      {i.kind} · {i.title}
                    </option>
                  ))}
                </select>
              </label>
              <button className="sh-primary" disabled={Boolean(loaded.error)}>
                Save {capture.kind}
              </button>
            </form>
          )}
          {section === 'Overview' && (
            <>
              <div className="sh-stats">
                {[
                  ['Open tasks', open.length, 'A clear next step'],
                  [
                    'Saved notes',
                    state.items.filter((i) => i.kind === 'note').length,
                    'Ideas with room to grow',
                  ],
                  [
                    'Source excerpts',
                    state.items.filter((i) => i.kind === 'source').length,
                    'Keep the original context',
                  ],
                  [
                    'Connections',
                    state.relations.length,
                    'Knowledge put to work',
                  ],
                ].map(([label, count, sub]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                    <small>{sub}</small>
                  </div>
                ))}
              </div>
              <section className="sh-path">
                <span className="sh-badge">KNOWLEDGE → ACTION</span>
                <h2>Good ideas deserve a next step.</h2>
                <p>
                  Save a source excerpt, turn it into a note, then create a
                  linked task. The origin stays connected at every step.
                </p>
                <button
                  onClick={() => {
                    setCapture(freshCapture('source'));
                    setCapturing(true);
                  }}
                >
                  Capture your first source →
                </button>
              </section>
            </>
          )}
          <CloudPanel
            session={session}
            workspace={state}
            onLoad={loadCloud}
            recovery={recovery}
            onRecovered={onRecovered}
          />
          <div className="sh-work">
            <section className="sh-panel sh-list">
              <div className="sh-panel-title">
                <h2>
                  {section === 'Overview'
                    ? 'Your workspace'
                    : section === 'Connections'
                      ? 'Relationship ledger'
                      : `All ${section.toLowerCase()}`}
                </h2>
                <span>
                  {section === 'Connections'
                    ? state.relations.length
                    : visible.length}{' '}
                  items
                </span>
              </div>
              <label className="sh-search">
                <span>Search workspace</span>
                <input
                  type="search"
                  placeholder="Find a title or passage…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {section === 'Connections' ? (
                <div className="sh-relations">
                  {state.relations
                    .filter((r) =>
                      `${relationLabel(r.from)} ${relationLabel(r.to)}`
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <div key={`${r.from}-${r.to}`}>
                        <button
                          onClick={() => {
                            setSelected(r.from);
                            setEditing(null);
                          }}
                        >
                          {relationLabel(r.from)}
                        </button>
                        <span>derived from →</span>
                        <button
                          onClick={() => {
                            setSelected(r.to);
                            setEditing(null);
                          }}
                        >
                          {relationLabel(r.to)}
                        </button>
                      </div>
                    ))}
                  {!state.relations.length && (
                    <p className="sh-empty">
                      No connections yet. Create a note or task from a saved
                      source to preserve its origin.
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {visible.length === 0 && (
                    <div className="sh-empty">
                      <span aria-hidden="true">✳</span>
                      <h3>
                        {query
                          ? 'No matching items'
                          : 'A fresh space for your next idea'}
                      </h3>
                      <p>
                        {query
                          ? 'Try a different title or passage.'
                          : 'Start with a task, a note, or a passage you want to remember.'}
                      </p>
                      {!query && (
                        <button
                          onClick={() => {
                            setCapture(
                              freshCapture(
                                section === 'Notes'
                                  ? 'note'
                                  : section === 'Sources'
                                    ? 'source'
                                    : 'task',
                              ),
                            );
                            setCapturing(true);
                          }}
                        >
                          + Capture an item
                        </button>
                      )}
                    </div>
                  )}
                  {visible.map((item) => (
                    <div
                      className={`sh-row ${selected === item.id ? 'sh-selected' : ''}`}
                      key={item.id}
                    >
                      {item.kind === 'task' ? (
                        <input
                          type="checkbox"
                          aria-label={`Complete ${item.title}`}
                          checked={item.completed}
                          onChange={() =>
                            save(
                              updateItem(state, {
                                ...item,
                                completed: !item.completed,
                              }),
                              item.completed
                                ? 'Task reopened.'
                                : 'Task completed.',
                            )
                          }
                        />
                      ) : (
                        <span className="sh-item-icon" aria-hidden="true">
                          {item.kind === 'source' ? '▥' : '▤'}
                        </span>
                      )}
                      <button
                        className="sh-item"
                        onClick={() => {
                          setSelected(item.id);
                          setEditing(null);
                        }}
                      >
                        <strong
                          className={
                            item.kind === 'task' && item.completed
                              ? 'sh-done'
                              : ''
                          }
                        >
                          {item.title}
                        </strong>
                        <small>
                          {item.kind}
                          {item.kind === 'task' && item.due
                            ? ` · Due ${item.due}`
                            : ''}
                          {item.kind === 'task' && item.priority === 'high'
                            ? ' · High priority'
                            : ''}
                        </small>
                      </button>
                      <span className="sh-link-count">
                        {
                          state.relations.filter(
                            (r) => r.from === item.id || r.to === item.id,
                          ).length
                        }{' '}
                        links
                      </span>
                    </div>
                  ))}
                </>
              )}
            </section>
            <aside className="sh-panel sh-detail" aria-label="Item details">
              {active ? (
                <>
                  <div className="sh-panel-title">
                    <span className="sh-caption">{active.kind}</span>
                    <button
                      aria-label="Close details"
                      onClick={() => {
                        setSelected('');
                        setEditing(null);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  {editing ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        try {
                          if (
                            save(
                              updateItem(state, {
                                ...editing,
                                title: editing.title.trim(),
                              }),
                              'Changes saved.',
                            )
                          )
                            setEditing(null);
                        } catch {
                          setError('Enter valid record details.');
                        }
                      }}
                    >
                      <label>
                        Edit title
                        <input
                          required
                          maxLength={200}
                          value={editing.title}
                          onChange={(e) =>
                            setEditing({ ...editing, title: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Edit content
                        <textarea
                          rows={7}
                          maxLength={50000}
                          value={editing.body}
                          onChange={(e) =>
                            setEditing({ ...editing, body: e.target.value })
                          }
                        />
                      </label>
                      {editing.kind === 'task' && (
                        <>
                          <label>
                            Edit due date
                            <input
                              type="date"
                              value={editing.due}
                              onChange={(e) =>
                                setEditing({ ...editing, due: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            Edit priority
                            <select
                              value={editing.priority}
                              onChange={(e) =>
                                setEditing({
                                  ...editing,
                                  priority: e.target.value as 'normal' | 'high',
                                })
                              }
                            >
                              <option value="normal">Normal</option>
                              <option value="high">High</option>
                            </select>
                          </label>
                        </>
                      )}
                      <button className="sh-primary">Save changes</button>
                      <button type="button" onClick={() => setEditing(null)}>
                        Cancel edit
                      </button>
                    </form>
                  ) : (
                    <>
                      <h2>{active.title}</h2>
                      <p className="sh-body">
                        {active.body || 'No content added.'}
                      </p>
                      {active.kind === 'source' && active.url && (
                        <a href={active.url} target="_blank" rel="noreferrer">
                          Open original source ↗
                        </a>
                      )}
                      {active.kind === 'source' && (
                        <p className="sh-disclaimer">
                          User-supplied excerpt. Not independently verified; no
                          AI analysis has been performed.
                        </p>
                      )}
                      <button onClick={() => setEditing(active)}>
                        Edit item
                      </button>
                      <div className="sh-actions">
                        <button onClick={() => derive(active, 'note')}>
                          Create linked note
                        </button>
                        <button onClick={() => derive(active, 'task')}>
                          Create linked task
                        </button>
                      </div>
                      <h3>Linked context</h3>
                      {state.relations
                        .filter(
                          (r) => r.from === active.id || r.to === active.id,
                        )
                        .map((r) => (
                          <button
                            className="sh-context"
                            key={`${r.from}-${r.to}`}
                            onClick={() => {
                              setSelected(r.from === active.id ? r.to : r.from);
                              setEditing(null);
                            }}
                          >
                            <small>
                              {r.from === active.id
                                ? 'Derived from'
                                : 'Used in'}
                            </small>
                            {relationLabel(
                              r.from === active.id ? r.to : r.from,
                            )}{' '}
                            →
                          </button>
                        ))}
                      {!state.relations.some(
                        (r) => r.from === active.id || r.to === active.id,
                      ) && <p>No linked items yet.</p>}
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="sh-detail-symbol" aria-hidden="true">
                    ⌘
                  </span>
                  <h2>Keep the context.</h2>
                  <p>
                    Select an item to read it, edit it, or turn it into a
                    connected note or task.
                  </p>
                  <hr />
                  <h3>Built for ownership</h3>
                  <p>
                    This milestone saves data in browser storage. Export
                    regularly: clearing browser data removes this workspace.
                  </p>
                  <h3>What comes next</h3>
                  <p>
                    Connect your account above to sync snapshots, upload text
                    PDFs, retrieve selected-source evidence and optionally
                    generate cited AI claims.
                  </p>
                </>
              )}
            </aside>
          </div>
          <footer className="sh-footer">
            SynapseHub · Connected workspace foundation{' '}
            <span>Cloud actions require explicit selection</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
