/**
 * Rule catalog — the executable policy of the engine.
 *
 * Rules are deterministic: given the same descriptor, the constraint and audit
 * engines always reach the same verdict. Each rule points at the patterns that
 * establish it, so every finding can be traced back to evidence instead of
 * presenting itself as an unexplained opinion.
 */
import type { EngineRule } from './types';

export const RULES: EngineRule[] = [
  // --- Accessibility -------------------------------------------------------
  {
    id: 'A11Y-CONTRAST-01',
    family: 'A11Y',
    statement:
      'Text and meaningful graphics must meet WCAG AA contrast: 4.5:1 for normal text, 3:1 for large text (24px+ or 18.67px bold) and UI components.',
    defaultSeverity: 'critical',
    patternIds: ['P70', 'P55', 'P53'],
  },
  {
    id: 'A11Y-CONTRAST-02',
    family: 'A11Y',
    statement:
      'Meaning must never be encoded by colour alone; pair every colour signal with an icon, text or shape.',
    defaultSeverity: 'major',
    patternIds: ['P70', 'P59'],
  },
  {
    id: 'A11Y-TARGET-01',
    family: 'A11Y',
    statement:
      'Interactive targets need at least a 44x44px touch area (a 24px icon may sit inside a larger hit area).',
    defaultSeverity: 'major',
    patternIds: ['P6', 'P33', 'P20'],
  },
  {
    id: 'A11Y-FOCUS-01',
    family: 'A11Y',
    statement:
      'Every interactive element exposes a visible, high-contrast :focus-visible ring; focus is trapped in overlays and restored on close.',
    defaultSeverity: 'critical',
    patternIds: ['P46', 'P65'],
  },
  {
    id: 'A11Y-KEYBOARD-01',
    family: 'A11Y',
    statement:
      'Every action reachable by mouse is reachable by keyboard, with DOM order matching visual order and no keyboard traps.',
    defaultSeverity: 'critical',
    patternIds: ['P46', 'P10', 'P19', 'P20'],
  },
  {
    id: 'A11Y-NAME-01',
    family: 'A11Y',
    statement:
      'Interactive elements carry an accessible name from visible text, aria-label, aria-labelledby or an image alt.',
    defaultSeverity: 'major',
    patternIds: ['P46', 'P66'],
  },
  {
    id: 'A11Y-SEMANTICS-01',
    family: 'A11Y',
    statement:
      'Custom widgets use correct roles and ARIA states (e.g. accordion button + aria-expanded, toggle role="switch").',
    defaultSeverity: 'major',
    patternIds: ['P62', 'P41', 'P39'],
  },

  // --- State completeness --------------------------------------------------
  {
    id: 'STATE-COMPLETENESS-01',
    family: 'STATE',
    statement:
      'Every meaningful component state is enumerated before implementation: default, focus, loading, success, error and the states specific to the component.',
    defaultSeverity: 'major',
    patternIds: ['P24', 'P28'],
  },
  {
    id: 'STATE-ERROR-01',
    family: 'STATE',
    statement:
      'Any component that can fail declares an error state explaining what happened, why it matters and the next recovery action.',
    defaultSeverity: 'major',
    patternIds: ['P23'],
  },
  {
    id: 'STATE-LOADING-01',
    family: 'STATE',
    statement:
      'Any component with asynchronous work declares a loading/pending state that preserves focus and blocks duplicate submissions.',
    defaultSeverity: 'major',
    patternIds: ['P28', 'P54', 'P18'],
  },
  {
    id: 'STATE-DISABLED-01',
    family: 'STATE',
    statement:
      'A blocked control explains why it is blocked and keeps the explanation reachable; disabled is never confused with loading.',
    defaultSeverity: 'minor',
    patternIds: ['P5'],
  },
  {
    id: 'STATE-DESTRUCTIVE-01',
    family: 'STATE',
    statement:
      'Destructive actions use an explicit verb with friction proportional to irreversibility; reversible destruction prefers undo over confirmation.',
    defaultSeverity: 'critical',
    patternIds: ['P11', 'P48', 'P4'],
  },
  {
    id: 'STATE-OPTIMISTIC-01',
    family: 'STATE',
    statement:
      'Optimistic updates are only used for reversible work and always include server reconciliation plus a clean rollback path.',
    defaultSeverity: 'major',
    patternIds: ['P52', 'P17', 'P14', 'P41'],
  },
  {
    id: 'STATE-OFFLINE-01',
    family: 'STATE',
    statement:
      'Offline-capable flows queue safe work, expose the pending state and drain the queue deterministically when connectivity returns.',
    defaultSeverity: 'minor',
    patternIds: ['P15', 'P52'],
  },
  {
    id: 'STATE-FEEDBACK-01',
    family: 'STATE',
    statement:
      'Pressed/active feedback arrives within roughly 100ms so the interface feels directly coupled to the input.',
    defaultSeverity: 'minor',
    patternIds: ['P18', 'P9'],
  },

  // --- Tokens / design system ----------------------------------------------
  {
    id: 'TOKEN-SPACING-01',
    family: 'TOKEN',
    statement:
      'Spacing uses the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64); off-scale values are treated as design-system drift.',
    defaultSeverity: 'minor',
    patternIds: ['P13', 'P69', 'P32'],
  },
  {
    id: 'TOKEN-RADIUS-01',
    family: 'TOKEN',
    statement:
      'Border radii come from the shared scale (4, 8, 12, 16, 24) and nested radii are derived to preserve concentric corners.',
    defaultSeverity: 'nice',
    patternIds: ['P72', 'P13'],
  },
  {
    id: 'TOKEN-GRAPH-01',
    family: 'TOKEN',
    statement:
      'Tokens form a primitive → semantic → component graph; no component token may reference a hard-coded value or an orphan primitive.',
    defaultSeverity: 'major',
    patternIds: ['P69', 'P13'],
  },
  {
    id: 'TOKEN-ELEVATION-01',
    family: 'TOKEN',
    statement:
      'Shadow elevation communicates semantic layering; decoration-only shadows and z-index escalation are replaced by stacking-context isolation.',
    defaultSeverity: 'minor',
    patternIds: ['P36', 'P44', 'P76'],
  },
  {
    id: 'TOKEN-DARK-01',
    family: 'TOKEN',
    statement:
      'Dark mode uses a near-black base, layered surfaces, calmer accents and opacity-based text hierarchy rather than inverted light colours.',
    defaultSeverity: 'minor',
    patternIds: ['P73'],
  },

  // --- Motion --------------------------------------------------------------
  {
    id: 'MOTION-DURATION-01',
    family: 'MOTION',
    statement:
      'Motion uses the shared 100–500ms vocabulary with purpose-based timing: fast feedback, faster exits, deliberate attention motion.',
    defaultSeverity: 'minor',
    patternIds: ['P9', 'P21', 'P13'],
  },
  {
    id: 'MOTION-REDUCED-01',
    family: 'MOTION',
    statement:
      'Every animated surface honours prefers-reduced-motion with a non-motion fallback that preserves meaning.',
    defaultSeverity: 'major',
    patternIds: ['P9', 'P68', 'P21'],
  },

  // --- Responsive / capability ---------------------------------------------
  {
    id: 'RESP-HOVER-01',
    family: 'RESPONSIVE',
    statement:
      'Hover is an optional enhancement, never the sole path to a primary action; capability queries gate hover-only UI and touch targets stay ≥44px.',
    defaultSeverity: 'critical',
    patternIds: ['P6', 'P47'],
  },
  {
    id: 'RESP-PLACEMENT-01',
    family: 'RESPONSIVE',
    statement:
      'Floating layers (menus, tooltips, dropdowns) are viewport-aware: they flip, re-anchor or move to a sheet on small screens.',
    defaultSeverity: 'major',
    patternIds: ['P10', 'P42', 'P20', 'P49'],
  },
  {
    id: 'RESP-NAV-01',
    family: 'RESPONSIVE',
    statement:
      'Primary navigation adapts to viewport and pointer (bar → compact menu/sheet) while preserving hierarchy and accelerators.',
    defaultSeverity: 'minor',
    patternIds: ['P29', 'P49'],
  },
  {
    id: 'RESP-GRID-01',
    family: 'RESPONSIVE',
    statement:
      'Layouts collapse from the 12-column grid on shared edges and intentional gutters, driven by available space rather than user-agent guesses.',
    defaultSeverity: 'nice',
    patternIds: ['P26', 'P25'],
  },

  // --- Content / microcopy -------------------------------------------------
  {
    id: 'CONTENT-EMPTY-01',
    family: 'CONTENT',
    statement:
      'Empty states are classified (first-run, no-result, filtered, error) and each explains why it is empty plus the next useful action.',
    defaultSeverity: 'minor',
    patternIds: ['P22', 'P51'],
  },
  {
    id: 'CONTENT-ERROR-01',
    family: 'CONTENT',
    statement:
      'Error copy is human, states what happened and why it matters, and always offers a concrete recovery action.',
    defaultSeverity: 'major',
    patternIds: ['P23', 'P51'],
  },
  {
    id: 'CONTENT-CTA-01',
    family: 'CONTENT',
    statement:
      'Calls to action are outcome-oriented verbs; destructive CTAs name the thing being destroyed instead of generic "OK/Submit".',
    defaultSeverity: 'minor',
    patternIds: ['P51', 'P11', 'P2'],
  },
  {
    id: 'CONTENT-TONE-01',
    family: 'CONTENT',
    statement:
      'Microcopy matches the user goal and tone constraints: concise labels, no blame, no manufactured urgency.',
    defaultSeverity: 'nice',
    patternIds: ['P51', 'P45'],
  },

  // --- Feedback / loading --------------------------------------------------
  {
    id: 'FEEDBACK-DOHERTY-01',
    family: 'FEEDBACK',
    statement:
      'The interface acknowledges input within ~100ms; work exceeding that uses skeleton, progress or optimism selected by shape, duration and certainty.',
    defaultSeverity: 'major',
    patternIds: ['P18', 'P28', 'P54'],
  },
  {
    id: 'FEEDBACK-TRUTHFUL-01',
    family: 'FEEDBACK',
    statement:
      'Progress and busy semantics are truthful: real progress shows measured progress, indeterminate work uses a spinner, and placeholders keep content shape.',
    defaultSeverity: 'major',
    patternIds: ['P28', 'P54', 'P56'],
  },
  {
    id: 'FEEDBACK-TOAST-01',
    family: 'FEEDBACK',
    statement:
      'Notifications match severity and persistence: toast for transient status (queued, pausable, dismissible), banner/modal for blocking issues.',
    defaultSeverity: 'minor',
    patternIds: ['P40', 'P30'],
  },

  // --- Forms ----------------------------------------------------------------
  {
    id: 'FORM-VALIDATION-01',
    family: 'FORM',
    statement:
      'Validation is blur-first, switches to live correction after an error, and gives positive success feedback; submit-only validation is avoided.',
    defaultSeverity: 'major',
    patternIds: ['P50', 'P24'],
  },
  {
    id: 'FORM-LABEL-01',
    family: 'FORM',
    statement:
      'Every input has a persistent visible label; placeholders are not substituted for labels.',
    defaultSeverity: 'major',
    patternIds: ['P24', 'P57'],
  },
  {
    id: 'FORM-RECOVERY-01',
    family: 'FORM',
    statement:
      'Forms preserve entered data on error, expose recovery, and communicate input formatting without deleting raw values.',
    defaultSeverity: 'major',
    patternIds: ['P24', 'P27', 'P23'],
  },
  {
    id: 'FORM-UPLOAD-01',
    family: 'FORM',
    statement:
      'Uploads show drag feedback, real progress/ETA, resumable retry, previews and independent per-file queues.',
    defaultSeverity: 'minor',
    patternIds: ['P56'],
  },

  // --- Navigation / spatial ------------------------------------------------
  {
    id: 'NAV-HIERARCHY-01',
    family: 'NAV',
    statement:
      'Overlays are chosen by interruption level: modal for blocking focus, sheet/drawer for preserved context, popover for lightweight choice.',
    defaultSeverity: 'minor',
    patternIds: ['P65', 'P49'],
  },
  {
    id: 'NAV-UNDO-01',
    family: 'NAV',
    statement:
      'Swipe and bulk actions are discoverable, reversible and never the only available action path; destructive bulk work offers undo.',
    defaultSeverity: 'major',
    patternIds: ['P47', 'P4', 'P48'],
  },

  // --- Visual hierarchy ----------------------------------------------------
  {
    id: 'VISUAL-FOCAL-01',
    family: 'VISUAL',
    statement:
      'Each screen establishes one focal point using size, accent, contrast, whitespace and weight; competing primary actions split attention.',
    defaultSeverity: 'major',
    patternIds: ['P43', 'P74', 'P2'],
  },
  {
    id: 'VISUAL-GROUPING-01',
    family: 'VISUAL',
    statement:
      'Whitespace and proximity communicate semantic grouping (Gestalt common region); related controls share tighter spacing than unrelated groups.',
    defaultSeverity: 'nice',
    patternIds: ['P32', 'P71', 'P75'],
  },
  {
    id: 'VISUAL-DEPTH-01',
    family: 'VISUAL',
    statement:
      'Depth is built from layered shadows, subtle parallax and restrained translation; hover lift never changes an element’s footprint.',
    defaultSeverity: 'nice',
    patternIds: ['P76', 'P64', 'P36'],
  },
  {
    id: 'VISUAL-CHART-01',
    family: 'VISUAL',
    statement:
      'Charts match the question, preserve truthful zero-based axes where magnitude matters and maximise data-ink.',
    defaultSeverity: 'major',
    patternIds: ['P8'],
  },

  // --- System / architecture -----------------------------------------------
  {
    id: 'SYSTEM-AUTOSAVE-01',
    family: 'SYSTEM',
    statement:
      'Autosave runs as a debounced state machine with an offline queue, truthful status text and explicit conflict handling.',
    defaultSeverity: 'minor',
    patternIds: ['P15', 'P17'],
  },
  {
    id: 'SYSTEM-URLSTATE-01',
    family: 'SYSTEM',
    statement:
      'List position (filters, pagination, search) is preserved in URL state so views are shareable and survivable.',
    defaultSeverity: 'nice',
    patternIds: ['P61', 'P34', 'P59'],
  },
  {
    id: 'SYSTEM-UNDO-01',
    family: 'SYSTEM',
    statement:
      'Reversible work uses soft-delete plus undo; confirmation friction is reserved for genuinely irreversible actions.',
    defaultSeverity: 'major',
    patternIds: ['P48', 'P11', 'P14'],
  },
];

const ruleIndex = new Map(RULES.map((rule) => [rule.id, rule]));

export function getRule(id: string): EngineRule {
  const rule = ruleIndex.get(id);
  if (!rule) throw new Error(`Unknown engine rule: ${id}`);
  return rule;
}

export function rulesForPattern(patternId: string): EngineRule[] {
  return RULES.filter((rule) => rule.patternIds.includes(patternId));
}
