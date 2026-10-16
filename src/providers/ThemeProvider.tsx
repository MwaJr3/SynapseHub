import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyTheme,
  persistPreference,
  readStoredPreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const prefersDarkQuery = '(prefers-color-scheme: dark)';

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Theme state for the three preferences. The initial value is read from the
 * pre-paint script in `index.html` (via `data-theme-preference`), which is what
 * prevents a flash of the wrong theme; this provider then keeps the storage,
 * the `<html>` class and the operating-system listener in sync.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof document !== 'undefined') {
      const fromMarkup = document.documentElement.dataset.themePreference;
      if (
        fromMarkup === 'light' ||
        fromMarkup === 'dark' ||
        fromMarkup === 'system'
      ) {
        return fromMarkup;
      }
    }
    return readStoredPreference(getStorage());
  });

  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    )
      return false;
    return window.matchMedia(prefersDarkQuery).matches;
  });

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    )
      return undefined;

    const media = window.matchMedia(prefersDarkQuery);
    const listener = (event: MediaQueryListEvent) =>
      setSystemPrefersDark(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolved = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    applyTheme(resolved, document.documentElement);
    document.documentElement.dataset.themePreference = preference;
  }, [preference, resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    persistPreference(next, getStorage());
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
