/**
 * Advanced UX/UI Engine — core type system.
 *
 * Every layer of the engine (pattern knowledge, constraints, state machines,
 * tokens, audit, adapters) speaks the vocabulary defined here. Keeping the
 * types in one place is what makes a recommendation traceable: a finding
 * references a rule, a rule references patterns, and a pattern carries its
 * evidence — so nothing the engine says is ever a black-box opinion.
 */

// ---------------------------------------------------------------------------
// Severity, confidence and domains
// ---------------------------------------------------------------------------

export type Severity = 'critical' | 'major' | 'minor' | 'nice';

export type Confidence = 'high' | 'medium' | 'low';

/** Must / should / nice mirrors the `/ux-review` command contract. */
export type Priority = 'must' | 'should' | 'nice';

export type PatternDomain =
  | 'state'
  | 'forms'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'visual'
  | 'motion'
  | 'accessibility'
  | 'data-display'
  | 'content'
  | 'system'
  | 'input';

export type RuleFamily =
  | 'A11Y'
  | 'STATE'
  | 'TOKEN'
  | 'MOTION'
  | 'RESPONSIVE'
  | 'CONTENT'
  | 'FEEDBACK'
  | 'FORM'
  | 'NAV'
  | 'VISUAL'
  | 'SYSTEM';

// ---------------------------------------------------------------------------
// Pattern knowledge layer
// ---------------------------------------------------------------------------

export interface EngineRule {
  /** Stable identifier, e.g. `A11Y-CONTRAST-01`. */
  id: string;
  family: RuleFamily;
  /** Deterministic, auditable statement of what the rule requires. */
  statement: string;
  defaultSeverity: Severity;
  /** Patterns that establish the rule — the traceability chain. */
  patternIds: string[];
}

export interface UXPattern {
  /** `P1` … `P76`, matching the blueprint catalog numbering. */
  id: string;
  number: number;
  title: string;
  /** kebab slug, also the stem of the demonstration video filename. */
  slug: string;
  domain: PatternDomain;
  summary: string;
  /** Supplied demonstration evidence, e.g. `css-has-selector.mp4`. */
  evidence: string;
  ruleIds: string[];
  do: string[];
  dont: string[];
  /** Concrete numeric/behavioral thresholds where the pattern defines them. */
  thresholds: string[];
  accessibility: string[];
  responsive: string[];
  tags: string[];
  /** Patterns that compose with this one. */
  related: string[];
  /** Patterns that pull in a different direction and need a trade-off call. */
  conflicts: string[];
}

export interface PatternRelationship {
  members: string[];
  interpretation: string;
}

// ---------------------------------------------------------------------------
// Constraint engine
// ---------------------------------------------------------------------------

export interface ConstraintResult {
  ruleId: string;
  pass: boolean;
  expected: string;
  actual: string;
  detail: string;
}

// ---------------------------------------------------------------------------
// Screen / component descriptors — the engine's input model
// ---------------------------------------------------------------------------

export type ComponentKind =
  | 'button'
  | 'text-field'
  | 'form'
  | 'modal'
  | 'sheet'
  | 'drawer'
  | 'popover'
  | 'tooltip'
  | 'toast'
  | 'table'
  | 'card'
  | 'tabs'
  | 'menu'
  | 'dropdown'
  | 'nav'
  | 'search'
  | 'upload'
  | 'slider'
  | 'toggle'
  | 'rating'
  | 'wizard'
  | 'pagination'
  | 'accordion'
  | 'date-picker'
  | 'otp'
  | 'command-palette'
  | 'filter'
  | 'generic';

export type LoadingStrategy =
  'skeleton' | 'spinner' | 'progress' | 'optimistic' | 'none';

export type EmptyStateKind = 'first-run' | 'no-result' | 'error' | 'filtered';

export interface ComponentDescriptor {
  id: string;
  kind: ComponentKind;
  label?: string;
  /** Optional source location, surfaced by `/ux-review` as file/line refs. */
  file?: string;
  line?: number;

  // Visual / token inputs
  foreground?: string;
  background?: string;
  textSizePx?: number;
  bold?: boolean;
  touchTargetPx?: number;
  spacingPx?: number[];
  radiusPx?: number;
  zIndex?: number;
  motionDurationMs?: number;

  // Capability / interaction inputs
  hoverOnlyAction?: boolean;
  focusVisible?: boolean;
  keyboardOperable?: boolean;
  hasAccessibleName?: boolean;
  domOrderMatchesVisual?: boolean;

  // State inputs
  declaredStates?: string[];
  disabledExplainsWhy?: boolean;
  destructive?: boolean;
  undoAvailable?: boolean;
  confirmationRequired?: boolean;
  optimistic?: boolean;
  rollback?: boolean;
  preservesFocus?: boolean;
  preventsDuplicateActions?: boolean;

