/**
 * Audit / Scoring Engine — evidence-based UX verdicts.
 *
 * Runs the deterministic constraint checks, the state-machine validator and
 * rule-based design checks against a screen descriptor and produces findings
 * with severity, confidence, impacted users, remediation, verification and
 * pattern traceability — plus a weighted score, a grade and the top three
 * fixes. Nothing here is heuristic-looking: every finding cites a rule, and
 * every rule cites patterns.
 */
import {
  checkContrast,
  checkMotionDuration,
  checkRadius,
  checkSpacing,
  checkTouchTarget,
  checkZIndex,
  DOHERTY_FEEDBACK_MS,
} from './constraints';
import { retrievePatterns } from './retrieval';
import { getRule } from './rules';
import { buildStateMatrix, validateTransitions } from './stateMachine';
import type {
  AuditReport,
  ComponentDescriptor,
  Confidence,
  Finding,
  Grade,
  PassRecord,
  PatternMatch,
  Priority,
  ScreenDescriptor,
  Severity,
} from './types';

const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 20,
  major: 10,
  minor: 4,
  nice: 1,
};

const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_FOR: Record<Severity, Priority> = {
  critical: 'must',
  major: 'must',
  minor: 'should',
  nice: 'nice',
};

/** Rule-specific remediation, verification and impacted-user guidance. */
export const RULE_GUIDANCE: Record<
  string,
  { impactedUsers: string; remediation: string; verification: string }
