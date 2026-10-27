import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { Category, Feed, Item, Library } from '../types';
import { useSession } from './session';

interface LibraryApi {
  library: Library | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  reloadSoon: () => void;
  /** Optimistically adjust counters after a read/bookmark change; a debounced reload then reconciles. */
  applyItemChange: (item: Pick<Item, 'feed_id' | 'category_id'>, change: { read?: boolean; bookmarked?: boolean }) => void;
  feedById: (id: number) => Feed | undefined;
  categoryById: (id: number) => Category | undefined;
  lastRefresh: string | null;
  setLastRefresh: (iso: string) => void;
}

const LibraryContext = createContext<LibraryApi | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const userId = state.status === 'ready' ? state.user.id : null;
  const [library, setLibrary] = useState<Library | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const reload = useCallback(async () => {
    try {
      const lib = await api.library();
      setLibrary(lib);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your library.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadSoon = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void reload(), 700);
  }, [reload]);

  useEffect(() => {
    setLibrary(null);
    setLoading(true);
    if (userId !== null) void reload();
    return () => window.clearTimeout(timer.current);
  }, [userId, reload]);

  const applyItemChange = useCallback<LibraryApi['applyItemChange']>((item, change) => {
    setLibrary((lib) => {
      if (!lib) return lib;
      const dUnread = change.read === undefined ? 0 : change.read ? -1 : 1;
      const dSaved = change.bookmarked === undefined ? 0 : change.bookmarked ? 1 : -1;
      const clamp = (n: number) => Math.max(0, n);
      return {
        ...lib,
        feeds: lib.feeds.map((f) => (f.id === item.feed_id ? { ...f, unread: clamp(f.unread + dUnread) } : f)),
        categories: lib.categories.map((c) => (c.id === item.category_id ? { ...c, unread: clamp(c.unread + dUnread) } : c)),
        uncategorized: item.category_id === null ? { ...lib.uncategorized, unread: clamp(lib.uncategorized.unread + dUnread) } : lib.uncategorized,
        totals: { ...lib.totals, unread: clamp(lib.totals.unread + dUnread), saved: clamp(lib.totals.saved + dSaved) },
      };
    });
    reloadSoon();
  }, [reloadSoon]);

  const value = useMemo<LibraryApi>(() => ({
    library, loading, error, reload, reloadSoon, applyItemChange, lastRefresh, setLastRefresh,
    feedById: (id) => library?.feeds.find((f) => f.id === id),
    categoryById: (id) => library?.categories.find((c) => c.id === id),
  }), [library, loading, error, reload, reloadSoon, applyItemChange, lastRefresh]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryApi {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider');
  return ctx;
}
