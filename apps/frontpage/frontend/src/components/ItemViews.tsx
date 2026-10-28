import { forwardRef, memo, type MouseEvent } from 'react';
import { Bookmark, BookmarkCheck, ExternalLink, FileText, Circle, CircleDot } from 'lucide-react';
import type { Item, Layout } from '../types';
import { fullDate, relativeTime } from '../lib/format';
import { FeedIcon, Highlight } from './common';

export interface ItemHandlers {
  onOpen: (item: Item) => void;
  onToggleSave: (item: Item) => void;
  onToggleRead: (item: Item) => void;
  onOriginal: (item: Item) => void;
}

interface RowProps extends ItemHandlers {
  item: Item;
  selected: boolean;
  active: boolean;
  query?: string;
  layout: Layout;
  showFeed?: boolean;
  hero?: boolean;
}

function stop(e: MouseEvent) { e.stopPropagation(); }

/** Attaches the broken-image fallback without an interaction handler on the non-interactive <img>. */
function hideBrokenImage(el: HTMLImageElement | null) {
  el?.addEventListener('error', () => { el.style.display = 'none'; }, { once: true });
}

function Actions({ item, onToggleSave, onToggleRead, onOriginal }: ItemHandlers & { item: Item }) {
  return (
    <div className="item-actions" role="presentation" onClick={stop}>
      <button className="icon-btn icon-btn-sm" aria-pressed={item.is_bookmarked} aria-label={item.is_bookmarked ? 'Remove from saved' : 'Save for later'} title={item.is_bookmarked ? 'Remove from saved (s)' : 'Save for later (s)'} onClick={() => onToggleSave(item)}>
        {item.is_bookmarked ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />}
      </button>
      <button className="icon-btn icon-btn-sm" aria-label={item.is_read ? 'Mark as unread' : 'Mark as read'} title={item.is_read ? 'Mark as unread (m)' : 'Mark as read (m)'} onClick={() => onToggleRead(item)}>
        {item.is_read ? <Circle size={16} aria-hidden /> : <CircleDot size={16} aria-hidden />}
      </button>
      {item.url && (
        <button className="icon-btn icon-btn-sm" aria-label="Open original in a new tab" title="Open original (v)" onClick={() => onOriginal(item)}>
          <ExternalLink size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}

function Meta({ item }: { item: Item }) {
  return (
    <>
      <span className="meta-source">{item.feed_title}</span>
      <span aria-hidden className="meta-dot">·</span>
      <time dateTime={item.published_at ?? undefined} title={fullDate(item.published_at)}>{relativeTime(item.published_at)}</time>
      {item.has_full_content && <span className="meta-reader" title="Full article available in the reader"><FileText size={12} aria-hidden /><span className="sr-only">Full article available</span></span>}
    </>
  );
}

function Thumb({ item }: { item: Item }) {
  if (!item.image_url) return null;
  return <img ref={hideBrokenImage} className="thumb" src={item.image_url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
}

export const ItemRow = memo(forwardRef<HTMLDivElement, RowProps>(function ItemRow(props, ref) {
  const { item, selected, active, query, layout, onOpen, hero } = props;
  const cls = ['item', `item-${layout}`, item.is_read ? 'is-read' : 'is-unread', selected ? 'is-selected' : '', active ? 'is-active' : '', hero ? 'item-hero' : ''].filter(Boolean).join(' ');
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); }
  };
  return (
    <div
      ref={ref}
      role="button"
      className={cls}
      data-item-id={item.id}
      tabIndex={selected ? 0 : -1}
      aria-label={`${item.is_read ? '' : 'Unread: '}${item.title}`}
      aria-current={active ? 'true' : undefined}
      onClick={() => onOpen(item)}
      onKeyDown={handleKey}
    >
      {layout === 'compact' ? (
        <>
          <span className={`unread-dot ${item.is_read ? 'is-read' : ''}`} aria-hidden />
          <FeedIcon id={item.feed_id} title={item.feed_title} src={item.feed_icon} size={16} />
          <span className="compact-source">{item.feed_title}</span>
          <h3 className="item-title"><Highlight text={item.title} query={query} /></h3>
          <time className="compact-time" dateTime={item.published_at ?? undefined} title={fullDate(item.published_at)}>{relativeTime(item.published_at)}</time>
          {item.is_bookmarked && <BookmarkCheck size={14} className="saved-flag" aria-label="Saved" />}
          <Actions {...props} />
        </>
      ) : (
        <>
          <span className={`unread-dot ${item.is_read ? 'is-read' : ''}`} aria-hidden />
          <div className="item-main">
            {(layout === 'cards' || layout === 'magazine') && <Thumb item={item} />}
            <div className="item-meta"><FeedIcon id={item.feed_id} title={item.feed_title} src={item.feed_icon} size={16} /><Meta item={item} />{item.is_bookmarked && <BookmarkCheck size={13} className="saved-flag" aria-label="Saved" />}</div>
            <h3 className="item-title"><Highlight text={item.title} query={query} /></h3>
            {item.summary && <p className="item-excerpt"><Highlight text={item.summary} query={query} /></p>}
          </div>
          {layout === 'comfortable' && item.image_url && <Thumb item={item} />}
          <Actions {...props} />
        </>
      )}
    </div>
  );
}));
