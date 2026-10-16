import { describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  isThemePreference,
  persistPreference,
  readStoredPreference,
  resolveTheme,
} from './theme';

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    store,
  };
}

describe('theme resolution', () => {
  it('follows the system preference only for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('recognises valid preferences only', () => {
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('sepia')).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe('theme persistence', () => {
  it('reads a stored preference and falls back to system', () => {
    expect(
      readStoredPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'dark' })),
    ).toBe('dark');
    expect(
      readStoredPreference(memoryStorage({ [THEME_STORAGE_KEY]: 'sepia' })),
    ).toBe('system');
    expect(readStoredPreference(undefined)).toBe('system');
  });

  it('writes the preference it is given', () => {
    const storage = memoryStorage();
    persistPreference('dark', storage);
    expect(storage.store.get(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('survives storage being unavailable (private mode, blocked cookies)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(readStoredPreference(throwing)).toBe('system');
    expect(() => persistPreference('light', throwing)).not.toThrow();
  });
});

describe('applying the theme', () => {
  it('toggles the class and colour scheme on <html>', () => {
    document.documentElement.classList.remove('dark');
    applyTheme('dark', document.documentElement);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    applyTheme('light', document.documentElement);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('does not throw when storage access throws at the call site', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });
    expect(() => persistPreference('dark', window.localStorage)).not.toThrow();
    spy.mockRestore();
  });
});
