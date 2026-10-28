/**
 * Advanced UX/UI Engine — public API.
 *
 * Pattern-driven design intelligence: 76 structured patterns, deterministic
 * constraint checks, state-machine models, a primitive→semantic→component
 * token graph, responsive and content engines, evidence-based auditing and
 * framework adapters — every recommendation traceable to a rule and a pattern.
 */
export * from './types';
export { PATTERNS, PATTERN_DOMAINS, getPattern } from './patterns';
export { PATTERN_RELATIONSHIPS, relationshipsFor } from './relationships';
export { RULES, getRule, rulesForPattern } from './rules';
export {
  SPACING_SCALE,
  RADIUS_SCALE,
  MOTION_RANGE_MS,
  MIN_TOUCH_TARGET_PX,
  DOHERTY_FEEDBACK_MS,
  SKELETON_FLASH_MS,
  STACKING_LAYERS,
  parseHexColor,
  relativeLuminance,
  contrastRatio,
  checkContrast,
  checkTouchTarget,
  checkSpacing,
  checkRadius,
  checkMotionDuration,
  checkFeedbackLatency,
  checkZIndex,
  isOnSpacingScale,
} from './constraints';
export {
  CORE_STATE_BEHAVIOR,
  CANONICAL_TRANSITIONS,
  requiredStatesFor,
  buildStateMatrix,
  validateTransitions,
} from './stateMachine';
export {
  BASELINE_SCALES,
  REQUIRED_TOKEN_FAMILIES,
  TOKEN_GRAPH,
  validateTokenGraph,
  generateCssCustomProperties,
  generateTailwindSnippet,
  planRestyle,
} from './tokens';
export {
  BREAKPOINTS,
  RESPONSIVE_RULES,
  planViewport,
  responsiveGuidance,
} from './responsive';
export {
  generateCta,
  generateEmptyState,
  generateErrorCopy,
  checkTone,
  EMPTY_STATE_COPY,
} from './microcopy';
export { retrievePatterns, patternsForComponent } from './retrieval';
export { auditScreen } from './audit';
export { generateReactComponent, generateAcceptanceChecks } from './adapters';
export {
  COMMAND_SUMMARIES,
  uxReview,
  uxAudit,
  uxDesign,
  uxPattern,
  uxStates,
  uxSystem,
  uxTest,
  restyle,
  componentCode,
} from './commands';
export { FLAWED_CHECKOUT, POLISHED_CHECKOUT, LAB_DEFAULT } from './fixtures';
