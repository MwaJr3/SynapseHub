import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeControl } from '@/components/layout/ThemeControl';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { renderWithProviders } from '@/test/testUtils';

describe('theme control', () => {
  it('shows the current mode as text, not colour alone', () => {
    renderWithProviders(<ThemeControl />);
    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Hybrid');
  });

  it('opens a menu of all four modes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeControl />);

    await user.click(screen.getByRole('button', { expanded: false }));

    const menu = screen.getByRole('menu', { name: /colour theme/i });
    expect(menu).toBeInTheDocument();
    for (const label of ['Light', 'Dark', 'System', 'Hybrid']) {
      expect(screen.getByRole('menuitemradio', { name: new RegExp(`^${label}`) })).toBeInTheDocument();
    }
    expect(screen.getByRole('menuitemradio', { name: /^Hybrid/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('applies dark mode to the document and persists the choice', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeControl />);

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('menuitemradio', { name: /^Dark/ }));

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    // The menu closes and focus returns to the control.
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { expanded: false })).toHaveFocus();
  });

  it('applies light mode and removes the dark attribute', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderWithProviders(<ThemeControl />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('menuitemradio', { name: /^Light/ }));

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('returns to the hybrid composition, where dark panels stay dark', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    renderWithProviders(<ThemeControl />);

    await user.click(screen.getByRole('button', { expanded: false }));
    await user.click(screen.getByRole('menuitemradio', { name: /^Hybrid/ }));

    await waitFor(() => {
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });
    expect(document.documentElement.getAttribute('data-theme-mode')).toBe('hybrid');
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeControl />);
    const trigger = screen.getByRole('button', { expanded: false });

    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('moves through modes with the arrow keys', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeControl />);

    await user.click(screen.getByRole('button', { expanded: false }));

    // Starts on Hybrid; ArrowDown advances to Light, ArrowUp wraps back.
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    });
    await user.keyboard('{ArrowUp}');
    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
    await user.keyboard('{ArrowUp}');
    await waitFor(() => {
      expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('hybrid');
    });
  });

  it('explains what hybrid means inside the menu', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ThemeControl />);
    await user.click(screen.getByRole('button', { expanded: false }));
    expect(screen.getByRole('menu')).toHaveTextContent(/dark technical panels/i);
  });
});
