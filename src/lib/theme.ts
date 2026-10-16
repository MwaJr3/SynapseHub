export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mwangala.theme';

export const themeOptions: Array<{
  id: ThemePreference;
  label: string;
  hint: string;
}> = [
  {
    id: 'light',
    label: 'Light',
    hint: 'Light surfaces, contrast panels for technical sections',
  },
  { id: 'dark', label: 'Dark', hint: 'Deep surfaces throughout' },
  {
    id: 'system',
    label: 'System',
    hint: 'Follow the operating system setting',
  },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

export function readStoredPreference(
  storage: Pick<Storage, 'getItem'> | undefined,
): ThemePreference {
  if (!storage) return 'system';
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function persistPreference(
  preference: ThemePreference,
  storage: Pick<Storage, 'setItem'> | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* Private mode or blocked storage: the theme still applies for this visit. */
  }
}

/** Applies the resolved theme to <html> so every token scope follows. */
export function applyTheme(resolved: ResolvedTheme, root: HTMLElement): void {
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
}
