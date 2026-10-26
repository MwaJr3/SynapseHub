import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, onUnauthorized } from '../lib/api';
import type { Prefs, ThemePref, User } from '../types';
import { useToast } from './toast';

type SessionState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'ready'; user: User; prefs: Prefs };

interface SessionApi {
  state: SessionState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  startGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePrefs: (patch: Partial<Prefs>) => Promise<void>;
  reload: () => Promise<void>;
  markOnboarded: () => void;
}

const SessionContext = createContext<SessionApi | null>(null);

export function applyTheme(theme: ThemePref) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  try {
    if (theme === 'system') localStorage.removeItem('fp-theme');
    else localStorage.setItem('fp-theme', theme);
  } catch {
    /* storage can be unavailable (private mode); the theme still applies for this visit */
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const toast = useToast();

  const reload = useCallback(async () => {
    try {
      const { user, prefs } = await api.me();
      setState({ status: 'ready', user, prefs });
      applyTheme(prefs.theme);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setState({ status: 'anon' });
      else setState({ status: 'anon' });
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => onUnauthorized(() => setState((s) => (s.status === 'ready' ? { status: 'anon' } : s))), []);

  const signIn = useCallback(async (email: string, password: string) => {
    await api.login({ email, password });
    await reload();
  }, [reload]);
  const signUp = useCallback(async (email: string, password: string, name: string) => {
    await api.register({ email, password, display_name: name.trim() || undefined });
    await reload();
  }, [reload]);
  const startGuest = useCallback(async () => {
    await api.guest();
    await reload();
  }, [reload]);
  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* the cookie is cleared server-side on a best-effort basis */ }
    setState({ status: 'anon' });
  }, []);

  const updatePrefs = useCallback(async (patch: Partial<Prefs>) => {
    let previous: Prefs | null = null;
    setState((s) => {
      if (s.status !== 'ready') return s;
      previous = s.prefs;
      return { ...s, prefs: { ...s.prefs, ...patch, reader: { ...s.prefs.reader, ...(patch.reader ?? {}) } } };
    });
    if (patch.theme) applyTheme(patch.theme);
    try {
      const { prefs } = await api.savePrefs(patch);
      setState((s) => (s.status === 'ready' ? { ...s, prefs } : s));
    } catch (err) {
      const back = previous as Prefs | null;
      if (back) {
        setState((s) => (s.status === 'ready' ? { ...s, prefs: back } : s));
        applyTheme(back.theme);
      }
      toast.show(err instanceof Error ? err.message : "Couldn't save that setting.", { tone: 'error' });
    }
  }, [toast]);

  const markOnboarded = useCallback(() => {
    setState((s) => (s.status === 'ready' ? { ...s, user: { ...s.user, onboarded: true } } : s));
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signUp, startGuest, signOut, updatePrefs, reload, markOnboarded }),
    [state, signIn, signUp, startGuest, signOut, updatePrefs, reload, markOnboarded],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** For routes that only render once the session is ready. */
export function useReadySession() {
  const s = useSession();
  if (s.state.status !== 'ready') throw new Error('Session is not ready');
  return { ...s, user: s.state.user, prefs: s.state.prefs };
}
