import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bookmark, BookmarkCheck, ChevronDown, ChevronUp, Circle, CircleDot, ExternalLink, Minus, Plus, Type, X } from 'lucide-react';
import { api } from '../lib/api';
import { errorMessage, fullDate, hostname, relativeTime } from '../lib/format';
import type { Item, ReaderPrefs } from '../types';
import { FeedIcon, Segmented, Skeleton } from './common';

const cache = new Map<number, Item>();

interface Props {
  item: Item;
  prefs: ReaderPrefs;
  mode: 'pane' | 'overlay';
  hasPrev: boolean;
  hasNext: boolean;
  position?: string;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
  onToggleSave: (item: Item) => void;
  onToggleRead: (item: Item) => void;
  onOriginal: (item: Item) => void;
  onPrefs: (reader: ReaderPrefs) => void;
}

export function Reader({ item, prefs, mode, hasPrev, hasNext, position, onPrev, onNext, onClose, onToggleSave, onToggleRead, onOriginal, onPrefs }: Props) {
  const [full, setFull] = useState<Item | null>(cache.get(item.id) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [showType, setShowType] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    const hit = cache.get(item.id);
    setFull(hit ?? null);
    if (!hit) {
      api.item(item.id).then((data) => { cache.set(item.id, data); if (cache.size > 60) cache.delete(cache.keys().next().value as number); if (alive) setFull(data); })
        .catch((err) => alive && setError(errorMessage(err)));
    }
    scrollRef.current?.scrollTo({ top: 0 });
    return () => { alive = false; };
  }, [item.id]);

  // Feed HTML is sanitised server-side; here we only make it behave: lazy images, safe external links.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    root.querySelectorAll('img').forEach((img) => { img.loading = 'lazy'; img.decoding = 'async'; img.referrerPolicy = 'no-referrer'; });
    root.querySelectorAll('a[href]').forEach((a) => { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer nofollow'); });
  }, [full]);

  const html = full?.content_html?.trim();
  const live = full ? { ...full, is_read: item.is_read, is_bookmarked: item.is_bookmarked } : item;
  const style = {
    '--reader-size': `${prefs.font_size}px`,
    '--reader-leading': String(prefs.line_height),
    '--reader-font': prefs.serif ? 'var(--font-serif)' : 'var(--font-sans)',
    '--reader-width': prefs.width === 'narrow' ? '34rem' : prefs.width === 'wide' ? '60rem' : 'var(--content-max-width)',
  } as React.CSSProperties;

  return (
    <section className={`reader reader-${mode}`} aria-label="Article reader" style={style}>
      <header className="reader-bar">
        <button className="icon-btn" onClick={onClose} aria-label={mode === 'overlay' ? 'Close reader' : 'Close reader pane'} title="Close (Esc)">
          {mode === 'overlay' ? <ArrowLeft size={20} aria-hidden /> : <X size={20} aria-hidden />}
        </button>
        <div className="reader-nav" role="group" aria-label="Article navigation">
          <button className="icon-btn" onClick={onPrev} disabled={!hasPrev} aria-label="Previous article" title="Previous (k)"><ChevronUp size={20} aria-hidden /></button>
          <button className="icon-btn" onClick={onNext} disabled={!hasNext} aria-label="Next article" title="Next (j)"><ChevronDown size={20} aria-hidden /></button>
          {position && <span className="reader-position" aria-live="polite">{position}</span>}
        </div>
        <span className="spacer" />
        <button className="icon-btn" aria-pressed={live.is_bookmarked} onClick={() => onToggleSave(live)} aria-label={live.is_bookmarked ? 'Remove from saved' : 'Save for later'} title="Save (s)">
          {live.is_bookmarked ? <BookmarkCheck size={20} aria-hidden /> : <Bookmark size={20} aria-hidden />}
        </button>
        <button className="icon-btn" onClick={() => onToggleRead(live)} aria-label={live.is_read ? 'Mark as unread' : 'Mark as read'} title="Toggle read (m)">
          {live.is_read ? <Circle size={20} aria-hidden /> : <CircleDot size={20} aria-hidden />}
        </button>
        <div className="popover-anchor">
          <button className="icon-btn" aria-expanded={showType} aria-controls="reader-type" onClick={() => setShowType((v) => !v)} aria-label="Reading preferences" title="Reading preferences"><Type size={20} aria-hidden /></button>
          {showType && (
            <div className="popover" id="reader-type">
              <div className="field-row">
                <span className="field-label" id="size-label">Text size</span>
                <div className="stepper" role="group" aria-labelledby="size-label">
                  <button className="icon-btn icon-btn-sm" aria-label="Smaller text" onClick={() => onPrefs({ ...prefs, font_size: Math.max(14, prefs.font_size - 1) })}><Minus size={14} aria-hidden /></button>
                  <output aria-live="polite">{prefs.font_size}px</output>
                  <button className="icon-btn icon-btn-sm" aria-label="Larger text" onClick={() => onPrefs({ ...prefs, font_size: Math.min(28, prefs.font_size + 1) })}><Plus size={14} aria-hidden /></button>
                </div>
              </div>
              <div className="field-row"><span className="field-label">Typeface</span>
                <Segmented label="Typeface" value={prefs.serif ? 'serif' : 'sans'} options={[{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }]} onChange={(v) => onPrefs({ ...prefs, serif: v === 'serif' })} />
              </div>
              <div className="field-row"><span className="field-label">Line height</span>
                <Segmented label="Line height" value={String(prefs.line_height)} options={[{ value: '1.5', label: 'Snug' }, { value: '1.7', label: 'Normal' }, { value: '1.95', label: 'Airy' }]} onChange={(v) => onPrefs({ ...prefs, line_height: Number(v) })} />
              </div>
              <div className="field-row"><span className="field-label">Line length</span>
                <Segmented label="Line length" value={prefs.width} options={[{ value: 'narrow', label: 'Narrow' }, { value: 'medium', label: 'Medium' }, { value: 'wide', label: 'Wide' }]} onChange={(v) => onPrefs({ ...prefs, width: v })} />
              </div>
            </div>
          )}
        </div>
        {item.url && <a className="btn btn-sm btn-primary reader-original" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOriginal(live)}>Original <ExternalLink size={14} aria-hidden /></a>}
      </header>

      <div className="reader-scroll" ref={scrollRef}>
        <article className="reader-article">
          <div className="reader-source"><FeedIcon id={item.feed_id} title={item.feed_title} src={item.feed_icon} size={18} /><span>{item.feed_title}</span></div>
          <h1 className="reader-title">{item.title}</h1>
          <p className="reader-meta">
            {item.author && <span>{item.author}</span>}
            <time dateTime={item.published_at ?? undefined} title={fullDate(item.published_at)}>{item.published_at ? relativeTime(item.published_at) : 'No date'}</time>
            {item.url && <span>{hostname(item.url)}</span>}
          </p>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          {!full && !error && (
            <div className="reader-loading" aria-busy="true" aria-label="Loading article">
              {[92, 100, 86, 97, 60].map((w, i) => <Skeleton key={i} style={{ width: `${w}%`, height: 14, marginBottom: 12 }} />)}
            </div>
          )}
          {full && html && <div ref={bodyRef} className="prose" dangerouslySetInnerHTML={{ __html: html }} />}
          {full && !html && (
            <div className="reader-excerpt">
              {item.summary && <p className="prose-lead">{item.summary}</p>}
              <div className="notice">
                <p><strong>This feed only shares an excerpt.</strong> The full article lives on {hostname(item.url) || 'the original site'}.</p>
                {item.url && <a className="btn btn-primary" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => onOriginal(live)}>Read the full article <ExternalLink size={16} aria-hidden /></a>}
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
