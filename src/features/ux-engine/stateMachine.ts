/**
 * State Machine Engine — formal state models before implementation.
 *
 * The blueprint's core state matrix (14 states) becomes executable: each
 * component kind gets a required state set, each state gets minimum behavior,
 * entry conditions, feedback, ARIA semantics, recovery and persistence, and
 * async flows get explicit transitions that audit can validate for missing
 * error and rollback paths.
 */
import type {
  ComponentKind,
  CoreState,
  StateMatrix,
  StateRow,
  StateTransition,
} from './types';

// ---------------------------------------------------------------------------
// The 14-state core matrix
// ---------------------------------------------------------------------------

export const CORE_STATE_BEHAVIOR: Record<CoreState, string> = {
  default: 'Clear affordance, correct semantics, expected hierarchy.',
  hover: 'Optional enhancement only; never the sole path to primary actions.',
  'focus-visible': 'Visible high-contrast ring; keyboard position obvious.',
  pressed: 'Immediate feedback under ~100ms where practical.',
  selected: 'Persistent visual plus semantic state; distinguish from focus.',
  disabled:
    'Explain why blocked; keep explanation reachable; avoid dead tooltip.',
  loading:
    'Truthful progress/busy semantics; preserve focus and prevent duplicate actions.',
  optimistic: 'Reflect reversible success immediately; reconcile with server.',
  success: 'Confirm completion with multimodal feedback where useful.',
  error: 'State what happened, why it matters, and the next recovery action.',
  offline: 'Queue safe work, expose pending state and drain deterministically.',
  empty: 'Explain why empty and provide the next useful action.',
  permission: 'Explain access limitation and route to request/change access.',
  destructive:
    'Use explicit verb and proportional friction; prefer undo when reversible.',
};

const STATE_ROWS: Record<CoreState, Omit<StateRow, 'state'>> = {
  default: {
    minimumBehavior: CORE_STATE_BEHAVIOR.default,
    entryConditions: 'Component mounted with no interaction.',
    visibleFeedback: 'Stable resting styling with a clear affordance.',
    aria: 'Native role and accessible name present.',
    recovery: 'Not applicable — resting state.',
    persistence: 'Reflects persisted or initial model value.',
  },
  hover: {
    minimumBehavior: CORE_STATE_BEHAVIOR.hover,
    entryConditions: 'Pointer with hover capability rests on the target.',
    visibleFeedback: 'Subtle emphasis that never changes layout footprint.',
    aria: 'No semantic change; hover is not announced.',
    recovery: 'Pointer leaves; component returns to default.',
    persistence: 'Transient, never persisted.',
  },
  'focus-visible': {
    minimumBehavior: CORE_STATE_BEHAVIOR['focus-visible'],
    entryConditions: 'Keyboard focus lands on the element (:focus-visible).',
    visibleFeedback: 'High-contrast focus ring using the focus token.',
    aria: 'Focus position exposed to assistive tech naturally.',
    recovery: 'Blur or Tab moves focus; ring follows.',
    persistence: 'Transient; focus order is preserved across re-renders.',
  },
  pressed: {
    minimumBehavior: CORE_STATE_BEHAVIOR.pressed,
    entryConditions: 'Pointer down or key down on an actionable element.',
    visibleFeedback: 'Immediate visual press response within ~100ms.',
    aria: 'aria-pressed where the action is a toggle.',
    recovery: 'Release commits; Escape cancels before commit.',
    persistence: 'Transient; commit result lands in the next state.',
  },
  selected: {
    minimumBehavior: CORE_STATE_BEHAVIOR.selected,
    entryConditions:
      'User commits a selection (click, keyboard or programmatic).',
    visibleFeedback: 'Persistent selected styling distinct from focus.',
    aria: 'aria-selected / aria-checked / aria-pressed as appropriate.',
    recovery: 'Selection can be changed or cleared via the same control.',
    persistence: 'Persists in model/URL state until changed.',
  },
  disabled: {
    minimumBehavior: CORE_STATE_BEHAVIOR.disabled,
    entryConditions: 'A precondition for the action is unmet.',
    visibleFeedback: 'Reduced affordance plus a reachable explanation.',
    aria: 'aria-disabled preferred over the disabled attribute so explanation stays reachable.',
    recovery: 'Explain the unmet precondition and route to satisfying it.',
    persistence: 'Derived from model state, not a manual flag.',
  },
  loading: {
    minimumBehavior: CORE_STATE_BEHAVIOR.loading,
    entryConditions: 'Async work starts; outcome unknown or in progress.',
    visibleFeedback:
      'Skeleton, spinner or truthful progress matched to certainty.',
    aria: 'aria-busy on the region; focus preserved; submission blocked.',
    recovery: 'Cancellable where possible; never silently stuck.',
    persistence: 'Transient; survives navigation only when work is queued.',
  },
  optimistic: {
    minimumBehavior: CORE_STATE_BEHAVIOR.optimistic,
    entryConditions:
      'Reversible action commits locally before server confirmation.',
    visibleFeedback:
      'Immediate reflected value marked as pending reconciliation.',
    aria: 'Pending state announced; not treated as confirmed.',
    recovery: 'Clean rollback to the last server-confirmed value on failure.',
    persistence: 'Local until reconciled; queued offline where supported.',
  },
  success: {
    minimumBehavior: CORE_STATE_BEHAVIOR.success,
    entryConditions: 'Server truth confirms the action.',
    visibleFeedback: 'Confirmation using icon + text (never colour alone).',
    aria: 'Polite aria-live announcement of completion.',
    recovery: 'Undo offered where the action is reversible.',
    persistence: 'Written to server truth and reflected locally.',
  },
  error: {
    minimumBehavior: CORE_STATE_BEHAVIOR.error,
    entryConditions: 'Validation fails or async work rejects.',
    visibleFeedback: 'Inline, banner or modal surface chosen by severity.',
    aria: 'role="alert" or aria-lived error linked via aria-describedby.',
    recovery: 'Concrete next action: retry, edit, undo or request access.',
    persistence: 'User input is preserved; error clears on correction.',
  },
  offline: {
    minimumBehavior: CORE_STATE_BEHAVIOR.offline,
    entryConditions: 'Network unavailable while safe work is requested.',
    visibleFeedback: 'Explicit queued/pending status, no fake success.',
    aria: 'Queued status announced through a live region.',
    recovery:
      'Deterministic drain when connectivity returns; conflict handling on collision.',
    persistence: 'Queued writes persist locally until drained.',
  },
  empty: {
    minimumBehavior: CORE_STATE_BEHAVIOR.empty,
    entryConditions:
      'A container has no items (first-run, no-result, filtered, error).',
    visibleFeedback: 'Classified empty state with explanation and next action.',
    aria: 'Labelled region so the absence of content is intentional.',
    recovery: 'Primary next action (create, clear filters, retry).',
    persistence: 'Derived from data; no placeholder content invented.',
  },
  permission: {
    minimumBehavior: CORE_STATE_BEHAVIOR.permission,
    entryConditions: 'Authenticated user lacks the required access.',
    visibleFeedback: 'Explain the limitation without implying a system error.',
    aria: 'Heading and labelled request-access action.',
    recovery: 'Route to request or change access.',
    persistence: 'Re-evaluated when permissions change.',
  },
  destructive: {
    minimumBehavior: CORE_STATE_BEHAVIOR.destructive,
    entryConditions: 'User invokes an action that destroys data or access.',
    visibleFeedback:
      'Explicit verb, danger treatment proportional to irreversibility.',
    aria: 'Clearly labelled destructive control; confirmation has a descriptive accessible name.',
    recovery:
      'Undo for reversible work; typed confirmation for irreversible work.',
    persistence: 'Soft-delete first; hard delete only after friction.',
  },
};