  // Feedback / loading inputs
  feedbackMs?: number;
  loadingStrategy?: LoadingStrategy;
  showsProgress?: boolean;

  // Content inputs
  emptyStateKind?: EmptyStateKind;
  emptyStateHasAction?: boolean;
  errorHasRecovery?: boolean;
  ctaOutcomeOriented?: boolean;

  // Form inputs
  validationTiming?: 'blur-first' | 'on-change' | 'on-submit-only' | 'none';
  labelsVisible?: boolean;
}

export interface ScreenDescriptor {
  id: string;
  name: string;
  route: string;
  user: string;
  goal: string;
  tasks: string[];
  pointer: 'fine' | 'coarse' | 'both';
  hover: 'hover' | 'none' | 'both';
  reducedMotionSupported: boolean;
  viewports: Array<'mobile' | 'tablet' | 'desktop'>;
  components: ComponentDescriptor[];
  /** Number of visually competing primary calls to action. */
  competingPrimaryActions: number;
  offlineQueue?: boolean;
  urlState?: boolean;
}

// ---------------------------------------------------------------------------
// Findings and audit reports
// ---------------------------------------------------------------------------

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  priority: Priority;
  confidence: Confidence;
  impactedUsers: string;
  evidence: string;
  remediation: string;
  verification: string;
  patternIds: string[];
  componentId?: string;
  location?: string;
}

export interface PassRecord {
  ruleId: string;
  title: string;
  evidence: string;
  patternIds: string[];
}

export interface PatternMatch {
  patternId: string;
  score: number;
  reasons: string[];
}

export type Grade = 'A' | 'B' | 'C' | 'D';

export interface AuditReport {
  screenId: string;
  score: number;
  grade: Grade;
  findings: Finding[];
  passes: PassRecord[];
  topFixes: Finding[];
  patternMatches: PatternMatch[];
  counts: Record<Severity, number>;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// State machine engine
// ---------------------------------------------------------------------------

export type CoreState =
  | 'default'
  | 'hover'
  | 'focus-visible'
  | 'pressed'
  | 'selected'
  | 'disabled'
  | 'loading'
  | 'optimistic'
  | 'success'
  | 'error'
  | 'offline'
  | 'empty'
  | 'permission'
  | 'destructive';

export interface StateRow {
  state: CoreState;
  minimumBehavior: string;
  entryConditions: string;
  visibleFeedback: string;
  aria: string;
  recovery: string;
  persistence: string;
}

export interface StateTransition {
  from: CoreState | 'default';
  to: CoreState;
  trigger: string;
  guard?: string;
}

export interface StateMatrix {
  componentKind: ComponentKind;
  requiredStates: CoreState[];
  rows: StateRow[];
  transitions: StateTransition[];
  missing: CoreState[];
  /** States declared by the descriptor the matrix was checked against. */
  declared: string[];
}

// ---------------------------------------------------------------------------
// Design system engine
// ---------------------------------------------------------------------------

export type TokenFamily =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'grid'
  | 'radius'
  | 'border'
  | 'elevation'
  | 'icons'
  | 'motion'
  | 'breakpoints'
  | 'touch'
  | 'stacking'
  | 'focus'
  | 'opacity';

export type TokenLayer = 'primitive' | 'semantic' | 'component';

export interface TokenNode {
  name: string;
  layer: TokenLayer;
  family: TokenFamily;
  value: string;
  /** Lower-layer token names this node resolves through. */
  refs: string[];
  theme?: 'light' | 'dark';
}

export interface TokenGraph {
  nodes: TokenNode[];
}

export interface RestyleDecision {
  token: string;
  before: string;
  after: string;
  reason: string;
  patternIds: string[];
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

export interface RetrievalQuery {
  text: string;
  domains?: PatternDomain[];
  componentKinds?: ComponentKind[];
  states?: CoreState[];
  limit?: number;
}

export interface ScoredPattern {
  pattern: UXPattern;
  score: number;
  reasons: string[];
  conflicts: UXPattern[];
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export type CommandName =
  | 'ux-review'
  | 'ux-design'
  | 'ux-audit'
  | 'restyle'
  | 'ux-pattern'
  | 'ux-states'
  | 'ux-system'
  | 'ux-test';

export interface CommandResult {
  command: CommandName;
  title: string;
  /** Markdown-ready body sections rendered by the studio. */
  sections: Array<{ heading: string; body: string }>;
  report?: AuditReport;
  code?: { label: string; language: string; content: string }[];
  patternIds: string[];
}
