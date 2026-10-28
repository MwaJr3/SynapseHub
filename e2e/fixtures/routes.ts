/**
 * Canonical route coverage for the browser audit. Every route pattern declared
 * in `src/App.tsx` is represented: the static shell, both dynamic detail routes
 * (challenge prototype and project case study) and the 404 fallback.
 */
export const STATIC_ROUTES: readonly string[] = [
  '/',
  '/about',
  '/projects',
  '/apps',
  '/skills',
  '/journey',
  '/approach',
  '/operations',
  '/ux-engine',
  '/contact',
  '/system',
  '/unknown-route',
];

export const DYNAMIC_ROUTES: readonly string[] = [
  '/apps/poll-creator-app',
  '/apps/tic-tac-toe-game',
  '/projects/vocal-separator',
];

/** Every route the SPA router can render, used by the full-rule axe audit. */
export const ALL_ROUTES: readonly string[] = [
  ...STATIC_ROUTES,
  ...DYNAMIC_ROUTES,
];

/** Routes rich enough in interactive controls for keyboard and hit-box checks. */
export const INTERACTIVE_ROUTES: readonly string[] = [
  '/',
  '/apps',
  '/apps/poll-creator-app',
  '/apps/tic-tac-toe-game',
  '/ux-engine',
  '/system',
  '/contact',
];

export const PORTFOLIO_URL = 'http://localhost:4173';
export const VOCAL_URL = 'http://localhost:4174';
