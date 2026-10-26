import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ItemQuery } from './api';
import { errorMessage } from './format';
import type { Item } from '../types';

export function useMedia(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, [query]);
  return matches;
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"][aria-modal="true"]') !== null;
}

export interface ItemList {
  items: Item[];
  total: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadedAt: string;
  loadMore: () => void;
  reload: () => void;
  patch: (id: number, change: Partial<Item>) => void;
  remove: (id: number) => void;
  insert: (item: Item) => void;
  markAllLocal: (read: boolean) => void;
}

/** Cursor-paginated list. A new `key` (filters changed) aborts in-flight work and starts over. */
export function useItemList(query: ItemQuery | null, key: string): ItemList {
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<ItemList['status']>(query ? 'loading' : 'idle');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState(() => new Date().toISOString());
  const [nonce, setNonce] = useState(0);
  const abort = useRef<AbortController | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;
  const busy = useRef(false);

  useEffect(() => {
    abort.current?.abort();
    busy.current = false;
    setLoadingMore(false);
    const q = queryRef.current;
    if (!q) {
      setItems([]); setTotal(0); setCursor(null); setStatus('idle'); setError(null);
      return;
    }
    const ctl = new AbortController();
    abort.current = ctl;
    setStatus('loading');
    setError(null);
    const stamp = new Date().toISOString();
    api.items({ ...q, limit: 40 }, ctl.signal)
      .then((page) => {
        setItems(page.items); setTotal(page.total); setCursor(page.next_cursor); setStatus('ready'); setLoadedAt(stamp);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(errorMessage(err)); setStatus('error');
      });
    return () => ctl.abort();
  }, [key, nonce]);

  const loadMore = useCallback(() => {
    const q = queryRef.current;
    if (!q || !cursor || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    const ctl = abort.current;
    api.items({ ...q, cursor, limit: 40 }, ctl?.signal)
      .then((page) => {
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
        });
        setCursor(page.next_cursor);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(errorMessage(err));
      })
      .finally(() => { busy.current = false; setLoadingMore(false); });
  }, [cursor]);

  return {
    items, total, status, loadingMore, error, hasMore: cursor !== null, loadedAt, loadMore,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    patch: useCallback((id, change) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change } : i))), []),
    remove: useCallback((id) => { setItems((prev) => prev.filter((i) => i.id !== id)); setTotal((t) => Math.max(0, t - 1)); }, []),
    insert: useCallback((item) => { setItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev])); setTotal((t) => t + 1); }, []),
    markAllLocal: useCallback((read) => setItems((prev) => prev.map((i) => ({ ...i, is_read: read }))), []),
  };
}
