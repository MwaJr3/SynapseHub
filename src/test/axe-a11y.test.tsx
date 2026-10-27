import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import App from '@/App';
import { renderWithProviders } from '@/test/render-app';
import { describeViolations, runAxe } from '@/test/axe';

/**
 * Runtime accessibility layer — axe-core evaluates the rendered DOM rather
 * than source, complementing both the structural checks in
 * accessibility.test.tsx and the static UX scanner. The route set covers the
 * marketing shell, the app library, an interactive prototype, the engine
 * studio, the state-heavy personal OS and the 404 page.
 */
const routes: Array<[string, string]> = [
  ['/', 'home'],
  ['/about', 'about'],
  ['/projects', 'project library'],
  ['/apps', 'interactive apps library'],
  ['/apps/poll-creator-app', 'poll creator prototype'],
  ['/apps/tic-tac-toe-game', 'tic tac toe prototype'],
  ['/skills', 'skills'],
  ['/ux-engine', 'UX engine studio'],
  ['/contact', 'contact'],
  ['/system', 'personal operating system'],
  ['/unknown-route', '404'],
];

describe.each(routes)('axe runtime audit: %s (%s)', (path) => {
  it('reports no WCAG 2.x AA or best-practice violations', async () => {
    const { container } = renderWithProviders(<App />, path);
    await screen.findByRole('heading', { level: 1 });

    const { violations, incomplete } = await runAxe(container);

    // Incomplete results mean axe could not decide under jsdom (typically
    // layout-dependent); they are a manual-review list, never silently ignored.
    // eslint-disable-next-line no-console
    console.info(
      `axe incomplete (manual review) on ${path}:`,
      incomplete.map((item) => item.id).join(', ') || 'none',
    );
    expect(violations, describeViolations(violations)).toEqual([]);
  });
});
