import { describe, expect, it } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  parseThemeMode,
  readStoredTheme,
  resolveTheme,
  themeModes,
  writeStoredTheme,
} from './theme';

describe('parseThemeMode', () => {
  it.each(['light', 'dark', 'system', 'hybrid'] as const)('accepts "%s"', (mode) => {
    expect(parseThemeMode(mode)).toBe(mode);
  });

  it.each([null, undefined, '', 'purple', 42, {}, 'LIGHT'])('falls back to hybrid for %j', (value) => {
    expect(parseThemeMode(value)).toBe('hybrid');
  });
});

describe('resolveTheme', () => {
  it('maps explicit modes directly', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });

  it('maps hybrid to a light base with dark panels', () => {
    expect(resolveTheme('hybrid')).toBe('light');
  });

  it('follows the media query in system mode', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    expect(resolveTheme('system')).toBe('dark');

    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    expect(resolveTheme('system')).toBe('light');
    window.matchMedia = original;
  });
});

describe('applyTheme', () => {
  const root = document.documentElement;

  it('sets data-theme for explicit light and dark modes', () => {
    applyTheme('light');
    expect(root.getAttribute('data-theme')).toBe('light');
    expect(root.getAttribute('data-theme-mode')).toBe('light');

    applyTheme('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  it('resolves system mode to a concrete scheme', () => {
    applyTheme('system');
    expect(root.getAttribute('data-theme-mode')).toBe('system');
    expect(['light', 'dark']).toContain(root.getAttribute('data-theme'));
  });

  it('removes data-theme in hybrid mode so panels keep their own tone', () => {
    applyTheme('dark');
    applyTheme('hybrid');
    expect(root.hasAttribute('data-theme')).toBe(false);
    expect(root.getAttribute('data-theme-mode')).toBe('hybrid');
  });

  it('keeps the document color-scheme in sync for form controls', () => {
    applyTheme('dark');
    expect(root.style.colorScheme).toBe('dark');
    applyTheme('light');
    expect(root.style.colorScheme).toBe('light');
  });
});

describe('persistence', () => {
  it('round-trips a stored mode', () => {
    writeStoredTheme('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('defaults to hybrid when nothing is stored', () => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    expect(readStoredTheme()).toBe('hybrid');
  });

  it('defaults to hybrid when storage holds garbage', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'nonsense');
    expect(readStoredTheme()).toBe('hybrid');
  });

  it('survives storage being unavailable', () => {
    expect(() => writeStoredTheme('dark', null)).not.toThrow();
    expect(readStoredTheme(null)).toBe('hybrid');
  });
});

describe('the exposed theme options', () => {
  it('offers light, dark, system and hybrid with descriptions', () => {
    expect(themeModes.map((mode) => mode.id)).toEqual(['light', 'dark', 'system', 'hybrid']);
    for (const mode of themeModes) {
      expect(mode.label.length).toBeGreaterThan(2);
      expect(mode.description.length).toBeGreaterThan(10);
    }
  });
});
