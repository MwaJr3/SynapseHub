import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { errorMessage, plural } from '../lib/format';
import { useLibrary } from './library';
import { useSession } from './session';
import { useToast } from './toast';

interface RefreshApi {
  refreshing: boolean;
  /** Increments after every completed refresh so views can look for new articles. */
  tick: number;
  refresh: (opts?: { silent?: boolean; categoryId?: number }) => Promise<void>;
}

const RefreshContext = createContext<RefreshApi | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const { state } = useSession();
  const { reload, setLastRefresh } = useLibrary();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const running = useRef(false);

  const refresh = useCallback<RefreshApi['refresh']>(async ({ silent, categoryId } = {}) => {
    if (running.current) return;
    running.current = true;
    setRefreshing(true);
    try {
      const summary = await api.refreshAll({ category_id: categoryId });
      setLastRefresh(summary.at);
      await reload();
      setTick((t) => t + 1);
      if (!silent) {
        const parts = [summary.new_items ? `${plural(summary.new_items, 'new article')}` : 'You’re up to date'];
        if (summary.errors) parts.push(`${plural(summary.errors, 'feed')} couldn’t be reached`);
        toast.show(parts.join(' · '), { tone: summary.errors ? 'info' : 'success' });
      }
    } catch (err) {
      if (!silent) toast.show(errorMessage(err), { tone: 'error' });
    } finally {
      running.current = false;
      setRefreshing(false);
    }
  }, [reload, setLastRefresh, toast]);

  const minutes = state.status === 'ready' ? state.prefs.refresh_minutes : 0;
  useEffect(() => {
    if (!minutes) return;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh({ silent: true }); }, minutes * 60_000);
    return () => window.clearInterval(id);
  }, [minutes, refresh]);

  const value = useMemo(() => ({ refreshing, tick, refresh }), [refreshing, tick, refresh]);
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}

export function useRefresh(): RefreshApi {
  const ctx = useContext(RefreshContext);
  if (!ctx) throw new Error('useRefresh must be used inside RefreshProvider');
  return ctx;
}
