/**
 * Pattern Knowledge Layer — the 76-pattern catalog.
 *
 * Each record is the kind of file a senior designer would keep: summary,
 * evidence, executable rules, do/don't guidance, thresholds, accessibility and
 * responsive implications, composition (`related`) and trade-offs
 * (`conflicts`). The retrieval, audit and command layers never invent
 * guidance — they read these records and cite them.
 */
import type { UXPattern } from './types';

export const PATTERNS: UXPattern[] = [
  {
    id: 'P1',
    number: 1,
    title: 'CSS :has()',
    slug: 'css-has-selector',
    domain: 'state',
    summary:
      'DOM-native state, validation, layout and modal state without duplicated JS state.',
    evidence: 'css-has-selector.mp4',
    ruleIds: ['STATE-COMPLETENESS-01'],
    do: [
      'Drive styling from actual DOM state with :has() where supported',
      'Keep one source of truth instead of mirroring state in JS',
    ],
    dont: [
      'Duplicate open/invalid/selected state across JS flags and CSS classes',
      'Use :has() for semantics that ARIA roles already provide',
    ],
    thresholds: [],
    accessibility: [
      'CSS state must be paired with real ARIA states for assistive tech',
    ],
    responsive: [
      'Capabilities and container state, not viewport sniffing, drive layout changes',
    ],
    tags: ['css', 'state', 'dom', 'native', 'validation'],
    related: ['P24', 'P46', 'P13'],
    conflicts: [],
  },
  {
    id: 'P2',
    number: 2,
    title: 'De-AI Landing Hero',
    slug: 'de-ai-landing-hero',
    domain: 'content',
    summary:
      'Concrete outcomes, product evidence, single primary CTA and credible proof replace generic hype.',
    evidence: 'de-ai-landing-hero.mp4',
    ruleIds: ['VISUAL-FOCAL-01', 'CONTENT-CTA-01'],
    do: [
      'Lead with a concrete outcome the visitor can verify',
      'Keep one primary CTA and back claims with evidence',
    ],
    dont: [
      'Stack vague adjectives and multiple competing CTAs',
      'Promise outcomes without proof',
    ],
    thresholds: ['1 primary CTA per hero'],
    accessibility: [
      'Proof imagery needs descriptive alt text; text must not live inside images only',
    ],
    responsive: [
      'The single CTA remains thumb-reachable when the hero collapses on mobile',
    ],
    tags: ['landing', 'hero', 'copy', 'cta', 'credibility'],
    related: ['P67', 'P43', 'P74'],
    conflicts: [],
  },
  {
    id: 'P3',
    number: 3,
    title: 'Reverse-Engineered Linear',
    slug: 'reverse-engineered-linear',
    domain: 'visual',
    summary:
      'Dense information hierarchy, value-based depth, one accent, shortcuts and strict 4px alignment.',
    evidence: 'reverse-engineered-linear.mp4',
    ruleIds: ['VISUAL-FOCAL-01', 'TOKEN-SPACING-01'],
    do: [
      'Reserve one accent colour for the single highest-value action',
      'Build density on a strict 4px alignment grid',
    ],
    dont: [
      'Spread accent colour across competing elements',
      'Compensate for density with heavier shadows',
    ],
    thresholds: ['4px alignment grid', '1 accent colour'],
    accessibility: [
      'Dense UI still needs 4.5:1 text contrast and visible focus rings',
    ],
    responsive: [
      'Density reduces via density tokens, not by removing information hierarchy',
    ],
    tags: ['density', 'hierarchy', 'depth', 'shortcuts', 'alignment'],
    related: ['P43', 'P13', 'P36'],
    conflicts: [],
  },
  {
    id: 'P4',
    number: 4,
    title: 'Bulk Actions',
    slug: 'bulk-actions',
    domain: 'state',
    summary:
      'Three-state selection, explicit scope and counts, persistent IDs and undo for destructive bulk work.',
    evidence: 'bulk-actions.mp4',
    ruleIds: ['NAV-UNDO-01', 'STATE-DESTRUCTIVE-01'],
    do: [
      'Show selected count and exact scope before acting',
      'Act on persistent IDs, not row indices, and offer undo',
    ],
    dont: [
      'Destroy in bulk without an undo window',
      'Let selection silently reset on pagination',
    ],
    thresholds: ['Undo window for reversible destruction'],
    accessibility: [
      'Selection checkboxes expose aria-checked and a bulk-select label',
    ],
    responsive: ['Bulk bar stays reachable above thumb zones on small screens'],
    tags: ['selection', 'bulk', 'undo', 'tables', 'destructive'],
    related: ['P48', 'P11', 'P63'],
    conflicts: [],
  },
  {
    id: 'P5',
    number: 5,
    title: 'Disabled Buttons',
    slug: 'disabled-buttons',
    domain: 'forms',
    summary:
      'Prefer reachable validation and explanation; distinguish disabled from loading.',
    evidence: 'disabled-buttons.mp4',
    ruleIds: ['STATE-DISABLED-01'],
    do: [
      'Keep the button reachable and explain what blocks submission',
      'Use a distinct loading state for in-flight work',
    ],
    dont: [
      'Hide the reason behind a dead, non-focusable control',
      'Style loading and disabled identically',
    ],
    thresholds: [],
    accessibility: [
      'A disabled control must not remove keyboard access to the explanation',
    ],
    responsive: [
      'Validation explanations reflow below inputs on narrow screens',
    ],
    tags: ['buttons', 'disabled', 'validation', 'forms'],
    related: ['P50', 'P24', 'P28'],
    conflicts: ['P52'],
  },
  {
    id: 'P6',
    number: 6,
    title: 'Hover Trap',
    slug: 'hover-trap',
    domain: 'accessibility',
    summary:
      'Treat hover as optional enhancement; use capability queries and 44px touch targets.',
    evidence: 'hover-trap.mp4',
    ruleIds: ['RESP-HOVER-01', 'A11Y-TARGET-01'],
    do: [
      'Gate hover-only UI behind @media (hover: hover)',
      'Provide a tap/click path for every hover action',
    ],
    dont: [
      'Make hover the only way to reach a primary action',
      'Shrink hit areas below 44px on touch devices',
    ],
    thresholds: ['44x44px minimum touch target'],
    accessibility: [
      'Keyboard and touch users can complete every action hover users can',
    ],
    responsive: ['Pointer/hover capability queries replace device assumptions'],
    tags: ['hover', 'touch', 'capability', 'responsive', 'a11y'],
    related: ['P47', 'P33', 'P20'],
    conflicts: ['P64'],
  },
  {
    id: 'P7',
    number: 7,
    title: 'Date Pickers',
    slug: 'date-pickers',
    domain: 'input',
    summary:
      'Presets first, efficient custom ranges, keyboard parity and mobile sheets.',
    evidence: 'date-pickers.mp4',
    ruleIds: ['A11Y-KEYBOARD-01', 'RESP-PLACEMENT-01'],
    do: [
      'Offer presets before forcing calendar navigation',
      'Support full keyboard entry and arrow-key calendar movement',
    ],
    dont: [
      'Trap mobile users in a tiny hover calendar',
      'Reject typed dates the calendar would accept',
    ],
    thresholds: [],
    accessibility: [
      'Calendar grid exposes arrow-key navigation and an accessible label',
    ],
    responsive: ['Calendar becomes a bottom sheet on coarse pointers'],
    tags: ['date', 'picker', 'keyboard', 'mobile-sheet', 'presets'],
    related: ['P49', 'P20', 'P38'],
    conflicts: [],
  },
  {
    id: 'P8',
    number: 8,
    title: 'Charts That Lie',
    slug: 'charts-that-lie',
    domain: 'data-display',
    summary:
      'Match chart to question, preserve truthful axes, maximise data-ink and encode colour deliberately.',
    evidence: 'charts-that-lie.mp4',
    ruleIds: ['VISUAL-CHART-01', 'A11Y-CONTRAST-02'],
    do: [
      'Pick the chart that answers the actual question',
      'Keep zero-based magnitude axes and label directly',
    ],
    dont: [
      'Truncate axes to exaggerate change',
      'Use colour as the only encoded signal',
    ],
    thresholds: [],
    accessibility: [
      'Pair colour encoding with shapes/labels and accessible data tables',
    ],
    responsive: ['Dense charts re-encode or tabulate on narrow viewports'],
    tags: ['charts', 'data-viz', 'truthfulness', 'axes', 'data-ink'],
    related: ['P70', 'P63', 'P59'],
    conflicts: [],
  },
  {
    id: 'P9',
    number: 9,
    title: 'Animation Timing',
    slug: 'animation-timing',
    domain: 'motion',
    summary:
      'Purpose-based durations: fast feedback, faster exits, deliberate attention motion.',
    evidence: 'animation-timing.mp4',
    ruleIds: ['MOTION-DURATION-01', 'MOTION-REDUCED-01', 'STATE-FEEDBACK-01'],
    do: [
      'Exit faster than you enter to keep perceived speed high',
      'Pick duration from the shared 100–500ms vocabulary',
    ],
    dont: [
      'Animate decoration on a slow, uniform timer',
      'Remove meaning when reduced motion is requested',
    ],
    thresholds: ['100–500ms shared duration range'],
    accessibility: [
      'Honour prefers-reduced-motion with instant or cross-fade fallbacks',
    ],
    responsive: [
      'Motion shortens on small screens where travel distances are smaller',
    ],
    tags: ['motion', 'duration', 'timing', 'reduced-motion'],
    related: ['P21', 'P18', 'P68'],
    conflicts: [],
  },
  {
    id: 'P10',
    number: 10,
    title: 'Context Menu',
    slug: 'context-menu',
    domain: 'navigation',
    summary:
      'Viewport-aware placement, grouped actions, safe submenus and keyboard/long-press parity.',
    evidence: 'context-menu.mp4',
    ruleIds: ['RESP-PLACEMENT-01', 'A11Y-KEYBOARD-01'],
    do: [
      'Flip/re-anchor within the viewport and group actions by intent',
      'Provide long-press and keyboard alternatives',
    ],
    dont: [
      'Let submenus clip off-screen',
      'Make right-click the only discovery path',
    ],
    thresholds: [],
    accessibility: [
      'Full roving-tabindex keyboard navigation and Escape dismissal',
    ],
    responsive: [
      'Becomes an action sheet with thumb-reachable destructive items',
    ],
    tags: ['menu', 'contextual', 'placement', 'keyboard', 'long-press'],
    related: ['P20', 'P42', 'P65'],
    conflicts: [],
  },
  {
    id: 'P11',
    number: 11,
    title: 'Destructive Actions',
    slug: 'destructive-actions',
    domain: 'state',
    summary:
      'Explicit verbs, friction proportional to irreversibility, danger zones and recovery.',
    evidence: 'destructive-actions.mp4',
    ruleIds: ['STATE-DESTRUCTIVE-01', 'CONTENT-CTA-01', 'SYSTEM-UNDO-01'],
    do: [
      'Name the thing being destroyed in the verb ("Delete project")',
      'Scale friction to irreversibility and offer recovery',
    ],
    dont: [
      'Use generic "OK/Submit" on a destructive confirm',
      'Apply equal friction to reversible and irreversible work',
    ],
    thresholds: [],
    accessibility: [
      'Destructive triggers are clearly labelled and reachable, not hover-gated',
    ],
    responsive: [
      'Confirmations use sheets with the confirm button in thumb reach',
    ],
    tags: [
      'destructive',
      'friction',
      'confirmation',
      'recovery',
      'danger-zone',
    ],
    related: ['P48', 'P4', 'P65'],
    conflicts: ['P48'],
  },
  {
    id: 'P12',
    number: 12,
    title: 'Live Cursors',
    slug: 'live-cursors',
    domain: 'system',
    summary:
      'Interpolate streamed positions, stable identity colours, locks and follow mode.',
    evidence: 'live-cursors.mp4',
    ruleIds: ['STATE-FEEDBACK-01'],
    do: [
      'Interpolate between streamed points and keep identity colours stable',
      'Pair presence with edit locks to avoid clobbering',
    ],
    dont: [
      'Jump cursors to raw stream coordinates',
      'Rely on colour alone to identify participants',
    ],
    thresholds: [],
    accessibility: [
      'Presence is announced textually; motion can be reduced without losing locks',
    ],
    responsive: [
      'Cursor features degrade to presence avatars on small screens',
    ],
    tags: ['realtime', 'cursors', 'collaboration', 'presence', 'locks'],
    related: ['P52', 'P9', 'P70'],
    conflicts: [],
  },
  {
    id: 'P13',
    number: 13,
    title: 'Design System Kit',
    slug: 'design-system-kit',
    domain: 'system',
    summary:
      'Semantic tokens, scales, standardized component variants and motion tokens.',
    evidence: 'design-system-kit.mp4',
    ruleIds: [
      'TOKEN-GRAPH-01',
      'TOKEN-SPACING-01',
      'TOKEN-RADIUS-01',
      'MOTION-DURATION-01',
    ],
    do: [
      'Consume semantic tokens, never primitive values, in components',
      'Standardize variants and motion on shared scales',
    ],
    dont: [
      'Hard-code hex or one-off spacing in component code',
      'Fork component variants per page',
    ],
    thresholds: [
      '4px spacing scale',
      '4/8/12/16/24 radius scale',
      '100–500ms motion',
    ],
    accessibility: [
      'Focus ring and contrast tokens are part of the kit, not local overrides',
    ],
    responsive: ['Density and breakpoint tokens encode responsive behavior'],
    tags: ['design-system', 'tokens', 'variants', 'scales'],
    related: ['P69', 'P72', 'P26'],
    conflicts: [],
  },
  {
    id: 'P14',
    number: 14,
    title: 'Inline Editing',
    slug: 'inline-editing',
    domain: 'forms',
    summary:
      'Preserve geometry, clear commit/cancel behavior, optimistic save and rollback.',
    evidence: 'inline-editing.mp4',
    ruleIds: ['STATE-OPTIMISTIC-01', 'SYSTEM-UNDO-01'],
    do: [
      'Keep the editing footprint identical to the display footprint',
      'Commit/cancel explicitly and roll back failed saves',
    ],
    dont: [
      'Shift layout when entering edit mode',
      'Save silently with no way to undo',
    ],
    thresholds: [],
    accessibility: [
      'Edit mode is keyboard activatable with Escape to cancel and focus preserved',
    ],
    responsive: ['Small screens promote inline editing to a focused sheet'],
    tags: ['inline-edit', 'optimistic', 'rollback', 'forms'],
    related: ['P52', 'P17', 'P48'],
    conflicts: [],
  },
  {
    id: 'P15',
    number: 15,
    title: 'Autosave',
    slug: 'autosave-ux',
    domain: 'system',
    summary:
      'Debounced state machine, offline queue, truthful status and conflict handling.',
    evidence: 'autosave-ux.mp4',
    ruleIds: ['SYSTEM-AUTOSAVE-01', 'STATE-OFFLINE-01'],
    do: [
      'Debounce saves and show truthful saved/saving/error status',
      'Queue offline edits and surface conflicts explicitly',
    ],
    dont: [
      'Show "saved" before the server confirms',
      'Drop queued work without telling the user',
    ],
    thresholds: ['Debounced save window'],
    accessibility: ['Save status uses an aria-live region, not colour alone'],
    responsive: [
      'Status collapses to an icon with accessible label on narrow screens',
    ],
    tags: ['autosave', 'offline', 'queue', 'conflict', 'status'],
    related: ['P52', 'P17', 'P23'],
    conflicts: [],
  },
  {
    id: 'P16',
    number: 16,
    title: 'Settings System',
    slug: 'settings-system',
    domain: 'forms',
    summary:
      'Group by task, risk-based apply behavior, search, reset and guarded destruction.',
    evidence: 'settings-system.mp4',
    ruleIds: ['STATE-DESTRUCTIVE-01', 'FORM-RECOVERY-01'],
    do: [
      'Group settings around user tasks and make reset explicit',
      'Guard destructive settings separately from preferences',
    ],
    dont: [
      'Apply high-risk changes the same way as theme toggles',
      'Hide reset/danger actions in unrelated groups',
    ],
    thresholds: [],
    accessibility: [
      'Search and section navigation work by keyboard with labelled regions',
    ],
    responsive: [
      'Two-pane settings collapse to stacked sections with sticky nav',
    ],
    tags: ['settings', 'grouping', 'reset', 'danger-zone', 'search'],
    related: ['P11', 'P58', 'P50'],
    conflicts: [],
  },
  {
    id: 'P17',
    number: 17,
    title: 'Behind the Button',
    slug: 'behind-the-button',
    domain: 'system',
    summary:
      'Client speed plus server trust: transactional writes, server truth and safe optimism.',
    evidence: 'behind-the-button.mp4',
    ruleIds: ['STATE-OPTIMISTIC-01', 'SYSTEM-AUTOSAVE-01'],
    do: [
      'Make writes transactional and reconcile against server truth',
      'Only optimise reversible, low-risk actions',
    ],
    dont: [
      'Treat an optimistic UI as confirmed server state',
      'Skip idempotency keys on retried writes',
    ],
    thresholds: [],
    accessibility: [
      'Pending and reconciled states are announced, not just coloured',
    ],
    responsive: ['Feedback patterns are identical across pointer types'],
    tags: ['server-truth', 'transactions', 'optimistic', 'idempotency'],
    related: ['P52', 'P15', 'P18'],
    conflicts: [],
  },
  {
    id: 'P18',
    number: 18,
    title: 'Doherty Threshold',
    slug: 'doherty-threshold',
    domain: 'feedback',
    summary:
      'Perceived responsiveness: feedback quickly, with skeleton, optimism or progress as appropriate.',
    evidence: 'doherty-threshold.mp4',
    ruleIds: ['FEEDBACK-DOHERTY-01', 'STATE-FEEDBACK-01', 'STATE-LOADING-01'],
    do: [
      'Acknowledge input within ~100ms',
      'Match the waiting metaphor to duration and certainty',
    ],
    dont: [
      'Leave the interface silent while work happens',
      'Block interaction when background work would do',
    ],
    thresholds: ['~100ms acknowledgement threshold'],
    accessibility: [
      'Busy state is exposed via aria-busy and focus is preserved',
    ],
    responsive: ['Feedback timing is consistent regardless of pointer type'],
    tags: ['perceived-performance', 'feedback', 'latency', 'loading'],
    related: ['P28', 'P54', 'P52'],
    conflicts: [],
  },
  {
    id: 'P19',
    number: 19,
    title: 'Drag and Drop',
    slug: 'drag-and-drop',
    domain: 'input',
    summary:
      'Pickup/drop cues, valid targets, structured snapping, keyboard alternatives and undo.',
    evidence: 'drag-and-drop.mp4',
    ruleIds: ['A11Y-KEYBOARD-01', 'SYSTEM-UNDO-01'],
    do: [
      'Highlight valid drop targets and snap to structure',
      'Provide keyboard move commands and undo',
    ],
    dont: [
      'Make dragging the only reordering path',
      'Drop silently onto invalid targets',
    ],
    thresholds: [],
    accessibility: [
      'Keyboard users reorder with explicit move commands and live announcements',
    ],
    responsive: [
      'Touch drag uses long-press pickup with haptic/visual cues and large targets',
    ],
    tags: ['drag-drop', 'keyboard', 'snapping', 'undo', 'touch'],
    related: ['P4', 'P47', 'P46'],
    conflicts: [],
  },
  {
    id: 'P20',
    number: 20,
    title: 'Dropdown Design',
    slug: 'dropdown-design',
    domain: 'navigation',
    summary:
      'Large trigger, viewport flipping, keyboard controls and search for long lists.',
    evidence: 'dropdown-design.mp4',
    ruleIds: ['RESP-PLACEMENT-01', 'A11Y-KEYBOARD-01', 'A11Y-TARGET-01'],
    do: [
      'Use a large trigger with a 44px target and flip within the viewport',
      'Add typeahead/search when options grow long',
    ],
    dont: ['Let options clip the viewport', 'Force mouse-only selection'],
    thresholds: ['44px trigger target'],
    accessibility: [
      'Arrow keys, typeahead, Escape and aria-expanded on the trigger',
    ],
    responsive: ['Long dropdowns become sheets with search on coarse pointers'],
    tags: ['dropdown', 'overlay', 'keyboard', 'search', 'placement'],
    related: ['P10', 'P42', 'P7'],
    conflicts: [],
  },
  {
    id: 'P21',
    number: 21,
    title: 'Easing Curves',
    slug: 'easing-curves',
    domain: 'motion',
    summary:
      'A small intentional curve vocabulary: ease-out, spring and stagger by intent.',
    evidence: 'easing-curves.mp4',
    ruleIds: ['MOTION-DURATION-01', 'MOTION-REDUCED-01'],
    do: [
      'Limit the team to a named curve vocabulary',
      'Use ease-out for entrances and springs for physical feedback',
    ],
    dont: [
      'Invent a new cubic-bezier per component',
      'Stagger more than a few sibling elements',
    ],
    thresholds: ['Named curve tokens only'],
    accessibility: [
      'Reduced-motion mode collapses stagger to immediate appearance',
    ],
    responsive: [
      'Springs dampen on small screens to avoid overshoot on short distances',
    ],
    tags: ['easing', 'curves', 'spring', 'stagger', 'motion-tokens'],
    related: ['P9', 'P13', 'P68'],
    conflicts: [],
  },
  {
    id: 'P22',
    number: 22,
    title: 'Empty States',
    slug: 'empty-states',
    domain: 'content',
    summary:
      'Differentiate first-run, no-result, error and filtered-empty states with next actions.',
    evidence: 'empty-states.mp4',
    ruleIds: ['CONTENT-EMPTY-01'],
    do: [
      'Classify why the space is empty and offer the next useful action',
      'Distinguish "nothing exists" from "nothing matches"',
    ],
    dont: [
      'Show a blank container or a generic illustration with no action',
      'Treat error empties the same as first-run',
    ],
    thresholds: ['4 empty-state classes'],
    accessibility: [
      'Empty state is a labelled region with a keyboard-reachable action',
    ],
    responsive: [
      'Illustration scales down; copy and CTA remain primary on mobile',
    ],
    tags: ['empty-state', 'first-run', 'no-results', 'microcopy'],
    related: ['P51', 'P23', 'P34'],
    conflicts: [],
  },
  {
    id: 'P23',
    number: 23,
    title: 'Error States',
    slug: 'error-states',
    domain: 'feedback',
    summary:
      'Map error severity and type to surface; always provide recovery and human copy.',
    evidence: 'error-states.mp4',
    ruleIds: ['STATE-ERROR-01', 'CONTENT-ERROR-01', 'FORM-RECOVERY-01'],
    do: [
      'Say what happened, why it matters and what to do next',
      'Pick the surface (inline, banner, modal) by severity',
    ],
    dont: [
      'Surface raw error codes as the only message',
      'Leave the user at a dead end with no recovery',
    ],
    thresholds: [],
    accessibility: [
      'Errors use role="alert"/aria-live and are not colour-only',
    ],
    responsive: [
      'Blocking errors become full-screen states on mobile instead of tiny toasts',
    ],
    tags: ['errors', 'recovery', 'severity', 'microcopy'],
    related: ['P51', 'P30', 'P40'],
    conflicts: [],
  },
  {
    id: 'P24',
    number: 24,
    title: 'Form Field States',
    slug: 'form-field-states',
    domain: 'forms',
    summary:
      'Default, focus, error, success, disabled and loading as explicit, accessible states.',
    evidence: 'form-field-states.mp4',
    ruleIds: [
      'STATE-COMPLETENESS-01',
      'FORM-VALIDATION-01',
      'FORM-LABEL-01',
      'FORM-RECOVERY-01',
    ],
    do: [
      'Define every field state before styling the happy path',
      'Pair state colour with icons and accessible text',
    ],
    dont: [
      'Merge disabled and loading visuals',
      'Indicate errors with colour alone',
    ],
    thresholds: ['6 explicit field states'],
    accessibility: [
      'aria-invalid, aria-describedby errors and persistent labels',
    ],
    responsive: [
      'State messages reflow beneath fields rather than clipping on mobile',
    ],
    tags: ['forms', 'field-states', 'validation', 'a11y'],
    related: ['P50', 'P5', 'P27'],
    conflicts: [],
  },
  {
    id: 'P25',
    number: 25,
    title: 'Golden Ratio',
    slug: 'golden-ratio',
    domain: 'layout',
    summary: 'Use proportional relationships flexibly alongside the base grid.',
    evidence: 'golden-ratio.mp4',
    ruleIds: ['RESP-GRID-01'],
    do: [
      'Use proportions to size complementary columns',
      'Let the ratio bend to content and the base grid',
    ],
    dont: [
      'Force the ratio where content does not support it',
      'Layer ratio math on top of an off-grid layout',
    ],
    thresholds: [],
    accessibility: [
      'Proportional columns still keep line length near 60–75 characters',
    ],
    responsive: ['Ratio columns stack and the ratio becomes vertical rhythm'],
    tags: ['proportion', 'grid', 'layout', 'composition'],
    related: ['P26', 'P32', 'P71'],
    conflicts: [],
  },
  {
    id: 'P26',
    number: 26,
    title: 'Grid System',
    slug: 'grid-system',
    domain: 'layout',
    summary:
      '12-column baseline, responsive collapse, shared edges and intentional gutters.',
    evidence: 'grid-system.mp4',
    ruleIds: ['RESP-GRID-01', 'TOKEN-SPACING-01'],
    do: [
      'Align to shared edges and keep gutters on the spacing scale',
      'Collapse columns by rule, not per component',
    ],
    dont: [
      'Mix ad-hoc widths that break shared edges',
      'Pick breakpoints from device names instead of content',
    ],
    thresholds: ['12 columns desktop', '4px-based gutters'],
    accessibility: ['Collapse order preserves logical reading and tab order'],
    responsive: ['12 → 8 → 4 column collapse driven by available space'],
    tags: ['grid', 'columns', 'gutters', 'responsive', 'alignment'],
    related: ['P25', 'P13', 'P32'],
    conflicts: [],
  },
  {
    id: 'P27',
    number: 27,
    title: 'Input Masking',
    slug: 'input-masking',
    domain: 'forms',
    summary:
      'Readable formatting, paste normalization, stable caret and raw-value storage.',
    evidence: 'input-masking.mp4',
    ruleIds: ['FORM-RECOVERY-01'],
    do: [
      'Normalize pasted content and keep the caret stable',
      'Store the raw value while displaying the formatted one',
    ],
    dont: [
      'Reject valid input because of formatting characters',
      'Jump the caret while the user edits mid-string',
    ],
    thresholds: [],
    accessibility: [
      'Masked inputs keep a persistent label and announced format hint',
    ],
    responsive: ['Formatting adapts to numeric keyboards on mobile'],
    tags: ['masking', 'input', 'formatting', 'paste', 'caret'],
    related: ['P24', 'P60', 'P50'],
    conflicts: [],
  },
  {
    id: 'P28',
    number: 28,
    title: 'Loading States System',
    slug: 'loading-states-system',
    domain: 'feedback',
    summary:
      'Select skeleton, spinner, progress or optimism from shape, duration and certainty.',
    evidence: 'loading-states-system.mp4',
    ruleIds: [
      'FEEDBACK-DOHERTY-01',
      'FEEDBACK-TRUTHFUL-01',
      'STATE-LOADING-01',
      'STATE-COMPLETENESS-01',
    ],
    do: [
      'Choose the metaphor from duration and whether progress is measurable',
      'Skeleton the known layout, spinner the unknown',
    ],
    dont: [
      'Fake progress bars that reach 99% and stall',
      'Flash skeletons for sub-100ms loads',
    ],
    thresholds: ['~100ms acknowledgement', 'No skeleton flash under ~200ms'],
    accessibility: [
      'aria-busy marks loading regions; skeletons hide from screen readers',
    ],
    responsive: ['Skeleton blocks mirror the real responsive layout'],
    tags: ['loading', 'skeleton', 'spinner', 'progress', 'optimistic'],
    related: ['P54', 'P18', 'P52'],
    conflicts: [],
  },
  {
    id: 'P29',
    number: 29,
    title: 'Navigation Patterns',
    slug: 'navigation-patterns',
    domain: 'navigation',
    summary:
      'Platform-appropriate primary navigation, persistent hierarchy and accelerator patterns.',
    evidence: 'navigation-patterns.mp4',
    ruleIds: ['RESP-NAV-01'],
    do: [
      'Keep hierarchy persistent and offer accelerators for repeat users',
      'Choose nav pattern from viewport and platform conventions',
    ],
    dont: [
      'Hide top-level destinations behind generic "more"',
      'Change navigation model between sibling routes',
    ],
    thresholds: [],
    accessibility: [
      'Current location is indicated semantically (aria-current), not by colour only',
    ],
    responsive: [
      'Side/top bars collapse to a labelled sheet or tab bar by breakpoint',
    ],
    tags: [
      'navigation',
      'information-architecture',
      'accelerators',
      'responsive',
    ],
    related: ['P58', 'P49', 'P39'],
    conflicts: [],
  },
  {
    id: 'P30',
    number: 30,
    title: 'Notification System',
    slug: 'notification-system',
    domain: 'feedback',
    summary:
      'Toast, banner, modal or badge selected by severity and persistence needs.',
    evidence: 'notification-system.mp4',
    ruleIds: ['FEEDBACK-TOAST-01'],
    do: [
      'Match the surface to severity and whether action is required',
      'Keep transient status in toasts and blocking issues in modals',
    ],
    dont: [
      'Use a dismissible toast for a blocking error',
      'Stack unbounded notifications',
    ],
    thresholds: ['Bounded toast queue'],
    accessibility: [
      'Notifications use polite/assertive aria-live appropriate to urgency',
    ],
    responsive: [
      'Toasts become top/bottom anchored notices that do not cover controls',
    ],
    tags: ['notifications', 'toast', 'banner', 'modal', 'severity'],
    related: ['P40', 'P65', 'P23'],
    conflicts: [],
  },
  {
    id: 'P31',
    number: 31,
    title: 'Peak-End Rule',
    slug: 'peak-end-rule',
    domain: 'content',
    summary:
      'Engineer memorable peaks and strong endings rather than equal effort everywhere.',
    evidence: 'peak-end-rule.mp4',
    ruleIds: ['CONTENT-TONE-01'],
    do: [
      'Invest polish in the highest-value moment and the completion moment',
      'End flows with a clear, satisfying confirmation',
    ],
    dont: [
      'Spread identical effort across every low-value step',
      'Manufacture fake drama as a peak',
    ],
    thresholds: [],
    accessibility: [
      'Peak moments do not rely on animation or colour to be meaningful',
    ],
    responsive: ['Peak/end treatments survive layout collapse'],
    tags: ['memory', 'peak-end', 'journey', 'completion'],
    related: ['P35', 'P45', 'P43'],
    conflicts: [],
  },
  {
    id: 'P32',
    number: 32,
    title: 'Proximity Rule',
    slug: 'proximity-rule',
    domain: 'layout',
    summary:
      'Use whitespace and spacing ratios to communicate semantic grouping.',
    evidence: 'proximity-rule.mp4',
    ruleIds: ['VISUAL-GROUPING-01', 'TOKEN-SPACING-01'],
    do: [
      'Tighten spacing inside groups and loosen it between groups',
      'Express grouping through whitespace before borders',
    ],
    dont: [
      'Separate a label from its control with large gaps',
      'Box every group when proximity already groups it',
    ],
    thresholds: ['4px-base spacing ratios'],
    accessibility: [
      'Grouping is reinforced with fieldset/legend or labelled regions where needed',
    ],
    responsive: [
      'Vertical rhythm replaces horizontal grouping on narrow screens',
    ],
    tags: ['proximity', 'whitespace', 'grouping', 'gestalt', 'spacing'],
    related: ['P71', 'P26', 'P75'],
    conflicts: [],
  },
  {
    id: 'P33',
    number: 33,
    title: 'Range Sliders',
    slug: 'range-sliders',
    domain: 'input',
    summary:
      'Design for imprecision with large targets, readable values, snapping and keyboard control.',
    evidence: 'range-sliders.mp4',
    ruleIds: ['A11Y-TARGET-01', 'A11Y-KEYBOARD-01'],
    do: [
      'Show the committed value and support snapping to meaningful steps',
      'Provide arrow-key adjustment and numeric entry',
    ],
    dont: ['Rely on pixel-precise dragging', 'Hide the current value'],
    thresholds: ['44px thumb hit area'],
    accessibility: [
      'role="slider" with aria-valuenow/min/max and keyboard steps',
    ],
    responsive: ['Thumbs grow on coarse pointers; value label stays visible'],
    tags: ['slider', 'range', 'keyboard', 'touch', 'snapping'],
    related: ['P6', 'P19', 'P41'],
    conflicts: [],
  },
  {
    id: 'P34',
    number: 34,
    title: 'Search Experience System',
    slug: 'search-experience-system',
    domain: 'navigation',
    summary:
      'Descriptive search, recent history, ranked suggestions, keyboard control and recovery.',
    evidence: 'search-experience-system.mp4',
    ruleIds: ['SYSTEM-URLSTATE-01', 'A11Y-KEYBOARD-01'],
    do: [
      'Rank suggestions, keep recent history and support full keyboard flow',
      'Offer a recovery path for zero results',
    ],
    dont: [
      'Return an unfiltered list with no ranking rationale',
      'Trap focus in the suggestion layer',
    ],
    thresholds: [],
    accessibility: [
      'combobox roles, arrow navigation and Escape restore focus',
    ],
    responsive: [
      'Search can become a full-screen sheet with a thumb-reachable input',
    ],
    tags: ['search', 'suggestions', 'keyboard', 'history', 'zero-results'],
    related: ['P58', 'P22', 'P61'],
    conflicts: [],
  },
  {
    id: 'P35',
    number: 35,
    title: 'Serial Position',
    slug: 'serial-position',
    domain: 'content',
    summary: 'Put highest-value content at the beginning and end of sequences.',
    evidence: 'serial-position.mp4',
    ruleIds: ['CONTENT-TONE-01'],
    do: [
      'Lead and close sequences with the highest-value items',
      'Treat the final step of a flow as a memory anchor',
    ],
    dont: [
      'Bury primary actions in the middle of long lists',
      'Pad endings with low-value repetition',
    ],
    thresholds: [],
    accessibility: [
      'Ordering works for screen-reader linear reading, not just visual scanning',
    ],
    responsive: [
      'Position strategy holds when horizontal sequences become vertical',
    ],
    tags: ['memory', 'order', 'sequence', 'hierarchy'],
    related: ['P31', 'P43', 'P29'],
    conflicts: [],
  },
  {
    id: 'P36',
    number: 36,
    title: 'Shadow Elevation',
    slug: 'shadow-elevation',
    domain: 'visual',
    summary:
      'Use layered shadows only when they communicate semantic elevation.',
    evidence: 'shadow-elevation.mp4',
    ruleIds: ['TOKEN-ELEVATION-01', 'VISUAL-DEPTH-01'],
    do: [
      'Assign elevation tokens to semantic layers (sticky, popover, overlay)',
      'Use layered, low-opacity shadows',
    ],
    dont: [
      'Add shadows purely for decoration',
      'Escalate z-index instead of managing stacking contexts',
    ],
    thresholds: ['Semantic elevation scale'],
    accessibility: [
      'Elevation is paired with borders for users who cannot perceive depth',
    ],
    responsive: [
      'Elevation reduces on mobile where overlays become full-screen sheets',
    ],
    tags: ['shadows', 'elevation', 'depth', 'stacking', 'tokens'],
    related: ['P44', 'P76', 'P75'],
    conflicts: [],
  },
  {
    id: 'P37',
    number: 37,
    title: 'Star Rating',
    slug: 'star-rating',
    domain: 'input',
    summary:
      'Separate preview from committed value; support fractional display/input and deliberate feedback.',
    evidence: 'star-rating.mp4',
    ruleIds: ['STATE-COMPLETENESS-01'],
    do: [
      'Keep hover/focus preview visually distinct from the saved value',
      'Announce the value and require deliberate commit',
    ],
    dont: [
      'Commit on hover or accidental tap',
      'Use stars as the only signal of meaning',
    ],
    thresholds: [],
    accessibility: ['Radio-group semantics with an accessible numeric value'],
    responsive: ['Touch targets span 44px per star with clear tap-to-commit'],
    tags: ['rating', 'preview', 'commit', 'fractional', 'input'],
    related: ['P41', 'P14', 'P33'],
    conflicts: [],
  },
  {
    id: 'P38',
    number: 38,
    title: 'Stepper Wizard',
    slug: 'stepper-wizard',
    domain: 'forms',
    summary:
      'Chunk by context, validate per step, preserve state and show progress.',
    evidence: 'stepper-wizard.mp4',
    ruleIds: ['FORM-VALIDATION-01', 'STATE-COMPLETENESS-01'],
    do: [
      'Group steps around context and validate before advancing',
      'Preserve entries when navigating backwards',
    ],
    dont: [
      'Validate the entire form only at the final step',
      'Clear earlier steps on back navigation',
    ],
    thresholds: [],
    accessibility: [
      'Step list exposes current/complete status and focus moves to the step heading',
    ],
    responsive: ['Stepper collapses to a progress label on small screens'],
    tags: ['wizard', 'stepper', 'multi-step', 'progress', 'validation'],
    related: ['P50', 'P24', 'P45'],
    conflicts: [],
  },
  {
    id: 'P39',
    number: 39,
    title: 'Tabs System',
    slug: 'tabs-system',
    domain: 'navigation',
    summary:
      'Animated indicator, overflow without wrapping, keyboard navigation and responsive alternatives.',
    evidence: 'tabs-system.mp4',
    ruleIds: ['A11Y-SEMANTICS-01'],
    do: [
      'Use tab roles with arrow-key navigation and scrollable overflow',
      'Swap to an appropriate pattern when tabs no longer fit',
    ],
    dont: [
      'Wrap tab labels into multiple rows',
      'Move focus automatically on tab change without purpose',
    ],
    thresholds: [],
    accessibility: [
      'role="tablist/tab/tabpanel", aria-selected and managed focus',
    ],
    responsive: ['Overflowing tabs scroll or become a segmented control/sheet'],
    tags: ['tabs', 'navigation', 'keyboard', 'overflow', 'indicator'],
    related: ['P29', 'P62', 'P59'],
    conflicts: [],
  },
  {
    id: 'P40',
    number: 40,
    title: 'Toast Notifications',
    slug: 'toast-notifications',
    domain: 'feedback',
    summary:
      'Position, timing, queue limits, pause behavior, swipe/close affordances and multimodal status.',
    evidence: 'toast-notifications.mp4',
    ruleIds: ['FEEDBACK-TOAST-01'],
    do: [
      'Cap the queue, pause on hover/focus and provide explicit close',
      'Anchor where they never block primary actions',
    ],
    dont: [
      'Auto-dismiss messages the user must act on',
      'Grow an unbounded stack of toasts',
    ],
    thresholds: ['Bounded queue', 'Pause timers on hover/focus'],
    accessibility: [
      'aria-live region with focusable actions and manual dismissal',
    ],
    responsive: [
      'Swipe-to-dismiss complements (never replaces) the close button',
    ],
    tags: ['toast', 'notifications', 'queue', 'dismissal', 'aria-live'],
    related: ['P30', 'P23', 'P47'],
    conflicts: ['P65'],
  },
  {
    id: 'P41',
    number: 41,
    title: 'Toggle Anatomy',
    slug: 'toggle-anatomy',
    domain: 'input',
    summary:
      'Proportional construction, coordinated morphing, accessible semantics and optimistic rollback.',
    evidence: 'toggle-anatomy.mp4',
    ruleIds: ['A11Y-SEMANTICS-01', 'STATE-OPTIMISTIC-01'],
    do: [
      'Use role="switch" and coordinate track/thumb morphing',
      'Roll back visually when the server rejects the change',
    ],
    dont: [
      'Animate without semantic state',
      'Leave a failed toggle in the optimistic position',
    ],
    thresholds: [],
    accessibility: [
      'aria-checked, visible focus ring and non-colour on/off cues',
    ],
    responsive: [
      'Touch target stays 44px even when the visual track is smaller',
    ],
    tags: ['toggle', 'switch', 'semantics', 'optimistic', 'rollback'],
    related: ['P52', 'P46', 'P37'],
    conflicts: [],
  },
  {
    id: 'P42',
    number: 42,
    title: 'Tooltip Design',
    slug: 'tooltip-design',
    domain: 'navigation',
    summary:
      'Delayed reveal, clear anchoring, viewport flipping, universal dismissal and concise copy.',
    evidence: 'tooltip-design.mp4',
    ruleIds: ['RESP-PLACEMENT-01'],
    do: [
      'Delay reveal, anchor predictably and flip within the viewport',
      'Dismiss on Escape, blur and scroll universally',
    ],
    dont: [
      'Put essential information only in a tooltip',
      'Let tooltips trap focus or cover the trigger',
    ],
    thresholds: ['Delayed reveal', '44px trigger remains'],
    accessibility: [
      'Tooltip appears on focus as well as hover with aria-describedby',
    ],
    responsive: ['Tooltips yield to inline text or sheets on touch devices'],
    tags: ['tooltip', 'overlay', 'anchoring', 'dismissal', 'microcopy'],
    related: ['P20', 'P10', 'P6'],
    conflicts: [],
  },
  {
    id: 'P43',
    number: 43,
    title: 'Visual Hierarchy',
    slug: 'visual-hierarchy',
    domain: 'visual',
    summary:
      'Stack size, accent, contrast, whitespace and weight to create one focal point.',
    evidence: 'visual-hierarchy.mp4',
    ruleIds: ['VISUAL-FOCAL-01'],
    do: [
      'Decide the single focal point before styling anything else',
      'Express rank through several signals, not size alone',
    ],
    dont: [
      'Give every element equal weight',
      'Compete two primary actions for the same attention',
    ],
    thresholds: ['1 focal point per view'],
    accessibility: [
      'Hierarchy survives when colour is removed and at 200% zoom',
    ],
    responsive: [
      'Focal point persists through layout collapse; only arrangement changes',
    ],
    tags: ['hierarchy', 'focal-point', 'attention', 'contrast', 'composition'],
    related: ['P74', 'P3', 'P32'],
    conflicts: [],
  },
  {
    id: 'P44',
    number: 44,
    title: 'Z-Index Mastery',
    slug: 'z-index-mastery',
    domain: 'visual',
    summary:
      'Understand stacking contexts; contain layers with isolation instead of z-index escalation.',
    evidence: 'z-index-mastery.mp4',
    ruleIds: ['TOKEN-ELEVATION-01'],
    do: [
      'Name stacking layers as tokens and isolate overlay contexts',
      'Keep z-index values small and semantic',
    ],
    dont: [
      'Fix overlap wars by raising z-index to 9999',
      'Nest overlays across unrelated stacking contexts',
    ],
    thresholds: ['Named stacking layer tokens'],
    accessibility: ['Layer order matches DOM/reading order for assistive tech'],
    responsive: [
      'Overlays that become full-screen drop their z-index competition',
    ],
    tags: ['z-index', 'stacking-context', 'isolation', 'layers'],
    related: ['P36', 'P65', 'P13'],
    conflicts: [],
  },
  {
    id: 'P45',
    number: 45,
    title: 'Zeigarnik Effect',
    slug: 'zeigarnik-effect',
    domain: 'content',
    summary:
      'Use meaningful incomplete progress as a return cue without manufacturing fake urgency.',
    evidence: 'zeigarnik-effect.mp4',
    ruleIds: ['CONTENT-TONE-01'],
    do: [
      'Show real, meaningful progress the user can resume',
      'Make incomplete work discoverable and honest',
    ],
    dont: [
      'Fake countdowns or pressure tactics',
      'Nag with badges that do not represent real work',
    ],
    thresholds: [],
    accessibility: [
      'Progress cues are textual and available to screen readers',
    ],
    responsive: ['Return cues move into persistent nav slots on small screens'],
    tags: ['memory', 'progress', 'resumption', 'urgency', 'honesty'],
    related: ['P31', 'P38', 'P15'],
    conflicts: [],
  },
  {
    id: 'P46',
    number: 46,
    title: 'Focus States',
    slug: 'focus-states',
    domain: 'accessibility',
    summary:
      'Visible focus, :focus-visible, DOM/visual order parity, focus trapping/restoration and skip links.',
    evidence: 'focus-states.mp4',
    ruleIds: ['A11Y-FOCUS-01', 'A11Y-KEYBOARD-01', 'A11Y-NAME-01'],
    do: [
      'Show a high-contrast :focus-visible ring on every interactive element',
      'Trap focus in overlays and restore it on close',
    ],
    dont: [
      'Remove outlines without providing a replacement',
      'Let DOM order diverge from visual order',
    ],
    thresholds: ['Visible contrasting ring ≥3px equivalent'],
    accessibility: [
      'Skip link, managed trap and focus restoration are the baseline, not extras',
    ],
    responsive: [
      'Focus behavior is identical across touch and keyboard (external keyboards included)',
    ],
    tags: ['focus', 'keyboard', 'focus-trap', 'skip-link', 'a11y'],
    related: ['P65', 'P19', 'P20'],
    conflicts: [],
  },
  {
    id: 'P47',
    number: 47,
    title: 'Swipe Actions',
    slug: 'swipe-actions',
    domain: 'input',
    summary:
      'Make swipe discoverable, reversible and never the only action path.',
    evidence: 'swipe-actions.mp4',
    ruleIds: ['RESP-HOVER-01', 'NAV-UNDO-01'],
    do: [
      'Reveal swipe affordances progressively and always offer undo',
      'Duplicate swipe actions in an explicit menu',
    ],
    dont: [
      'Hide destructive actions behind swipe alone',
      'Trigger actions on ambiguous small drags',
    ],
    thresholds: [],
    accessibility: ['Every swipe action has a keyboard/button equivalent'],
    responsive: [
      'Swipe is only enabled on coarse pointers where the gesture is natural',
    ],
    tags: ['swipe', 'gestures', 'mobile', 'undo', 'discoverability'],
    related: ['P6', 'P19', 'P4'],
    conflicts: [],
  },
  {
    id: 'P48',
    number: 48,
    title: 'Undo UX',
    slug: 'undo-ux',
    domain: 'state',
    summary:
      'Prefer undo to confirmation; soft-delete reversible work and reserve friction for irreversible actions.',
    evidence: 'undo-ux.mp4',
    ruleIds: ['SYSTEM-UNDO-01', 'STATE-DESTRUCTIVE-01', 'NAV-UNDO-01'],
    do: [
      'Soft-delete with a time-boxed undo for reversible work',
      'Use confirmation only for genuinely irreversible actions',
    ],
    dont: [
      'Confirm every routine action into friction',
      'Let the undo window expire without a way to recover',
    ],
    thresholds: ['Time-boxed undo window'],
    accessibility: ['Undo is keyboard reachable and announced via aria-live'],
    responsive: ['Undo sits in a thumb-reachable snackbar on mobile'],
    tags: ['undo', 'soft-delete', 'reversibility', 'friction', 'recovery'],
    related: ['P11', 'P4', 'P40'],
    conflicts: ['P11'],
  },
  {
    id: 'P49',
    number: 49,
    title: 'Bottom Sheets',
    slug: 'bottom-sheets',
    domain: 'navigation',
    summary:
      'Thumb-reachable actions, preserved context, snap points, drag-to-dismiss and scroll containment.',
    evidence: 'bottom-sheets.mp4',
    ruleIds: ['RESP-PLACEMENT-01', 'RESP-NAV-01', 'NAV-HIERARCHY-01'],
    do: [
      'Keep actions in thumb reach and define snap points',
      'Contain scrolling so the page does not scroll behind the sheet',
    ],
    dont: [
      'Reproduce a full desktop modal at the bottom of a phone',
      'Let drag dismissal lose unsaved work silently',
    ],
    thresholds: ['Thumb-reachable action zone'],
    accessibility: [
      'Sheet is a focus-trapped dialog with drag and close-button parity',
    ],
    responsive: [
      'Sheets are a coarse-pointer pattern; desktop gets popovers/dialogs',
    ],
    tags: ['bottom-sheet', 'mobile', 'snap-points', 'drag', 'thumb-zone'],
    related: ['P65', 'P7', 'P20'],
    conflicts: [],
  },
  {
    id: 'P50',
    number: 50,
    title: 'Form Validation Timing',
    slug: 'form-validation-timing',
    domain: 'forms',
    summary:
      'Blur-first validation, live correction after error and positive success feedback.',
    evidence: 'form-validation-timing.mp4',
    ruleIds: ['FORM-VALIDATION-01'],
    do: [
      'Validate on blur, then live-correct once a field has errored',
      'Confirm valid input with positive feedback',
    ],
    dont: [
      'Validate every keystroke before the field is touched',
      'Wait until final submit to show all errors',
    ],
    thresholds: ['Blur-first, then live after first error'],
    accessibility: [
      'Errors link to fields via aria-describedby and focus moves on submit failure',
    ],
    responsive: [
      'Timing rules are identical across virtual keyboards and desktop',
    ],
    tags: ['validation', 'timing', 'blur', 'forms', 'feedback'],
    related: ['P24', 'P38', 'P5'],
    conflicts: [],
  },
  {
    id: 'P51',
    number: 51,
    title: 'Microcopy',
    slug: 'microcopy',
    domain: 'content',
    summary:
      'Outcome-led labels, actionable errors, useful empty states and human language.',
    evidence: 'microcopy.mp4',
    ruleIds: [
      'CONTENT-CTA-01',
      'CONTENT-ERROR-01',
      'CONTENT-EMPTY-01',
      'CONTENT-TONE-01',
    ],
    do: [
      'Write labels around the user’s outcome',
      'Make errors explain the next action in human language',
    ],
    dont: [
      'Expose system jargon or blame the user',
      'Use generic button verbs where an outcome verb fits',
    ],
    thresholds: [],
    accessibility: [
      'Copy is real text, available to assistive tech, never image-only',
    ],
    responsive: ['Copy length is budgeted for narrow, translated layouts'],
    tags: ['microcopy', 'labels', 'errors', 'empty-states', 'tone'],
    related: ['P22', 'P23', 'P2'],
    conflicts: [],
  },
  {
    id: 'P52',
    number: 52,
    title: 'Optimistic UI',
    slug: 'optimistic-ui',
    domain: 'state',
    summary:
      'Immediate reversible feedback with server reconciliation and clean rollback.',
    evidence: 'optimistic-ui.mp4',
    ruleIds: ['STATE-OPTIMISTIC-01', 'STATE-OFFLINE-01'],
    do: [
      'Apply reversible changes immediately and reconcile with the server',
      'Roll back visibly with an explanation on failure',
    ],
    dont: [
      'Optimise irreversible or high-risk actions',
      'Leave conflicting states unannounced',
    ],
    thresholds: [],
    accessibility: [
      'Optimistic and reconciled states are announced, not implied by colour',
    ],
    responsive: ['Rollback/undo remains reachable on every viewport'],
    tags: ['optimistic', 'reconciliation', 'rollback', 'latency', 'state'],
    related: ['P17', 'P14', 'P41'],
    conflicts: [],
  },
  {
    id: 'P53',
    number: 53,
    title: 'Gradient Design',
    slug: 'gradient-design',
    domain: 'visual',
    summary:
      'Controlled hue/lightness movement, gradients as ambiance, grain and safe text contrast.',
    evidence: 'gradient-design.mp4',
    ruleIds: ['A11Y-CONTRAST-01'],
    do: [
      'Keep gradients restrained and treat them as ambiance behind content',
      'Verify text contrast across the full gradient range',
    ],
    dont: [
      'Place text over uncontrolled multi-hue gradients',
      'Use gradients to fake depth tokens do not provide',
    ],
    thresholds: ['4.5:1 minimum across the text footprint'],
    accessibility: [
      'Contrast is checked at the lightest and darkest gradient stops',
    ],
    responsive: [
      'Gradient direction adapts so the safe contrast zone tracks the text',
    ],
    tags: ['gradient', 'color', 'ambiance', 'contrast', 'visual'],
    related: ['P70', 'P55', 'P73'],
    conflicts: [],
  },
  {
    id: 'P54',
    number: 54,
    title: 'Skeleton Loading',
    slug: 'skeleton-loading',
    domain: 'feedback',
    summary:
      'Content-shaped animated placeholders, truthful dimensions and no unnecessary flashes.',
    evidence: 'skeleton-loading.mp4',
    ruleIds: [
      'FEEDBACK-TRUTHFUL-01',
      'STATE-LOADING-01',
      'FEEDBACK-DOHERTY-01',
    ],
    do: [
      'Mirror the real content shape and dimensions',
      'Skip skeletons for loads that resolve almost immediately',
    ],
    dont: [
      'Animate generic boxes unrelated to the content',
      'Flash skeletons on fast or cached responses',
    ],
    thresholds: ['No skeleton flash under ~200ms'],
    accessibility: [
      'Skeleton regions are aria-busy and hidden from the accessibility tree',
    ],
    responsive: ['Skeleton blocks match each breakpoint’s real layout'],
    tags: ['skeleton', 'loading', 'placeholder', 'perceived-performance'],
    related: ['P28', 'P18', 'P75'],
    conflicts: [],
  },
  {
    id: 'P55',
    number: 55,
    title: 'Color Picker UX',
    slug: 'color-picker-ux',
    domain: 'input',
    summary:
      'OKLCH, recent/saved swatches, live contrast, alpha preview and token generation.',
    evidence: 'color-picker-ux.mp4',
    ruleIds: ['A11Y-CONTRAST-01'],
    do: [
      'Show live contrast against the intended surface',
      'Offer recent/saved swatches and emit design tokens, not raw picks',
    ],
    dont: [
      'Allow inaccessible pairings without a warning',
      'Force manual hex entry as the only path',
    ],
    thresholds: ['Live WCAG ratio feedback'],
    accessibility: [
      'Numeric color fields and labels accompany the visual picker',
    ],
    responsive: [
      'The picker expands into a sheet with large selection targets on touch',
    ],
    tags: ['color', 'oklch', 'contrast', 'swatches', 'tokens'],
    related: ['P70', 'P69', 'P53'],
    conflicts: [],
  },
  {
    id: 'P56',
    number: 56,
    title: 'File Upload UX',
    slug: 'file-upload-ux',
    domain: 'forms',
    summary:
      'Drag feedback, real progress/ETA, resumable retry, previews and independent queues.',
    evidence: 'file-upload-ux.mp4',
    ruleIds: ['FORM-UPLOAD-01', 'FEEDBACK-TRUTHFUL-01'],
    do: [
      'Show per-file progress and ETA with resumable retry',
      'Preview before commit and run independent queues',
    ],
    dont: [
      'Block the whole form while one file uploads',
      'Report indeterminate work as a fake percentage',
    ],
    thresholds: ['Per-file independent queue'],
    accessibility: [
      'Drag-drop has a button equivalent; progress is announced via aria-live',
    ],
    responsive: ['Drop zone expands to a full-width tap target on mobile'],
    tags: ['upload', 'drag-drop', 'progress', 'retry', 'queue'],
    related: ['P28', 'P19', 'P23'],
    conflicts: [],
  },
  {
    id: 'P57',
    number: 57,
    title: 'Password Field UX',
    slug: 'password-field-ux',
    domain: 'forms',
    summary:
      'Entropy-aware guidance, live checklist/strength, reveal, paste and generated passwords.',
    evidence: 'password-field-ux.mp4',
    ruleIds: ['FORM-LABEL-01'],
    do: [
      'Explain strength from entropy and allow paste and reveal',
      'Offer a generated password and state the rules clearly',
    ],
    dont: [
      'Block paste or hide the only strength signal in colour',
      'Apply arbitrary character rules without explanation',
    ],
    thresholds: [],
    accessibility: [
      'Strength has a labelled text value, not a colour-only meter',
    ],
    responsive: ['Reveal toggle keeps a 44px target beside the input'],
    tags: ['password', 'entropy', 'strength', 'reveal', 'forms'],
    related: ['P24', 'P50', 'P41'],
    conflicts: [],
  },
  {
    id: 'P58',
    number: 58,
    title: 'Command Palette',
    slug: 'command-palette',
    domain: 'navigation',
    summary:
      'Fuzzy search, grouped suggestions, keyboard-first execution, async loading and nesting.',
    evidence: 'command-palette.mp4',
    ruleIds: ['A11Y-KEYBOARD-01', 'A11Y-NAME-01'],
    do: [
      'Make every command keyboard reachable with fuzzy matching',
      'Group results and show async loading honestly',
    ],
    dont: [
      'Require the mouse for a command the shortcut implies',
      'Change result ordering while the user types without indication',
    ],
    thresholds: [],
    accessibility: [
      'combobox semantics, roving selection and Escape to dismiss',
    ],
    responsive: [
      'Becomes a full-screen sheet with large targets on coarse pointers',
    ],
    tags: ['command-palette', 'keyboard', 'fuzzy-search', 'shortcuts'],
    related: ['P34', 'P29', 'P20'],
    conflicts: [],
  },
  {
    id: 'P59',
    number: 59,
    title: 'Filter Chips',
    slug: 'filter-chips',
    domain: 'input',
    summary:
      'Idle/active/disabled states, explicit AND/OR logic, live counts and clear-all.',
    evidence: 'filter-chips.mp4',
    ruleIds: ['A11Y-CONTRAST-02', 'SYSTEM-URLSTATE-01'],
    do: [
      'Make selection logic explicit and show live result counts',
      'Provide a clear-all and persist filters in URL state',
    ],
    dont: [
      'Indicate active state by colour alone',
      'Change result counts without announcing them',
    ],
    thresholds: [],
    accessibility: [
      'Selected state uses aria-pressed plus a non-colour indicator',
    ],
    responsive: ['Chip rows scroll horizontally with 44px touch heights'],
    tags: ['filters', 'chips', 'logic', 'counts', 'url-state'],
    related: ['P39', 'P61', 'P34'],
    conflicts: [],
  },
  {
    id: 'P60',
    number: 60,
    title: 'OTP Input',
    slug: 'otp-input',
    domain: 'forms',
    summary:
      'Single-string model, paste/autofill, auto-advance, correction behavior and resend throttling.',
    evidence: 'otp-input.mp4',
    ruleIds: ['FORM-LABEL-01', 'FORM-RECOVERY-01'],
    do: [
      'Model one string and distribute it across boxes on paste/autofill',
      'Allow backward correction and throttle resend honestly',
    ],
    dont: [
      'Build one input per digit with no shared model',
      'Discard pasted codes because of formatting',
    ],
    thresholds: ['Resend throttle shown with real cooldown'],
    accessibility: [
      'Single labelled input semantics; auto-advance manages focus deliberately',
    ],
    responsive: ['Numeric inputmode and boxes sized for touch entry'],
    tags: ['otp', 'autofill', 'paste', 'auto-advance', 'forms'],
    related: ['P27', 'P24', 'P50'],
    conflicts: [],
  },
  {
    id: 'P61',
    number: 61,
    title: 'Pagination',
    slug: 'pagination',
    domain: 'navigation',
    summary:
      'Choose numbered, load-more or infinite by job; prefer cursors for changing data and preserve URL state.',
    evidence: 'pagination.mp4',
    ruleIds: ['SYSTEM-URLSTATE-01'],
    do: [
      'Pick the pagination model from the user’s task',
      'Use cursors for frequently changing data and keep page in the URL',
    ],
    dont: [
      'Infinite-scroll a list users need to return to a position in',
      'Reset filters or position on navigation',
    ],
    thresholds: [],
    accessibility: [
      'Paged navigation is keyboard operable with announced result ranges',
    ],
    responsive: [
      'Infinite/load-more replaces dense numbered controls on mobile',
    ],
    tags: ['pagination', 'cursors', 'url-state', 'infinite-scroll'],
    related: ['P34', 'P59', 'P63'],
    conflicts: [],
  },
  {
    id: 'P62',
    number: 62,
    title: 'Accordion Disclosure',
    slug: 'accordion-disclosure',
    domain: 'navigation',
    summary:
      'Animate actual content, synchronize chevron/panel, semantic button plus ARIA and anchor expansion.',
    evidence: 'accordion-disclosure.mp4',
    ruleIds: ['A11Y-SEMANTICS-01'],
    do: [
      'Use a real button with aria-expanded/aria-controls and animate the content itself',
      'Support deep-linking to an expanded section',
    ],
    dont: [
      'Animate only a chevron while content pops in',
      'Build disclosure from non-semantic divs',
    ],
    thresholds: [],
    accessibility: ['Button semantics, controlled height and anchor expansion'],
    responsive: [
      'Accordions replace tabs/sidebars where vertical space dominates',
    ],
    tags: ['accordion', 'disclosure', 'aria', 'animation', 'semantics'],
    related: ['P39', 'P65', 'P9'],
    conflicts: [],
  },
  {
    id: 'P63',
    number: 63,
    title: 'Data Table',
    slug: 'data-table',
    domain: 'data-display',
    summary:
      'Tri-state sort, tabular numeric alignment, sticky headers/columns, density tokens and row selection.',
    evidence: 'data-table.mp4',
    ruleIds: ['A11Y-SEMANTICS-01', 'TOKEN-SPACING-01'],
    do: [
      'Support tri-state sorting and right-align numerics',
      'Use density tokens and keep headers/columns sticky by rule',
    ],
    dont: [
      'Sort on rendered strings instead of underlying values',
      'Cram desktop column counts onto phones',
    ],
    thresholds: ['Tri-state sort: none → asc → desc'],
    accessibility: [
      'Real table semantics, sortable headers with aria-sort and selectable rows',
    ],
    responsive: [
      'Wide tables reflow to card lists or horizontal scroll with preserved context',
    ],
    tags: ['table', 'sorting', 'density', 'sticky', 'selection'],
    related: ['P4', 'P59', 'P8'],
    conflicts: [],
  },
  {
    id: 'P64',
    number: 64,
    title: 'Card Hover Anatomy',
    slug: 'card-hover-anatomy',
    domain: 'visual',
    summary:
      'Lift without changing footprint, coordinated shadow, action stagger and image zoom.',
    evidence: 'card-hover-anatomy.mp4',
    ruleIds: ['VISUAL-DEPTH-01'],
    do: [
      'Lift via shadow/translate without changing layout footprint',
      'Coordinate image zoom and shadow on the shared timing scale',
    ],
    dont: [
      'Shift surrounding content on hover',
      'Depend on hover for discoverability of the card’s action',
    ],
    thresholds: ['100–500ms hover motion'],
    accessibility: [
      'Hover treatment is additive; focus-visible gets an equivalent cue',
    ],
    responsive: ['Hover effects are disabled where hover capability is absent'],
    tags: ['card', 'hover', 'lift', 'shadow', 'motion'],
    related: ['P6', 'P36', 'P75'],
    conflicts: ['P6'],
  },
  {
    id: 'P65',
    number: 65,
    title: 'Modal Hierarchy',
    slug: 'modal-hierarchy',
    domain: 'navigation',
    summary:
      'Choose overlay by interruption level: modal, sheet, drawer or popover.',
    evidence: 'modal-hierarchy.mp4',
    ruleIds: ['NAV-HIERARCHY-01', 'A11Y-FOCUS-01'],
    do: [
      'Match overlay interruption level to the task’s blocking nature',
      'Trap focus, dim background and restore focus on close',
    ],
    dont: [
      'Use a modal for a choice that does not block the page',
      'Nest more than one blocking modal',
    ],
    thresholds: [],
    accessibility: [
      'dialog role, labelled heading, focus trap and Escape close',
    ],
    responsive: [
      'Modal becomes a sheet/drawer; popovers become inline on small screens',
    ],
    tags: ['modal', 'overlay', 'dialog', 'hierarchy', 'focus-trap'],
    related: ['P49', 'P44', 'P30'],
    conflicts: [],
  },
  {
    id: 'P66',
    number: 66,
    title: 'Icon Design Rules',
    slug: 'icon-design-rules',
    domain: 'visual',
    summary:
      'Optical sizing, grid alignment, consistent stroke, fixed bounding boxes and one style strategy.',
    evidence: 'icon-design-rules.mp4',
    ruleIds: ['A11Y-NAME-01'],
    do: [
      'Draw icons on a shared grid with one stroke strategy and fixed bounding boxes',
      'Apply optical sizing so visually unequal shapes look equal',
    ],
    dont: [
      'Mix icon families or stroke weights in one set',
      'Let icons carry meaning without a text alternative',
    ],
    thresholds: ['24px default bounding box'],
    accessibility: ['Icon-only controls always carry an accessible label'],
    responsive: [
      'Icon glyph size stays stable while the 44px touch area grows',
    ],
    tags: ['icons', 'grid', 'stroke', 'optical-sizing', 'consistency'],
    related: ['P13', 'P46', 'P3'],
    conflicts: [],
  },
  {
    id: 'P67',
    number: 67,
    title: 'Landing Page Skeleton',
    slug: 'landing-page-skeleton',
    domain: 'layout',
    summary:
      'Hero → proof → problem → solution → CTA, outcome framing and a repeated primary CTA.',
    evidence: 'landing-page-skeleton.mp4',
    ruleIds: ['VISUAL-FOCAL-01', 'CONTENT-CTA-01'],
    do: [
      'Sequence hero, proof, problem, solution and CTA in that order',
      'Repeat the same primary CTA at decision points',
    ],
    dont: [
      'Introduce secondary CTAs that dilute the primary',
      'Lead with features before the outcome and proof',
    ],
    thresholds: ['1 repeated primary CTA'],
    accessibility: [
      'Section order matches reading order and heading hierarchy',
    ],
    responsive: [
      'The skeleton holds; multi-column proof sections stack in sequence',
    ],
    tags: ['landing', 'page-structure', 'cta', 'proof', 'narrative'],
    related: ['P2', 'P43', 'P35'],
    conflicts: [],
  },
  {
    id: 'P68',
    number: 68,
    title: 'Scroll-Driven Animations',
    slug: 'scroll-driven-animations',
    domain: 'motion',
    summary:
      'Prefer native CSS scroll/view timelines and sticky composition over JS scroll listeners.',
    evidence: 'scroll-driven-animations.mp4',
    ruleIds: ['MOTION-REDUCED-01'],
    do: [
      'Use native scroll/view timelines and sticky composition',
      'Tie animation progress to scroll position declaratively',
    ],
    dont: [
      'Attach manual scroll listeners that fight the compositor',
      'Block content behind scroll animation',
    ],
    thresholds: [],
    accessibility: [
      'Reduced-motion users get the final state without animation',
    ],
    responsive: [
      'Scroll effects are simplified or removed on short mobile viewports',
    ],
    tags: ['scroll', 'animation', 'css', 'sticky', 'performance'],
    related: ['P9', 'P21', 'P45'],
    conflicts: [],
  },
  {
    id: 'P69',
    number: 69,
    title: 'Design Tokens',
    slug: 'design-tokens',
    domain: 'system',
    summary:
      'Primitives → semantic → component layers, role-based naming, scales and theme token sets.',
    evidence: 'design-tokens.mp4',
    ruleIds: ['TOKEN-GRAPH-01', 'TOKEN-SPACING-01'],
    do: [
      'Name tokens by role and keep the three layers resolvable',
      'Ship theme sets (light/dark) as semantic remaps',
    ],
    dont: [
      'Let components reference primitive values directly',
      'Name tokens by colour instead of role',
    ],
    thresholds: ['3 token layers', '4px base scale'],
    accessibility: ['Contrast and focus tokens are first-class theme members'],
    responsive: ['Density and breakpoint tokens live alongside color tokens'],
    tags: ['tokens', 'theming', 'naming', 'design-system', 'dark-mode'],
    related: ['P13', 'P73', 'P55'],
    conflicts: [],
  },
  {
    id: 'P70',
    number: 70,
    title: 'Color Accessibility',
    slug: 'color-accessibility',
    domain: 'accessibility',
    summary: 'WCAG contrast targets and non-color signals for meaning.',
    evidence: 'color-accessibility.mp4',
    ruleIds: ['A11Y-CONTRAST-01', 'A11Y-CONTRAST-02'],
    do: [
      'Verify AA ratios for text and UI and pair colour with icons/text',
      'Check both light and dark themes against the same targets',
    ],
    dont: [
      'Use red/green (or any hue) as the sole status signal',
      'Assume brand colours pass without measurement',
    ],
    thresholds: ['4.5:1 normal text', '3:1 large text/UI'],
    accessibility: ['This pattern is itself the accessibility contract'],
    responsive: [
      'Contrast requirements do not change with viewport; re-check re-themed states',
    ],
    tags: ['color', 'contrast', 'wcag', 'a11y', 'non-color-signals'],
    related: ['P53', 'P55', 'P73'],
    conflicts: [],
  },
  {
    id: 'P71',
    number: 71,
    title: 'Gestalt Laws',
    slug: 'gestalt-laws',
    domain: 'visual',
    summary:
      'Use closure, similarity, continuity, figure-ground and common region to structure perception.',
    evidence: 'gestalt-laws.mp4',
    ruleIds: ['VISUAL-GROUPING-01'],
    do: [
      'Use common region and proximity to express relatedness',
      'Apply similarity consistently for comparable items',
    ],
    dont: [
      'Violate grouping with uniform spacing everywhere',
      'Rely on borders where proximity already communicates',
    ],
    thresholds: [],
    accessibility: [
      'Perceptual grouping is reinforced semantically for screen readers',
    ],
    responsive: ['Grouping re-establishes vertically when columns collapse'],
    tags: ['gestalt', 'perception', 'grouping', 'similarity', 'common-region'],
    related: ['P32', 'P43', 'P25'],
    conflicts: [],
  },
  {
    id: 'P72',
    number: 72,
    title: 'Border Radius',
    slug: 'border-radius',
    domain: 'visual',
    summary:
      'Use a coherent radius scale and derive nested radii to preserve concentric corners.',
    evidence: 'border-radius.mp4',
    ruleIds: ['TOKEN-RADIUS-01'],
    do: [
      'Pick radii from the shared scale and derive nested radii mathematically',
      'Keep radius language consistent across a surface',
    ],
    dont: [
      'Mix arbitrary radii on nested elements',
      'Round containers more than their contents allow',
    ],
    thresholds: ['4, 8, 12, 16, 24 scale'],
    accessibility: ['Radius never reduces the visible focus ring or hit area'],
    responsive: [
      'Radii stay constant; spacing changes rather than corner language',
    ],
    tags: ['radius', 'corners', 'tokens', 'nested', 'geometry'],
    related: ['P13', 'P69', 'P75'],
    conflicts: [],
  },
  {
    id: 'P73',
    number: 73,
    title: 'Dark Mode',
    slug: 'dark-mode',
    domain: 'visual',
    summary:
      'Near-black base, layered surfaces, calmer accents and opacity-based text hierarchy.',
    evidence: 'dark-mode.mp4',
    ruleIds: ['TOKEN-DARK-01', 'A11Y-CONTRAST-01'],
    do: [
      'Build on a near-black base with layered surfaces and desaturated accents',
      'Express text hierarchy with opacity tokens',
    ],
    dont: [
      'Invert the light theme or use pure black/white extremes',
      'Keep light-theme shadows unchanged',
    ],
    thresholds: ['AA contrast re-verified in dark'],
    accessibility: [
      'Dark theme re-passes contrast rather than inheriting light assumptions',
    ],
    responsive: [
      'Theme is orthogonal to viewport; surfaces remap, layout does not',
    ],
    tags: ['dark-mode', 'theming', 'surfaces', 'contrast', 'tokens'],
    related: ['P69', 'P70', 'P53'],
    conflicts: [],
  },
  {
    id: 'P74',
    number: 74,
    title: 'Von Restorff Effect',
    slug: 'von-restorff',
    domain: 'visual',
    summary:
      'Isolate one intended choice against a quiet baseline using multiple signals.',
    evidence: 'von-restorff.mp4',
    ruleIds: ['VISUAL-FOCAL-01'],
    do: [
      'Isolate the intended choice with accent, weight and position together',
      'Keep the baseline quiet so isolation works',
    ],
    dont: [
      'Highlight multiple items and cancel the effect',
      'Signal isolation with colour alone',
    ],
    thresholds: ['1 isolated choice per decision point'],
    accessibility: [
      'Isolation survives grayscale and zoom via weight/position cues',
    ],
    responsive: ['The isolated element remains isolated after layout collapse'],
    tags: ['isolation', 'attention', 'accent', 'decision', 'hierarchy'],
    related: ['P43', 'P2', 'P3'],
    conflicts: [],
  },
  {
    id: 'P75',
    number: 75,
    title: 'Perfect Card',
    slug: 'perfect-card',
    domain: 'visual',
    summary:
      'Use spacing, typography, layered depth, subtle border and restrained hover polish.',
    evidence: 'perfect-card.mp4',
    ruleIds: ['VISUAL-GROUPING-01', 'TOKEN-ELEVATION-01'],
    do: [
      'Compose cards from spacing, type, one border and semantic elevation',
      'Keep hover polish restrained and footprint-stable',
    ],
    dont: [
      'Stack heavy borders, shadows and gradients on one card',
      'Let hover change the card’s size or neighbours’ positions',
    ],
    thresholds: ['4px-based internal spacing'],
    accessibility: [
      'Card actions are real labelled elements, not whole-card click targets without semantics',
    ],
    responsive: ['Cards reflow to one column without losing internal rhythm'],
    tags: ['card', 'depth', 'spacing', 'border', 'hover'],
    related: ['P64', 'P36', 'P32'],
    conflicts: [],
  },
  {
    id: 'P76',
    number: 76,
    title: 'Depth Layers',
    slug: 'depth-layers',
    domain: 'visual',
    summary:
      'Combine layered shadows, subtle parallax and restrained Z-translation to imply dimensionality.',
    evidence: 'depth-layers.mp4',
    ruleIds: ['VISUAL-DEPTH-01', 'TOKEN-ELEVATION-01'],
    do: [
      'Build dimensionality from shadow, parallax and translation together',
      'Keep Z-translation restrained and purposeful',
    ],
    dont: [
      'Apply large 3D transforms to content surfaces',
      'Layer depth effects that ignore reduced-motion settings',
    ],
    thresholds: [],
    accessibility: [
      'Depth never hides content or focus; reduced-motion removes parallax',
    ],
    responsive: ['Parallax distance scales down with viewport height'],
    tags: ['depth', 'parallax', '3d', 'shadows', 'motion'],
    related: ['P36', 'P44', 'P68'],
    conflicts: [],
  },
];

const patternIndex = new Map(PATTERNS.map((pattern) => [pattern.id, pattern]));

export function getPattern(id: string): UXPattern {
  const pattern = patternIndex.get(id);
  if (!pattern) throw new Error(`Unknown UX pattern: ${id}`);
  return pattern;
}

export const PATTERN_DOMAINS = [
  'state',
  'forms',
  'feedback',
  'navigation',
  'layout',
  'visual',
  'motion',
  'accessibility',
  'data-display',
  'content',
  'system',
  'input',
] as const;