> = {
  'A11Y-CONTRAST-01': {
    impactedUsers:
      'users with low vision, colour vision deficiency and users in bright ambient light',
    remediation:
      'Move the pair onto semantic color tokens that pass 4.5:1 (3:1 for large text); verify both themes.',
    verification:
      'Re-run the contrast check; assert ratio >= the required threshold in both light and dark themes.',
  },
  'A11Y-TARGET-01': {
    impactedUsers:
      'touch users, users with motor impairment and small-hand device holders',
    remediation:
      'Expand the hit area to at least 44x44px; the visual glyph may stay 24px inside the larger target.',
    verification:
      'Measure the bounding box of the interactive element; assert >= 44px on the coarse-pointer viewport.',
  },
  'A11Y-FOCUS-01': {
    impactedUsers: 'keyboard, switch-device and screen-reader users',
    remediation:
      'Apply the focus-ring token on :focus-visible, trap focus inside overlays and restore it on close.',
    verification:
      'Tab through the screen; every control shows a visible ring; Escape closes and returns focus.',
  },
  'A11Y-KEYBOARD-01': {
    impactedUsers: 'keyboard and switch-device users',
    remediation:
      'Add keyboard handlers, roving tabindex where needed, and align DOM order with visual order.',
    verification:
      'Complete the full task using only Tab/arrow keys/Enter/Escape.',
  },
  'A11Y-NAME-01': {
    impactedUsers: 'screen-reader and voice-control users',
    remediation:
      'Give the control an accessible name via visible text, aria-label or labelled icon.',
    verification:
      'Inspect the accessibility tree; the control exposes a non-empty accessible name.',
  },
  'STATE-COMPLETENESS-01': {
    impactedUsers: 'all users when the component enters an undesigned state',
    remediation:
      'Add the missing states to the component contract and design each before implementation.',
    verification:
      'Drive the component through every matrix state in tests and assert the intended feedback.',
  },
  'STATE-ERROR-01': {
    impactedUsers:
      'users on slow or failing networks and users entering invalid data',
    remediation:
      'Define an error state with what happened, why it matters and the next recovery action.',
    verification:
      'Force a rejection in tests and assert the error surface, announcement and recovery action render.',
  },
  'STATE-LOADING-01': {
    impactedUsers: 'all users on slow connections',
    remediation:
      'Add a loading state that preserves focus, blocks duplicate submissions and matches content shape.',
    verification:
      'Throttle the network and assert aria-busy, focus retention and single-submit behavior.',
  },
  'STATE-DISABLED-01': {
    impactedUsers:
      'keyboard users and users who cannot infer why an action is blocked',
    remediation:
      'Keep the control focusable (aria-disabled) and attach a reachable explanation of the blocker.',
    verification:
      'Tab to the blocked control; the explanation is reachable and distinct from the loading state.',
  },
  'STATE-DESTRUCTIVE-01': {
    impactedUsers: 'all users at risk of accidental data loss',
    remediation:
      'Use an explicit verb, soft-delete plus undo for reversible work, typed friction for irreversible work.',
    verification:
      'Invoke the action; undo restores the data; irreversible flow requires the proportional confirm.',
  },
  'STATE-OPTIMISTIC-01': {
    impactedUsers: 'users on flaky networks whose optimistic writes may fail',
    remediation:
      'Only optimise reversible actions and implement reconciliation with an explicit rollback state.',
    verification:
      'Force the server to reject; the UI rolls back to the last confirmed value and explains why.',
  },
  'STATE-OFFLINE-01': {
    impactedUsers: 'offline and intermittent-connectivity users',
    remediation:
      'Queue safe writes, expose the pending state and drain the queue deterministically on reconnect.',
    verification:
      'Go offline, perform the action, reconnect; the queued write drains and conflicts are surfaced.',
  },
  'TOKEN-SPACING-01': {
    impactedUsers: 'all users (visual rhythm and grouping consistency)',
    remediation:
      'Replace off-scale values with the nearest 4px-base spacing token.',
    verification:
      'Assert every spacing value resolves to the spacing scale in the token graph.',
  },
  'TOKEN-RADIUS-01': {
    impactedUsers: 'all users (visual consistency)',
    remediation:
      'Pick the nearest radius-scale token and derive nested radii for concentric corners.',
    verification: 'Token lint confirms radii come from the 4/8/12/16/24 scale.',
  },
  'TOKEN-ELEVATION-01': {
    impactedUsers: 'all users (perceived structure and order)',
    remediation:
      'Replace z-index escalation with stacking-context isolation and semantic elevation tokens.',
    verification:
      'Overlay tests confirm layer order without values outside the named stacking layers.',
  },
  'MOTION-DURATION-01': {
    impactedUsers: 'all users (perceived responsiveness)',
    remediation:
      'Clamp duration to the shared 100–500ms vocabulary; make exits faster than entrances.',
    verification:
      'Motion lint asserts durations resolve to motion tokens inside the vocabulary.',
  },
  'MOTION-REDUCED-01': {
    impactedUsers:
      'users with vestibular disorders and reduced-motion preferences',
    remediation:
      'Provide a non-motion fallback under the prefers-reduced-motion media query that preserves meaning.',
    verification:
      'Emulate reduced motion; animations resolve to instant/cross-fade states with no loss of content.',
  },
  'RESP-HOVER-01': {
    impactedUsers: 'touch users and keyboard users',
    remediation:
      'Gate hover UI behind (hover: hover) and duplicate every hover action as a tap/keyboard path.',
    verification:
      'On a coarse-pointer emulation, every primary action remains reachable without hover.',
  },
  'RESP-PLACEMENT-01': {
    impactedUsers: 'mobile users and users on small viewports',
    remediation:
      'Make floating layers viewport-aware; promote them to sheets on coarse pointers.',
    verification:
      'Open the layer near each viewport edge; it flips, re-anchors or becomes a sheet without clipping.',
  },
  'CONTENT-EMPTY-01': {
    impactedUsers: 'first-time users and users facing zero results',
    remediation:
      'Classify the empty state and render an explanation with the next useful action.',
    verification:
      'Render each empty class (first-run, no-result, filtered, error) and assert its action is focusable.',
  },
  'CONTENT-ERROR-01': {
    impactedUsers: 'users recovering from failures',
    remediation:
      'Replace dead-end errors with human copy and a concrete recovery action.',
    verification:
      'Trigger each error; the message states what happened, why it matters and the next step.',
  },
  'CONTENT-CTA-01': {
    impactedUsers: 'all users deciding what to do next',
    remediation:
      'Rewrite the CTA as an outcome-oriented verb plus the object it acts on.',
    verification:
      'Copy review confirms no generic "Submit/OK" on meaningful or destructive actions.',
  },
  'FEEDBACK-DOHERTY-01': {
    impactedUsers: 'all users (perceived latency and confidence)',
    remediation:
      'Acknowledge within ~100ms; pair longer waits with skeleton, measured progress or optimism.',
    verification:
      'Trace the interaction; first feedback fires within 100ms and the waiting metaphor matches certainty.',
  },
  'FEEDBACK-TRUTHFUL-01': {
    impactedUsers: 'all users judging whether work is progressing',
    remediation:
      'Use real measured progress when available; use indeterminate spinners otherwise; never fake percentages.',
    verification:
      'Compare shown progress to actual completion; indeterminate work never renders a numeric bar.',
  },
  'FORM-VALIDATION-01': {
    impactedUsers:
      'users correcting input errors, especially with screen readers',
    remediation:
      'Validate on blur, switch to live correction after the first error, confirm success positively.',
    verification:
      'Type invalid data; no error appears before blur; after first error correction is live and announced.',
  },
  'FORM-LABEL-01': {
    impactedUsers:
      'screen-reader users and users who need persistent field context',
    remediation:
      'Add a persistent visible label associated with the input; never rely on placeholders alone.',
    verification:
      'Accessibility tree shows a labelled control for every input.',
  },
  'FORM-RECOVERY-01': {
    impactedUsers: 'users whose submissions fail',
    remediation:
      'Preserve entered values on error and describe the accepted format without deleting raw input.',
    verification:
      'Submit invalid data; all entries remain and the error links back to its field.',
  },
  'FORM-UPLOAD-01': {
    impactedUsers: 'users uploading files on slow or unstable connections',
    remediation:
      'Add drag feedback, per-file progress/ETA, resumable retry, previews and independent queues.',
    verification:
      'Throttle uploads; progress, pause/retry and per-file failure isolation all work.',
  },
  'NAV-UNDO-01': {
    impactedUsers: 'touch users and anyone acting by accident',
    remediation:
      'Duplicate gesture actions in an explicit menu and offer undo for destructive results.',
    verification:
      'Perform the gesture action; an explicit control and undo path both exist.',
  },
  'VISUAL-FOCAL-01': {
    impactedUsers: 'all users deciding where to act first',
    remediation:
      'Decide one focal point; demote competing primary actions to secondary styling or separate steps.',
    verification:
      'Squint test and hierarchy review show a single primary action per decision point.',
  },
  'SYSTEM-URLSTATE-01': {
    impactedUsers: 'users sharing, bookmarking or restoring list views',
    remediation: 'Mirror filters, search and pagination into URL query state.',
    verification:
      'Apply filters, reload, and share the URL; the identical view is restored.',
  },
  'SYSTEM-UNDO-01': {
    impactedUsers: 'all users performing reversible destructive work',
    remediation:
      'Soft-delete with a time-boxed undo snackbar; reserve hard confirmation for irreversible actions.',
    verification:
      'Delete then undo within the window; the record is restored and server state reconciles.',
  },
};