// ---------------------------------------------------------------------------
// Required states per component kind
// ---------------------------------------------------------------------------

const REQUIRED_STATES: Record<ComponentKind, CoreState[]> = {
  button: [
    'default',
    'hover',
    'focus-visible',
    'pressed',
    'disabled',
    'loading',
    'success',
    'error',
  ],
  'text-field': [
    'default',
    'focus-visible',
    'disabled',
    'error',
    'success',
    'loading',
  ],
  form: ['default', 'loading', 'success', 'error', 'offline'],
  modal: ['default', 'focus-visible', 'loading', 'error'],
  sheet: ['default', 'focus-visible', 'loading', 'error'],
  drawer: ['default', 'focus-visible', 'loading', 'error'],
  popover: ['default', 'focus-visible', 'error'],
  tooltip: ['default', 'focus-visible'],
  toast: ['default', 'success', 'error'],
  table: ['default', 'loading', 'error', 'empty', 'selected'],
  card: ['default', 'hover', 'focus-visible', 'loading', 'empty'],
  tabs: ['default', 'focus-visible', 'selected', 'disabled'],
  menu: ['default', 'focus-visible', 'disabled'],
  dropdown: ['default', 'focus-visible', 'loading', 'disabled', 'empty'],
  nav: ['default', 'hover', 'focus-visible', 'selected'],
  search: ['default', 'focus-visible', 'loading', 'error', 'empty'],
  upload: ['default', 'loading', 'success', 'error', 'offline', 'empty'],
  slider: ['default', 'focus-visible', 'pressed', 'disabled', 'error'],
  toggle: [
    'default',
    'focus-visible',
    'pressed',
    'selected',
    'disabled',
    'error',
  ],
  rating: ['default', 'hover', 'focus-visible', 'selected', 'disabled'],
  wizard: ['default', 'loading', 'error', 'success', 'disabled'],
  pagination: ['default', 'focus-visible', 'selected', 'disabled', 'loading'],
  accordion: ['default', 'focus-visible', 'selected', 'disabled'],
  'date-picker': ['default', 'focus-visible', 'loading', 'error', 'disabled'],
  otp: ['default', 'focus-visible', 'error', 'success', 'disabled'],
  'command-palette': ['default', 'focus-visible', 'loading', 'empty'],
  filter: ['default', 'focus-visible', 'selected', 'disabled', 'empty'],
  generic: ['default', 'focus-visible', 'loading', 'error', 'empty'],
};

