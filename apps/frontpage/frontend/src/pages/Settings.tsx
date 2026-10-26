import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { LAYOUTS } from '../components/LayoutMenu';
import { Segmented } from '../components/common';
import { useReadySession } from '../state/session';
import type { DigestWindow, Layout, Prefs, ThemePref } from '../types';

export function SettingsPage() {
  const { prefs, user, updatePrefs, signOut } = useReadySession();
  const navigate = useNavigate();
  const r = prefs.reader;
  const setReader = (patch: Partial<Prefs['reader']>) => void updatePrefs({ reader: { ...r, ...patch } });
  return (
    <div className="page settings">
      <header className="page-head"><h1>Settings</h1></header>

      <section aria-labelledby="s-look">
        <h2 id="s-look" className="section-title">Appearance</h2>
        <div className="field-row"><span className="field-label" id="theme-l">Theme</span>
          <Segmented<ThemePref> label="Theme" value={prefs.theme} onChange={(theme) => void updatePrefs({ theme })} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        </div>
        <div className="field-row"><span className="field-label">Default layout</span>
          <Segmented<Layout> label="Default layout" value={prefs.layout} onChange={(layout) => void updatePrefs({ layout })} options={LAYOUTS.map((l) => ({ value: l.value, label: l.label, icon: l.icon }))} />
        </div>
        <label className="check"><input type="checkbox" checked={prefs.split_reader} onChange={(e) => void updatePrefs({ split_reader: e.target.checked })} /><span>Show articles in a side pane on wide screens (list layouts)</span></label>
        {Object.keys(prefs.category_layouts).length > 0 && (
          <p className="muted">{Object.keys(prefs.category_layouts).length} categor{Object.keys(prefs.category_layouts).length === 1 ? 'y has its' : 'ies have their'} own layout. <button className="link-btn" onClick={() => void updatePrefs({ category_layouts: {} })}>Reset to default</button></p>
        )}
      </section>

      <section aria-labelledby="s-read">
        <h2 id="s-read" className="section-title">Reading</h2>
        <div className="field-row"><span className="field-label" id="fs-l">Text size</span>
          <div className="stepper" role="group" aria-labelledby="fs-l">
            <button className="icon-btn icon-btn-sm" aria-label="Smaller text" onClick={() => setReader({ font_size: Math.max(14, r.font_size - 1) })}><Minus size={14} aria-hidden /></button>
            <output aria-live="polite">{r.font_size}px</output>
            <button className="icon-btn icon-btn-sm" aria-label="Larger text" onClick={() => setReader({ font_size: Math.min(28, r.font_size + 1) })}><Plus size={14} aria-hidden /></button>
          </div>
        </div>
        <div className="field-row"><span className="field-label">Typeface</span>
          <Segmented label="Typeface" value={r.serif ? 'serif' : 'sans'} onChange={(v) => setReader({ serif: v === 'serif' })} options={[{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }]} />
        </div>
        <div className="field-row"><span className="field-label">Line height</span>
          <Segmented label="Line height" value={String(r.line_height)} onChange={(v) => setReader({ line_height: Number(v) })} options={[{ value: '1.5', label: 'Snug' }, { value: '1.7', label: 'Normal' }, { value: '1.95', label: 'Airy' }]} />
        </div>
        <div className="field-row"><span className="field-label">Line length</span>
          <Segmented label="Line length" value={r.width} onChange={(width) => setReader({ width })} options={[{ value: 'narrow', label: 'Narrow' }, { value: 'medium', label: 'Medium' }, { value: 'wide', label: 'Wide' }]} />
        </div>
        <div className="reader-sample prose" style={{ ['--reader-size' as string]: `${r.font_size}px`, ['--reader-leading' as string]: String(r.line_height), ['--reader-font' as string]: r.serif ? 'var(--font-serif)' : 'var(--font-sans)', ['--reader-width' as string]: r.width === 'narrow' ? '34rem' : r.width === 'wide' ? '60rem' : 'var(--content-max-width)' }}>
          <p>Preview: good reading comfort comes from a size you don’t have to squint at, room between lines, and a line length your eye can follow.</p>
        </div>
      </section>

      <section aria-labelledby="s-refresh">
        <h2 id="s-refresh" className="section-title">Updates</h2>
        <div className="field-row"><span className="field-label">Refresh feeds automatically</span>
          <Segmented label="Auto-refresh interval" value={String(prefs.refresh_minutes)} onChange={(v) => void updatePrefs({ refresh_minutes: Number(v) as Prefs['refresh_minutes'] })}
            options={[{ value: '15', label: '15 min' }, { value: '30', label: '30 min' }, { value: '60', label: '1 hour' }, { value: '0', label: 'Manual' }]} />
        </div>
        <div className="field-row"><span className="field-label">Digest covers</span>
          <Segmented<DigestWindow> label="Digest window" value={prefs.digest_window} onChange={(digest_window) => void updatePrefs({ digest_window })} options={[{ value: 'since_visit', label: 'Since last visit' }, { value: '24h', label: '24 hours' }, { value: '7d', label: '7 days' }]} />
        </div>
      </section>

      <section aria-labelledby="s-account">
        <h2 id="s-account" className="section-title">Account</h2>
        {user.is_guest ? (
          <p>You’re in a temporary guest session. <Link to="/sign-up">Create an account</Link> to keep your feeds, read state and settings, and to add your own sources.</p>
        ) : (
          <p>Signed in as <strong>{user.email}</strong>.</p>
        )}
        <button className="btn" onClick={async () => { await signOut(); navigate('/', { replace: true }); }}>Sign out</button>
      </section>
    </div>
  );
}
