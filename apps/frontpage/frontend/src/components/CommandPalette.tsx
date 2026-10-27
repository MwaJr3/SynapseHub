import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useLibrary } from '../state/library';
import { useRefresh } from '../state/refresh';
import { useReadySession } from '../state/session';
import type { Layout, ThemePref } from '../types';
import { Dialog } from './common';

interface Command { id: string; label: string; hint?: string; group: string; run: () => void; keywords?: string }

export function CommandPalette({ onClose, onShortcuts }: { onClose: () => void; onShortcuts: () => void }) {
  const navigate = useNavigate();
  const { library } = useLibrary();
  const { prefs, updatePrefs, signOut } = useReadySession();
  const { refresh } = useRefresh();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to);
    const list: Command[] = [
      { id: 'go-digest', group: 'Go to', label: 'Digest', hint: 'g d', run: go('/app/digest') },
      { id: 'go-all', group: 'Go to', label: 'All articles', hint: 'g h', run: go('/app') },
      { id: 'go-unread', group: 'Go to', label: 'Unread', hint: 'g u', run: go('/app/unread') },
      { id: 'go-saved', group: 'Go to', label: 'Saved', hint: 'g s', run: go('/app/saved') },
      { id: 'go-discover', group: 'Go to', label: 'Discover feeds', hint: 'g c', run: go('/app/discover') },
      { id: 'go-feeds', group: 'Go to', label: 'Manage feeds', hint: 'g f', run: go('/app/feeds') },
      { id: 'go-settings', group: 'Go to', label: 'Settings', run: go('/app/settings') },
      ...(library?.categories.map((c) => ({ id: `cat-${c.id}`, group: 'Categories', label: c.name, hint: c.unread ? `${c.unread} unread` : undefined, run: go(`/app/category/${c.id}`), keywords: 'category' })) ?? []),
      ...(library?.feeds.map((f) => ({ id: `feed-${f.id}`, group: 'Feeds', label: f.title, hint: f.unread ? `${f.unread} unread` : undefined, run: go(`/app/feed/${f.id}`), keywords: 'feed source' })) ?? []),
      ...(['compact', 'comfortable', 'cards', 'magazine'] as Layout[]).map((l) => ({ id: `layout-${l}`, group: 'Layout', label: `Layout: ${l === 'comfortable' ? 'List' : l[0]?.toUpperCase() + l.slice(1)}`, run: () => void updatePrefs({ layout: l }), keywords: 'view' })),
      ...(['system', 'light', 'dark'] as ThemePref[]).map((t) => ({ id: `theme-${t}`, group: 'Appearance', label: `Theme: ${t[0]?.toUpperCase() + t.slice(1)}`, run: () => void updatePrefs({ theme: t }), keywords: 'dark mode appearance' })),
      { id: 'pane', group: 'Actions', label: `Reader pane: turn ${prefs.split_reader ? 'off' : 'on'}`, run: () => void updatePrefs({ split_reader: !prefs.split_reader }) },
      { id: 'refresh', group: 'Actions', label: 'Refresh all feeds', run: () => void refresh() },
      { id: 'shortcuts', group: 'Actions', label: 'Keyboard shortcuts', hint: '?', run: onShortcuts },
      { id: 'signout', group: 'Actions', label: 'Sign out', run: () => void signOut().then(() => navigate('/')) },
    ];
    return list;
  }, [library, navigate, prefs.split_reader, updatePrefs, refresh, onShortcuts, signOut]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => c.group !== 'Feeds' && c.group !== 'Layout' && c.group !== 'Appearance');
    const tokens = q.split(/\s+/);
    const matched = commands.filter((c) => { const hay = `${c.label} ${c.group} ${c.keywords ?? ''}`.toLowerCase(); return tokens.every((t) => hay.includes(t)); });
    const search: Command = { id: 'search', group: 'Search', label: `Search articles for “${query.trim()}”`, run: () => navigate(`/app/search?q=${encodeURIComponent(query.trim())}`) };
    return [search, ...matched.slice(0, 40)];
  }, [commands, query, navigate]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [active]);

  const run = (c: Command | undefined) => { if (!c) return; onClose(); window.setTimeout(c.run, 0); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(results[active]); }
  };

  let lastGroup = '';
  return (
    <Dialog title="Command palette" onClose={onClose}>
      <div className="palette">
        <div className="palette-input">
          <Search size={18} aria-hidden />
          <input
            data-autofocus role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={results[active] ? `cmd-${results[active].id}` : undefined}
            aria-label="Type a command, category or feed" placeholder="Type a command, category or feed…" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false}
            onKeyDown={onKey}
          />
        </div>
        <ul id="palette-list" role="listbox" aria-label="Commands" ref={listRef} className="palette-list">
          {results.map((c, i) => {
            const header = c.group !== lastGroup ? (lastGroup = c.group) : null;
            return (
              <li key={c.id} role="presentation">
                {header && <div className="palette-group" role="presentation">{header}</div>}
                <div id={`cmd-${c.id}`} role="option" aria-selected={i === active} tabIndex={-1} className={`palette-item ${i === active ? 'is-active' : ''}`} onMouseMove={() => setActive(i)} onClick={() => run(c)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(c); } }}>
                  <span>{c.label}</span>{c.hint && <kbd>{c.hint}</kbd>}
                </div>
              </li>
            );
          })}
          {results.length === 0 && <li className="palette-empty" role="presentation">Nothing matches “{query}”.</li>}
        </ul>
      </div>
    </Dialog>
  );
}

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const rows: [string, string][] = [
    ['j / k', 'Next / previous article'],
    ['o or Enter', 'Open the selected article'],
    ['v', 'Open the original in a new tab'],
    ['s', 'Save or unsave'],
    ['m', 'Mark read or unread'],
    ['Esc', 'Close the reader'],
    ['/', 'Focus search'],
    ['g then h', 'Go to all articles'],
    ['g then u', 'Go to unread'],
    ['g then s', 'Go to saved'],
    ['g then f', 'Go to feeds'],
    ['g then d', 'Go to the digest'],
    ['Ctrl / ⌘ + K', 'Command palette'],
    ['?', 'Show this list'],
  ];
  return (
    <Dialog title="Keyboard shortcuts" onClose={onClose} labelledBy="shortcuts-title">
      <div className="shortcuts">
        <h2 id="shortcuts-title">Keyboard shortcuts</h2>
        <dl>{rows.map(([k, d]) => (<div key={k}><dt>{k.split(' ').map((p, i) => (['then', 'or', '+'].includes(p) ? <span key={i} className="kbd-sep"> {p} </span> : <kbd key={i}>{p}</kbd>))}</dt><dd>{d}</dd></div>))}</dl>
      </div>
    </Dialog>
  );
}
