/**
 * Responsive Engine — rules from viewport, available space and pointer/hover
 * capability, never user-agent guessing.
 */
import type { ComponentKind } from './types';

export interface ViewportPlan {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  widthRange: string;
  columns: number;
  pointer: 'fine' | 'coarse';
  hover: 'hover' | 'none';
  notes: string[];
}

export const BREAKPOINTS = [
  { name: 'mobile' as const, min: 0, max: 639, columns: 4 },
  { name: 'tablet' as const, min: 640, max: 1023, columns: 8 },
  { name: 'desktop' as const, min: 1024, max: 1440, columns: 12 },
];

/**
 * Overlay components change form factor on coarse pointers: floating layers
 * become sheets, hover affordances become explicit actions.
 */
const OVERLAY_KINDS: ComponentKind[] = [
  'dropdown',
  'menu',
  'tooltip',
  'popover',
  'date-picker',
  'command-palette',
];

export function planViewport(
  breakpoint: ViewportPlan['breakpoint'],
  pointer: 'fine' | 'coarse',
): ViewportPlan {
  const bp =
    BREAKPOINTS.find((entry) => entry.name === breakpoint) ?? BREAKPOINTS[0]!;
  const hover = pointer === 'coarse' ? 'none' : 'hover';
  const notes: string[] = [];

  if (pointer === 'coarse') {
    notes.push(
      'All interactive targets meet 44x44px; hover-only actions are duplicated as explicit controls (P6).',
    );
  } else {
    notes.push(
      'Hover remains an enhancement; keyboard and click paths stay complete without it (P6).',
    );
  }
  if (breakpoint === 'mobile') {
    notes.push(
      'Floating layers render as bottom sheets with snap points instead of clipped popovers (P49).',
    );
    notes.push(
      'Navigation collapses to a labelled sheet or thumb-reachable tab bar (P29).',
    );
  }
  if (breakpoint === 'tablet') {
    notes.push(
      'Two-column forms and 8-column grid; overlays re-anchor within the viewport (P20).',
    );
  }
  if (breakpoint === 'desktop') {
    notes.push(
      'Full 12-column grid; persistent navigation and hover acceleration are available.',
    );
  }

  return {
    breakpoint,
    widthRange: `${bp.min}–${bp.max}px`,
    columns: bp.columns,
    pointer,
    hover,
    notes,
  };
}

export interface ResponsiveRule {
  ruleId: string;
  statement: string;
  patternIds: string[];
}

export const RESPONSIVE_RULES: ResponsiveRule[] = [
  {
    ruleId: 'RESP-HOVER-01',
    statement: 'Hover is optional enhancement, never the sole action path.',
    patternIds: ['P6', 'P47'],
  },
  {
    ruleId: 'RESP-PLACEMENT-01',
    statement:
      'Floating layers flip, re-anchor or become sheets on small screens.',
    patternIds: ['P10', 'P20', 'P42', 'P49'],
  },
  {
    ruleId: 'RESP-NAV-01',
    statement:
      'Navigation adapts to viewport and pointer while preserving hierarchy.',
    patternIds: ['P29', 'P49'],
  },
  {
    ruleId: 'RESP-GRID-01',
    statement: '12-column grid collapses on shared edges by available space.',
    patternIds: ['P26', 'P25'],
  },
];

/** Component-specific responsive guidance used by `/ux-design`. */
export function responsiveGuidance(kind: ComponentKind): string[] {
  const guidance: string[] = [];
  if (OVERLAY_KINDS.includes(kind)) {
    guidance.push(
      'Becomes a bottom sheet on coarse pointers; viewport-aware flipping on desktop.',
    );
  }
  if (kind === 'table') {
    guidance.push(
      'Reflows to card lists or horizontally scrolls with sticky first column.',
    );
  }
  if (kind === 'nav') {
    guidance.push(
      'Side/top bar collapses to a labelled sheet; current page uses aria-current.',
    );
  }
  if (kind === 'form' || kind === 'wizard' || kind === 'text-field') {
    guidance.push(
      'Single column on mobile; error messages reflow beneath inputs.',
    );
  }
  if (guidance.length === 0) {
    guidance.push(
      'Layout reflows on the 4/8/12 column grid; touch targets remain 44px at every breakpoint.',
    );
  }
  return guidance;
}