let findingCounter = 0;

function makeFinding(
  ruleId: string,
  evidence: string,
  component?: ComponentDescriptor,
  severityOverride?: Severity,
  confidence: Confidence = 'high',
): Finding {
  const rule = getRule(ruleId);
  const guidance = RULE_GUIDANCE[ruleId] ?? {
    impactedUsers: 'all users',
    remediation: rule.statement,
    verification: 'Re-run the engine audit after the change.',
  };
  const severity = severityOverride ?? rule.defaultSeverity;
  findingCounter += 1;
  return {
    id: `F${String(findingCounter).padStart(3, '0')}`,
    ruleId,
    title: rule.statement,
    severity,
    priority: PRIORITY_FOR[severity],
    confidence,
    impactedUsers: guidance.impactedUsers,
    evidence,
    remediation: guidance.remediation,
    verification: guidance.verification,
    patternIds: rule.patternIds,
    componentId: component?.id,
    location: component?.file
      ? `${component.file}${component.line ? `:${component.line}` : ''}`
      : component?.id,
  };
}

function locationLabel(component: ComponentDescriptor): string {
  return component.file
    ? `${component.file}${component.line ? `:${component.line}` : ''} (${component.id})`
    : component.id;
}

// ---------------------------------------------------------------------------
// Per-component checks
// ---------------------------------------------------------------------------

