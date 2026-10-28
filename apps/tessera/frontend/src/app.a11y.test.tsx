// @vitest-environment jsdom
/**
 * The shell: landmarks, the skip link, the document title, and where focus goes
 * after a navigation.
 *
 * The per-screen sweep in `screens.a11y.test.tsx` checks the content of each
 * screen. This file checks the frame those screens sit in, which is the part a
 * screen-level test cannot see: a single-page app has no page load to announce a
 * change, so without deliberate focus movement a keyboard or screen-reader user
 * presses "Library", hears nothing, and starts tabbing from the navigation they
 * were already on.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe, { type RunOptions } from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import fixtures from './__fixtures__/screens.json';
import App from './App';
import { api } from './api';
import { SignInPage } from './pages';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      me: vi.fn(),
      today: vi.fn(),
      logout: vi.fn(),
      knowledge: vi.fn(),
      profile: vi.fn(),
      loadBaseline: vi.fn(),
      connections: vi.fn(),
      deletionPreview: vi.fn(),
    },
  };
});

/** Name the rule and the element it fired on, so a failure is actionable. */
function describeViolation(violation: axe.Result): string {
  const where = violation.nodes.map((node) => node.target.join(' ')).join(' | ');
  return `${violation.id}: ${violation.help} — ${where}`;
}

const AXE_OPTIONS: RunOptions = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'] },
  rules: { 'color-contrast': { enabled: false } },
};

beforeEach(() => {
  vi.mocked(api.today).mockResolvedValue(fixtures.today as never);
  vi.mocked(api.logout).mockResolvedValue(undefined as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.title = '';
});

describe('signed out', () => {
  it('is accessible and names the document', async () => {
    vi.mocked(api.me).mockRejectedValue(Object.assign(new Error('unauthorised'), { status: 401 }));
    render(<App />);

    await screen.findByRole('heading', { name: 'Sign in' });
    await waitFor(() => expect(document.title).toBe('Tessera — adaptive learning'));

    const results = await axe.run(document.body, AXE_OPTIONS);
    expect(results.violations.map(describeViolation)).toEqual([]);
  });

  it('says out loud that an account was deleted', async () => {
    // The shell hands this message to the sign-in screen after a deletion; the
    // learner should not have to infer that the click worked from an empty page.
    render(<SignInPage onSignedIn={() => {}} notice="Your account and everything recorded under it have been erased." />);
    expect(screen.getByRole('status').textContent).toContain('have been erased');
  });
});

describe('signed in', () => {
  beforeEach(() => {
    vi.mocked(api.me).mockResolvedValue({ email: 'demo@tessera.test', display_name: 'Demo Learner' } as never);
  });

  it('is accessible with the navigation and the today screen together', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Today' });

    const results = await axe.run(document.body, AXE_OPTIONS);
    expect(results.violations.map(describeViolation)).toEqual([]);
  });

  it('renames the page and moves focus to the main region when the section changes', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Today' });

    const main = document.getElementById('main')!;
    expect(main.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).not.toBe(main);

    vi.mocked(api.knowledge).mockResolvedValue(fixtures.knowledge as never);
    await userEvent.click(screen.getByRole('button', { name: 'Knowledge' }));

    await screen.findByRole('heading', { name: 'Knowledge bank' });
    await waitFor(() => expect(document.activeElement).toBe(main));
    expect(document.title).toBe('Knowledge bank — Tessera');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Knowledge bank — Tessera');

    // The navigation marks the current section, so it is not just a colour.
    expect(screen.getByRole('button', { name: 'Knowledge' }).getAttribute('aria-current')).toBe('page');
  });

  it('does not steal focus on first paint', async () => {
    render(<App />);
    await screen.findByRole('heading', { name: 'Today' });
    expect(document.activeElement).toBe(document.body);
  });
});