// ---------------------------------------------------------------------------
// Canonical async transitions
// ---------------------------------------------------------------------------

export const CANONICAL_TRANSITIONS: StateTransition[] = [
  {
    from: 'default',
    to: 'loading',
    trigger: 'async action invoked',
    guard: 'duplicate submissions blocked',
  },
  { from: 'loading', to: 'success', trigger: 'server confirms' },
  {
    from: 'loading',
    to: 'error',
    trigger: 'request rejects or validation fails',
    guard: 'user input preserved',
  },
  {
    from: 'error',
    to: 'loading',
    trigger: 'user retries with the recovery action',
  },
  {
    from: 'default',
    to: 'optimistic',
    trigger: 'reversible action commits locally',
    guard: 'rollback path exists',
  },
  {
    from: 'optimistic',
    to: 'success',
    trigger: 'server reconciliation confirms',
  },
  {
    from: 'optimistic',
    to: 'error',
    trigger: 'server rejects; rollback restores prior value',
  },
  {
    from: 'default',
    to: 'offline',
    trigger: 'network unavailable; work queued',
  },
  {
    from: 'offline',
    to: 'loading',
    trigger: 'connectivity returns; queue drains',
  },
  {
    from: 'default',
    to: 'destructive',
    trigger: 'destructive action invoked',
    guard: 'friction proportional to irreversibility',
  },
  {
    from: 'destructive',
    to: 'success',
    trigger: 'destruction confirmed or undo window expires',
  },
  {
    from: 'success',
    to: 'default',
    trigger: 'undo invoked inside the recovery window',
  },
];

// ---------------------------------------------------------------------------
// Matrix construction and validation
// ---------------------------------------------------------------------------

export function requiredStatesFor(kind: ComponentKind): CoreState[] {
  return REQUIRED_STATES[kind] ?? REQUIRED_STATES.generic;
}

function toRow(state: CoreState): StateRow {
  return { state, ...STATE_ROWS[state] };
}

/**
 * Build the full state matrix for a component kind and check it against the
 * states the descriptor actually declares. Missing states are reported, never
 * silently assumed.
 */
export function buildStateMatrix(
  kind: ComponentKind,
  declaredStates: string[] = [],
  opts: {
    destructive?: boolean;
    optimistic?: boolean;
    offlineQueue?: boolean;
  } = {},
): StateMatrix {
  const required = [...requiredStatesFor(kind)];
  if (opts.destructive && !required.includes('destructive'))
    required.push('destructive');
  if (opts.optimistic && !required.includes('optimistic'))
    required.push('optimistic');
  if (opts.offlineQueue && !required.includes('offline'))
    required.push('offline');

  const declared = declaredStates.map((state) => state.toLowerCase());
  const missing = required.filter((state) => !declared.includes(state));

  const transitions = CANONICAL_TRANSITIONS.filter((transition) => {
    const from = transition.from === 'default' ? 'default' : transition.from;
    return required.includes(from) && required.includes(transition.to);
  });

  return {
    componentKind: kind,
    requiredStates: required,
    rows: required.map(toRow),
    transitions,
    missing,
    declared: declaredStates,
  };
}

/**
 * Transition-level validation: an async component that declares loading but
 * not error, or optimism without rollback, has an unrecoverable path.
 */
export function validateTransitions(
  kind: ComponentKind,
  declaredStates: string[],
  opts: {
    optimistic?: boolean;
    rollback?: boolean;
    destructive?: boolean;
    undoAvailable?: boolean;
  } = {},
): Array<{ ruleId: string; problem: string }> {
  const problems: Array<{ ruleId: string; problem: string }> = [];
  const has = (state: string) =>
    declaredStates.map((s) => s.toLowerCase()).includes(state);

  if (has('loading') && !has('error')) {
    problems.push({
      ruleId: 'STATE-ERROR-01',
      problem: `${kind} declares a loading state but no error state; failed async work has no recovery path.`,
    });
  }
  if (opts.optimistic && !opts.rollback) {
    problems.push({
      ruleId: 'STATE-OPTIMISTIC-01',
      problem: `${kind} uses optimistic updates without a rollback path; rejected writes cannot be reconciled.`,
    });
  }
  if (opts.destructive && !opts.undoAvailable) {
    problems.push({
      ruleId: 'STATE-DESTRUCTIVE-01',
      problem: `${kind} is destructive with neither undo nor proportional confirmation friction.`,
    });
  }
  if (
    (has('loading') || opts.optimistic) &&
    !has('success') &&
    requiredStatesFor(kind).includes('success')
  ) {
    problems.push({
      ruleId: 'STATE-COMPLETENESS-01',
      problem: `${kind} performs async work but declares no success state confirming completion.`,
    });
  }
  return problems;
}