function auditComponent(
  component: ComponentDescriptor,
  screen: ScreenDescriptor,
): { findings: Finding[]; passes: PassRecord[] } {
  const findings: Finding[] = [];
  const passes: PassRecord[] = [];
  const label = locationLabel(component);
  const pass = (ruleId: string, evidence: string): void => {
    const rule = getRule(ruleId);
    passes.push({
      ruleId,
      title: rule.statement,
      evidence,
      patternIds: rule.patternIds,
    });
  };

  // --- Color contrast ------------------------------------------------------
  if (component.foreground && component.background) {
    const verdict = checkContrast(component.foreground, component.background, {
      textSizePx: component.textSizePx,
      bold: component.bold,
    });
    if (verdict.ratio < verdict.required) {
      findings.push(
        makeFinding(
          'A11Y-CONTRAST-01',
          `${label}: ${component.foreground} on ${component.background} measures ${verdict.ratio}:1; requirement is ${verdict.required}:1.`,
          component,
        ),
      );
    } else {
      pass(
        'A11Y-CONTRAST-01',
        `${label}: contrast ${verdict.ratio}:1 meets the ${verdict.required}:1 requirement.`,
      );
    }
  }

  // --- Touch targets -------------------------------------------------------
  if (typeof component.touchTargetPx === 'number') {
    const result = checkTouchTarget(component.touchTargetPx);
    if (!result.pass)
      findings.push(
        makeFinding(result.ruleId, `${label}: ${result.detail}`, component),
      );
    else pass(result.ruleId, `${label}: ${result.detail}`);
  }

  // --- Capability / interaction -------------------------------------------
  if (component.hoverOnlyAction) {
    findings.push(
      makeFinding(
        'RESP-HOVER-01',
        `${label}: a primary action is only reachable through hover.`,
        component,
      ),
    );
  }
  if (component.focusVisible === false) {
    findings.push(
      makeFinding(
        'A11Y-FOCUS-01',
        `${label}: no visible focus-visible treatment is declared.`,
        component,
      ),
    );
  }
  if (component.keyboardOperable === false) {
    findings.push(
      makeFinding(
        'A11Y-KEYBOARD-01',
        `${label}: the interaction is not keyboard operable.`,
        component,
      ),
    );
  }
  if (component.hasAccessibleName === false) {
    findings.push(
      makeFinding(
        'A11Y-NAME-01',
        `${label}: interactive element has no accessible name.`,
        component,
      ),
    );
  }
  if (component.domOrderMatchesVisual === false) {
    findings.push(
      makeFinding(
        'A11Y-KEYBOARD-01',
        `${label}: DOM order diverges from visual order.`,
        component,
      ),
    );
  }

  // --- Token-scale checks --------------------------------------------------
  const offScaleSpacing = (component.spacingPx ?? []).filter((value) => {
    const result = checkSpacing(value);
    return !result.pass;
  });
  if (offScaleSpacing.length > 0) {
    findings.push(
      makeFinding(
        'TOKEN-SPACING-01',
        `${label}: off-scale spacing values ${offScaleSpacing.join(', ')}px.`,
        component,
        'minor',
      ),
    );
  } else if (component.spacingPx?.length) {
    pass(
      'TOKEN-SPACING-01',
      `${label}: all spacing values sit on the 4px scale.`,
    );
  }
  if (
    typeof component.radiusPx === 'number' &&
    !checkRadius(component.radiusPx).pass
  ) {
    findings.push(
      makeFinding(
        'TOKEN-RADIUS-01',
        `${label}: radius ${component.radiusPx}px is off the shared scale.`,
        component,
      ),
    );
  }
  if (
    typeof component.zIndex === 'number' &&
    !checkZIndex(component.zIndex).pass
  ) {
    findings.push(
      makeFinding(
        'TOKEN-ELEVATION-01',
        `${label}: ${checkZIndex(component.zIndex).detail}`,
        component,
      ),
    );
  }
  if (typeof component.motionDurationMs === 'number') {
    const result = checkMotionDuration(component.motionDurationMs);
    if (!result.pass)
      findings.push(
        makeFinding(result.ruleId, `${label}: ${result.detail}`, component),
      );
    else if (!screen.reducedMotionSupported) {
      findings.push(
        makeFinding(
          'MOTION-REDUCED-01',
          `${label}: motion exists but no reduced-motion fallback is declared.`,
          component,
        ),
      );
    } else {
      pass(result.ruleId, `${label}: ${result.detail}`);
    }
  }

  // --- Feedback / loading --------------------------------------------------
  if (typeof component.feedbackMs === 'number') {
    if (component.feedbackMs > DOHERTY_FEEDBACK_MS) {
      const hasMetaphor = Boolean(
        component.loadingStrategy && component.loadingStrategy !== 'none',
      );
      if (!hasMetaphor) {
        findings.push(
          makeFinding(
            'FEEDBACK-DOHERTY-01',
            `${label}: first feedback takes ${component.feedbackMs}ms with no skeleton, progress or optimistic strategy.`,
            component,
            component.feedbackMs > 1000 ? 'critical' : 'major',
          ),
        );
      } else {
        pass(
          'FEEDBACK-DOHERTY-01',
          `${label}: wait over 100ms is paired with a ${component.loadingStrategy} strategy.`,
        );
      }
    } else {
      pass(
        'FEEDBACK-DOHERTY-01',
        `${label}: acknowledgement within ${component.feedbackMs}ms.`,
      );
    }
    if (component.loadingStrategy === 'none' && component.feedbackMs > 200) {
      findings.push(
        makeFinding(
          'FEEDBACK-TRUTHFUL-01',
          `${label}: work exceeds 200ms but declares no loading treatment.`,
          component,
        ),
      );
    }
  }

  // --- State completeness --------------------------------------------------
  const declaredLower = (component.declaredStates ?? []).map((state) =>
    state.toLowerCase(),
  );
  const matrix = buildStateMatrix(
    component.kind,
    component.declaredStates ?? [],
    {
      destructive: component.destructive,
      optimistic: component.optimistic,
      offlineQueue: declaredLower.includes('offline'),
    },
  );
  if (matrix.missing.length > 0) {
    findings.push(
      makeFinding(
        'STATE-COMPLETENESS-01',
        `${label}: missing required states for a ${component.kind}: ${matrix.missing.join(', ')}.`,
        component,
      ),
    );
  } else {
    pass(
      'STATE-COMPLETENESS-01',
      `${label}: all ${matrix.requiredStates.length} required states are declared.`,
    );
  }

  for (const problem of validateTransitions(
    component.kind,
    component.declaredStates ?? [],
    {
      optimistic: component.optimistic,
      rollback: component.rollback,
      destructive: component.destructive,
      undoAvailable: component.undoAvailable,
    },
  )) {
    findings.push(
      makeFinding(problem.ruleId, `${label}: ${problem.problem}`, component),
    );
  }

  const declared = (component.declaredStates ?? []).map((state) =>
    state.toLowerCase(),
  );
  if (
    declared.includes('disabled') &&
    component.disabledExplainsWhy === false
  ) {
    findings.push(
      makeFinding(
        'STATE-DISABLED-01',
        `${label}: disabled state gives no reachable explanation.`,
        component,
      ),
    );
  }

  // --- Content checks ------------------------------------------------------
  if (
    declared.includes('empty') &&
    (!component.emptyStateKind || component.emptyStateHasAction === false)
  ) {
    findings.push(
      makeFinding(
        'CONTENT-EMPTY-01',
        `${label}: empty state is not classified or has no next action.`,
        component,
      ),
    );
  }
  if (declared.includes('error') && component.errorHasRecovery === false) {
    findings.push(
      makeFinding(
        'CONTENT-ERROR-01',
        `${label}: error state offers no recovery action.`,
        component,
      ),
    );
  }
  if (component.kind === 'button' && component.ctaOutcomeOriented === false) {
    findings.push(
      makeFinding(
        'CONTENT-CTA-01',
        `${label}: button label is not outcome-oriented.`,
        component,
      ),
    );
  }

  // --- Form checks ---------------------------------------------------------
  if (
    (component.kind === 'text-field' || component.kind === 'form') &&
    component.validationTiming
  ) {
    if (
      component.validationTiming === 'on-submit-only' ||
      component.validationTiming === 'none'
    ) {
      findings.push(
        makeFinding(
          'FORM-VALIDATION-01',
          `${label}: validation timing is "${component.validationTiming}" instead of blur-first.`,
          component,
        ),
      );
    } else {
      pass(
        'FORM-VALIDATION-01',
        `${label}: ${component.validationTiming} validation follows the timing rule.`,
      );
    }
  }
  if (component.labelsVisible === false) {
    findings.push(
      makeFinding(
        'FORM-LABEL-01',
        `${label}: input has no persistent visible label.`,
        component,
      ),
    );
  }
  if (component.kind === 'upload' && component.showsProgress === false) {
    findings.push(
      makeFinding(
        'FORM-UPLOAD-01',
        `${label}: upload declares no progress/ETA feedback.`,
        component,
      ),
    );
  }

  return { findings, passes };
}

