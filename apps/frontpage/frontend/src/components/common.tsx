import { useEffect, useRef, useState, type ReactNode, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Loader2, X } from 'lucide-react';
import { highlightParts, hueFor } from '../lib/format';

export function Spinner({ label, size = 16 }: { label?: string; size?: number }) {
  return (
    <span className="spinner" role={label ? 'status' : undefined} aria-label={label}>
      <Loader2 size={size} aria-hidden />
    </span>
  );
}

/** Source favicon with a deterministic monogram fallback, so there are never broken-image boxes. */
export function FeedIcon({ id, title, src, size = 18 }: { id: number; title: string; src: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const style = { width: size, height: size } as const;
  if (src && !failed) {
    return <img className="feed-icon" style={style} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} referrerPolicy="no-referrer" />;
  }
  const hue = hueFor(id);
  return (
    <span className="feed-icon feed-icon-mono" style={{ ...style, fontSize: Math.round(size * 0.58), background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 60% 28%)` }} aria-hidden>
      {(title.trim()[0] ?? '·').toUpperCase()}
    </span>
  );
}

export function Highlight({ text, query }: { text: string; query?: string }) {
  if (!query?.trim()) return <>{text}</>;
  return (
    <>
      {highlightParts(text, query).map((p, i) => (p.match ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  );
}

export function Count({ n, label }: { n: number; label?: string }) {
  if (n <= 0) return null;
  return (
    <span className="count" aria-label={label ?? `${n} unread`}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

export function EmptyState({ icon, title, children, actions }: { icon?: ReactNode; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="empty">
      {icon && <div className="empty-icon" aria-hidden>{icon}</div>}
      <h2>{title}</h2>
      {children && <div className="empty-body">{children}</div>}
      {actions && <div className="empty-actions">{actions}</div>}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice notice-error" role="alert">
      <span>{message}</span>
      {onRetry && <button className="btn btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
}) {
  const onKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = options.findIndex((o) => o.value === value);
    const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = options[(next + options.length) % options.length];
    if (target) onChange(target.value);
  };
  return (
    <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={`seg ${o.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Accessible modal: traps focus, closes on Escape / backdrop, restores focus on close. */
export function Dialog({ title, onClose, children, wide, labelledBy }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>('[data-autofocus]') ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => previous?.focus?.();
  }, []);
  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !ref.current) return;
    const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0], last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`dialog ${wide ? 'dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy} onKeyDown={onKey}>
        {children}
        <button className="icon-btn dialog-close" aria-label="Close dialog" onClick={onClose}><X size={18} aria-hidden /></button>
      </div>
    </div>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden />;
}

export function ItemSkeletons({ layout, count = 8 }: { layout: string; count?: number }) {
  const grid = layout === 'cards' || layout === 'magazine';
  return (
    <div className={grid ? `items items-${layout}` : 'items items-list'} aria-busy="true" aria-label="Loading articles">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`skeleton-row skeleton-${layout}`}>
          {layout !== 'compact' && grid && <Skeleton className="skeleton-img" />}
          <div className="skeleton-lines">
            <Skeleton style={{ width: '28%', height: 10 }} />
            <Skeleton style={{ width: `${70 + ((i * 7) % 25)}%`, height: layout === 'compact' ? 12 : 16 }} />
            {layout !== 'compact' && <Skeleton style={{ width: '92%', height: 11 }} />}
            {layout !== 'compact' && <Skeleton style={{ width: '64%', height: 11 }} />}
          </div>
        </div>
      ))}
    </div>
  );
}
