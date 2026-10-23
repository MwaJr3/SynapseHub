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
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  applyTheme,
  parseThemeMode,
  readStoredTheme,
  resolveTheme,
  writeStoredTheme,
  type ResolvedTheme,
  type ThemeMode,
} from '@/lib/theme';

interface ThemeContextValue {
  /** What the visitor selected. */
  mode: ThemeMode;
  /** What is actually rendered right now. */
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Quick toggle used by the nav control: light -> dark -> system -> hybrid. */
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const cycleOrder: ThemeMode[] = ['hybrid', 'light', 'dark', 'system'];

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME_MODE;
    return readStoredTheme(safeStorage());
  });
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );

  // Keep the document in sync with the current mode.
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Follow OS changes while in `system` mode.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    setSystemDark(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Follow changes made in another tab.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        setModeState(parseThemeMode(event.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    writeStoredTheme(next, safeStorage());
  }, []);

  const cycleMode = useCallback(() => {
    const index = cycleOrder.indexOf(mode);
    setMode(cycleOrder[(index + 1) % cycleOrder.length] ?? DEFAULT_THEME_MODE);
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(() => {
    const resolved: ResolvedTheme =
      mode === 'system' ? (systemDark ? 'dark' : 'light') : resolveTheme(mode);
    return { mode, resolved, setMode, cycleMode };
  }, [mode, systemDark, setMode, cycleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* The provider and its consumer hook must live in the same module as the
   context they share, so fast-refresh's one-export-kind rule does not apply. */
// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return context;
}