// ---------------------------------------------------------------------------
// Screen-level audit
// ---------------------------------------------------------------------------

export function auditScreen(screen: ScreenDescriptor): AuditReport {
  findingCounter = 0;
  const findings: Finding[] = [];
  const passes: PassRecord[] = [];
  const pass = (ruleId: string, evidence: string): void => {
    const rule = getRule(ruleId);
    passes.push({
      ruleId,
      title: rule.statement,
      evidence,
      patternIds: rule.patternIds,
    });
  };

  for (const component of screen.components) {
    const result = auditComponent(component, screen);
    findings.push(...result.findings);
    passes.push(...result.passes);
  }

  // Single focal point
  if (screen.competingPrimaryActions > 1) {
    findings.push(
      makeFinding(
        'VISUAL-FOCAL-01',
        `${screen.route}: ${screen.competingPrimaryActions} competing primary actions fight for the focal point.`,
      ),
    );
  } else {
    pass(
      'VISUAL-FOCAL-01',
      `${screen.route}: one focal point / primary action per decision point.`,
    );
  }

  // Reduced motion at screen level
  if (
    !screen.reducedMotionSupported &&
    screen.components.some((c) => typeof c.motionDurationMs === 'number')
  ) {
    findings.push(
      makeFinding(
        'MOTION-REDUCED-01',
        `${screen.route}: screen uses motion without a reduced-motion strategy.`,
      ),
    );
  }

  // Capability coverage
  if (screen.pointer === 'coarse' && !screen.viewports.includes('mobile')) {
    findings.push(
      makeFinding(
        'RESP-PLACEMENT-01',
        `${screen.route}: coarse-pointer audience but no mobile viewport is planned.`,
      ),
    );
  }

  // URL state for list-like components
  const urlStateKinds = new Set(['search', 'table', 'pagination', 'filter']);
  const needsUrlState = screen.components.some((component) =>
    urlStateKinds.has(component.kind),
  );
  if (needsUrlState && !screen.urlState) {
    findings.push(
      makeFinding(
        'SYSTEM-URLSTATE-01',
        `${screen.route}: list position is not mirrored into URL state.`,
        undefined,
        'nice',
      ),
    );
  }

  // Offline queue consistency
  const declaresOffline = screen.components.some((component) =>
    (component.declaredStates ?? [])
      .map((state) => state.toLowerCase())
      .includes('offline'),
  );
  if (declaresOffline && !screen.offlineQueue) {
    findings.push(
      makeFinding(
        'STATE-OFFLINE-01',
        `${screen.route}: offline state declared but no queue/drain mechanism is defined.`,
      ),
    );
  }

  // --- Pattern matches across the whole screen -----------------------------
  const patternScores = new Map<
    string,
    { score: number; reasons: Set<string> }
  >();
  const goalMatches = retrievePatterns({
    text: `${screen.goal} ${screen.tasks.join(' ')}`,
    limit: 12,
  });
  for (const match of goalMatches) {
    const entry = patternScores.get(match.pattern.id) ?? {
      score: 0,
      reasons: new Set<string>(),
    };
    entry.score += match.score;
    match.reasons.forEach((reason) => entry.reasons.add(reason));
    patternScores.set(match.pattern.id, entry);
  }
  for (const component of screen.components) {
    for (const match of retrievePatterns({
      text: `${component.kind} ${component.label ?? ''}`,
      componentKinds: [component.kind],
      limit: 4,
    })) {
      const entry = patternScores.get(match.pattern.id) ?? {
        score: 0,
        reasons: new Set<string>(),
      };
      entry.score += match.score;
      entry.reasons.add(`governs ${component.id} (${component.kind})`);
      patternScores.set(match.pattern.id, entry);
    }
  }
  const patternMatches: PatternMatch[] = [...patternScores.entries()]
    .map(([patternId, entry]) => ({
      patternId,
      score: entry.score,
      reasons: [...entry.reasons].slice(0, 4),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  // --- Score, grade and prioritisation -------------------------------------
  const penalty = findings.reduce(
    (sum, finding) => sum + SEVERITY_WEIGHT[finding.severity],
    0,
  );
  const score = Math.max(0, 100 - penalty);
  const grade: Grade =
    score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';

  const counts: Record<Severity, number> = {
    critical: 0,
    major: 0,
    minor: 0,
    nice: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;

  const topFixes = [...findings]
    .sort(
      (a, b) =>
        SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity] ||
        CONFIDENCE_WEIGHT[b.confidence] - CONFIDENCE_WEIGHT[a.confidence],
    )
    .slice(0, 3);

  return {
    screenId: screen.id,
    score,
    grade,
    findings,
    passes,
    topFixes,
    patternMatches,
    counts,
    generatedAt: new Date().toISOString(),
  };
}
