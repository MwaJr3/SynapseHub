/**
 * The challenge collection — one entry point.
 *
 * Sixty interactive prototypes, built from a shared set of interface modes: a
 * registry maps each challenge slug to a mode, and one component per mode renders
 * it. Everything the collection needs is in this directory; apart from React it
 * imports nothing from the application.
 *
 * That boundary is deliberate. The collection is expected to grow past sixty and
 * to gain real backends, so it is kept as a unit that can be extracted to its own
 * repository without untangling it from the site that displays it. See README.md
 * and docs/branch-splits.md.
 */
export {
  challengeManifest,
  validateChallengeManifest,
  type AccessTier,
  type ChallengeDifficulty,
  type ChallengeRecord,
  type ChallengeType,
} from './manifest';

export {
  appRouteCount,
  appSlugs,
  getAppDefinition,
  type AppDefinition,
  type AppMode,
} from './apps/appRegistry';

export {
  connectFourWinner,
  shuffled,
  ticTacToeResult,
  type Disc,
  type Mark,
} from './apps/gameLogic';
