// @vitest-environment jsdom
/**
 * The accessibility sweep: every screen, rendered, checked by axe.
 *
 * The fixtures in `__fixtures__/screens.json` are not invented. They were
 * captured from the local API (`GET` on each route, signed in as a freshly
 * registered demo learner on a seeded SQLite database), so each screen is drawn
 * from the shape the server really returns rather than from what this test
 * file hoped it would return.
 *
 * What this can and cannot see is written down in docs/a11y/tessera-2026-10.md.
 * In short: axe finds missing names, roles, states and landmark problems; it
 * cannot compute colour contrast in jsdom, cannot tell whether a focus ring is
 * visible in a real browser, and cannot hear a screen reader. Contrast is
 * computed separately, from the actual tokens, in `src/contrast.test.ts`.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import axe, { type RunOptions } from 'axe-core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import fixtures from './__fixtures__/screens.json';
import type { ConsentPreview } from './api';
import { api } from './api';
import { ConnectedApps, ConsentPage } from './integration';
import { ChessPage, ConceptPage, KnowledgePage, MapPage, SignInPage, SourcesPage, TodayPage } from './pages';
import { TutorPage } from './tutor';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      today: vi.fn(),
      knowledge: vi.fn(),
      map: vi.fn(),
      sources: vi.fn(),
      openings: vi.fn(),
      puzzles: vi.fn(),
      concept: vi.fn(),
      tutorStatus: vi.fn(),
      connections: vi.fn(),
      consentPreview: vi.fn(),
    },
  };
});

/** Name the rule and the element it fired on, so a failure is actionable. */
function describeViolation(violation: axe.Result): string {
  const where = violation.nodes.map((node) => node.target.join(' ')).join(' | ');
  return `${violation.id}: ${violation.help} — ${where}`;
}

const AXE_OPTIONS: RunOptions = {
  // The full WCAG 2.2 A/AA set, plus axe's best-practice rules: landmarks, one
  // main region, a page-level heading, heading order. Best practice is stricter
  // than the law and easier to regress silently, which is why it is included.
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'] },
  rules: {
    // jsdom has no layout engine, so axe reports every element as having no
    // background to compare against. Contrast is measured from the tokens instead.
    'color-contrast': { enabled: false },
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

/**
 * Render inside the landmark the app shell provides, wait for the screen's own
 * heading, then run axe. Waiting for the heading matters: a sweep that ran on the
 * loading spinner would pass without checking anything.
 */
async function expectAccessible(ui: React.ReactElement, heading: string | RegExp) {
  // The same shell the app provides: one main landmark and the hidden h1 the
  // shell derives from the route. The h1 names the page ("Today — Tessera"); the
  // visible card heading names the section, so the two are not duplicates.
  render(
    <main>
      <h1 className="sr-only">Tessera screen</h1>
      {ui}
    </main>,
  );
  await screen.findByRole('heading', { name: heading });

  const results = await axe.run(document.body, AXE_OPTIONS);
  expect(results.violations.map(describeViolation)).toEqual([]);
}

describe('every screen renders without an axe violation', () => {
  it('sign in', async () => {
    await expectAccessible(<SignInPage onSignedIn={() => {}} />, 'Sign in');
  });

  it('today', async () => {
    vi.mocked(api.today).mockResolvedValue(fixtures.today as never);
    await expectAccessible(<TodayPage onOpenConcept={() => {}} />, 'Today');
  });

  it('knowledge bank', async () => {
    vi.mocked(api.knowledge).mockResolvedValue(fixtures.knowledge as never);
    await expectAccessible(<KnowledgePage onOpenConcept={() => {}} />, 'Knowledge bank');
  });

  it('knowledge map', async () => {
    vi.mocked(api.map).mockResolvedValue(fixtures.map as never);
    await expectAccessible(<MapPage onOpenConcept={() => {}} />, 'Knowledge map');
  });

  it('concept detail', async () => {
    const concept = fixtures.concept as { concept: { id: string; title: string } };
    vi.mocked(api.concept).mockResolvedValue(fixtures.concept as never);
    await expectAccessible(<ConceptPage conceptId={concept.concept.id} onBack={() => {}} />, concept.concept.title);
  });

  it('tactics', async () => {
    vi.mocked(api.openings).mockResolvedValue(fixtures.openings as never);
    vi.mocked(api.puzzles).mockResolvedValue(fixtures.puzzles as never);
    await expectAccessible(<ChessPage />, 'Tactics');
  });

  it('sources', async () => {
    vi.mocked(api.sources).mockResolvedValue(fixtures.sources as never);
    await expectAccessible(<SourcesPage />, 'Content provenance');
  });

  it('tutor', async () => {
    vi.mocked(api.tutorStatus).mockResolvedValue(fixtures.tutor_status as never);
    await expectAccessible(<TutorPage />, 'AI tutor');
  });

  it('connected apps', async () => {
    vi.mocked(api.connections).mockResolvedValue(fixtures.connections as never);
    await expectAccessible(<ConnectedApps />, 'Connected apps');
  });

  it('the consent screen', async () => {
    const params = new URLSearchParams({
      client_id: 'studio-planner',
      redirect_uri: 'https://planner.example.test/callback',
      code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
      state: 'demo-state',
    });
    window.history.replaceState({}, '', `/?${params.toString()}`);
    const preview: ConsentPreview = {
      client: { id: 'studio-planner', name: 'Tamuzi Study Planner' },
      redirect_uri: 'https://planner.example.test/callback',
      scopes: ['learning-summary:read'],
      purpose: 'Organise your study activities around what Tessera says is due.',
      already_granted: false,
      can_write: false,
      revocable: true,
    };
    vi.mocked(api.consentPreview).mockResolvedValue(preview);

    await expectAccessible(<ConsentPage />, 'Connect to the Study Planner');
    window.history.replaceState({}, '', '/');
  });
});

describe('the sweep itself', () => {
  it('fails when a screen is inaccessible, so a green run means something', async () => {
    // A deliberate violation: an unnamed button. If axe were silently not
    // running, or the assertion tolerated empty output, this would pass.
    render(
      <main>
        <button type="button" />
      </main>,
    );
    const results = await axe.run(document.body, AXE_OPTIONS);
    await waitFor(() => expect(results.violations.map((violation) => violation.id)).toContain('button-name'));
  });
});
