/**
 * Theme model.
 *
 * Four modes: `light`, `dark`, `system` and `hybrid`.
 *
 * `hybrid` is the default composition — the page deliberately mixes light
 * editorial surfaces with dark technical panels. Choosing Light or Dark applies
 * one scheme consistently across the whole site (panels collapse into it), so
 * the visitor's explicit preference always wins over the default composition.
 */

export type ThemeMode = 'light' | 'dark' | 'system' | 'hybrid';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'mw-theme';

/**
 * The mode used when nothing valid is stored. `hybrid` is the deliberate
 * default composition of this site: light editorial surfaces with dark
 * technical panels. Change it here — and in the pre-paint script in
 * `index.html`, which cannot import this module — to change the site default.
 */
export const DEFAULT_THEME_MODE: ThemeMode = 'hybrid';

export const themeModes: { id: ThemeMode; label: string; description: string }[] = [
  { id: 'light', label: 'Light', description: 'Consistent light surfaces everywhere' },
  { id: 'dark', label: 'Dark', description: 'Consistent dark surfaces everywhere' },
  { id: 'system', label: 'System', description: 'Follow the operating-system preference' },
  { id: 'hybrid', label: 'Hybrid', description: 'Default composition: light editorial sections with dark technical panels' },
];

const validModes = new Set<ThemeMode>(['light', 'dark', 'system', 'hybrid']);

export function parseThemeMode(value: unknown): ThemeMode {
  return typeof value === 'string' && validModes.has(value as ThemeMode)
    ? (value as ThemeMode)
    : DEFAULT_THEME_MODE;
}

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'light') return 'light';
  if (mode === 'dark') return 'dark';
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  // Hybrid is a light-base composition with dark panels.
  return 'light';
}

/**
 * Applies a mode to <html>. Kept framework-free so it can be called from the
 * pre-paint inline script, the hook, and tests.
 */
export function applyTheme(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  root.setAttribute('data-theme-mode', mode);
  if (mode === 'hybrid') {
    root.removeAttribute('data-theme');
    root.style.colorScheme = systemPrefersDark() ? 'dark' : 'light';
    return;
  }
  root.setAttribute('data-theme', resolveTheme(mode));
  root.style.colorScheme = resolveTheme(mode);
}

export function readStoredTheme(storage: Storage | null = window.localStorage): ThemeMode {
  try {
    return parseThemeMode(storage?.getItem(THEME_STORAGE_KEY));
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function writeStoredTheme(mode: ThemeMode, storage: Storage | null = window.localStorage): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* Storage blocked — the theme still applies for this session. */
  }
}
