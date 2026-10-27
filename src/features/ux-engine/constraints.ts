/**
 * Constraint Engine — deterministic, measurable checks.
 *
 * Every function here is pure: the same inputs always produce the same
 * verdict. Contrast uses the WCAG 2.x relative-luminance formula; the spatial
 * and motion checks use the baseline scales from the design-system foundation
 * (4px spacing, 44px targets, 100–500ms motion, 100ms feedback).
 */
import type { ConstraintResult } from './types';

// ---------------------------------------------------------------------------
// Baseline scales (design-system foundation)
// ---------------------------------------------------------------------------

export const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64] as const;
export const RADIUS_SCALE = [4, 8, 12, 16, 24] as const;
export const MOTION_RANGE_MS = { min: 100, max: 500 } as const;
export const MIN_TOUCH_TARGET_PX = 44;
export const DOHERTY_FEEDBACK_MS = 100;
export const SKELETON_FLASH_MS = 200;
export const ICON_BOUNDING_BOX_PX = 24;

// ---------------------------------------------------------------------------
// Colour / WCAG contrast
// ---------------------------------------------------------------------------

function channelToLinear(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

/** Accepts #rgb, #rrggbb and optional alpha (alpha is ignored for ratios). */
export function parseHexColor(hex: string): {
  r: number;
  g: number;
  b: number;
} {
  let value = hex.trim().replace(/^#/, '');
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(`Unsupported color format (use #rgb or #rrggbb): ${hex}`);
  }
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHexColor(hex);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** WCAG contrast ratio between two colours, from 1:1 to 21:1. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = relativeLuminance(foreground);
  const darker = relativeLuminance(background);
  const [l1, l2] = lighter > darker ? [lighter, darker] : [darker, lighter];
  return Number(((l1 + 0.05) / (l2 + 0.05)).toFixed(2));
}

export interface ContrastVerdict {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  required: number;
}

/**
 * AA requires 4.5:1 for normal text and 3:1 for large text (≥24px, or
 * ≥18.67px bold) and meaningful UI components.
 */
export function checkContrast(
  foreground: string,
  background: string,
  opts: { textSizePx?: number; bold?: boolean } = {},
): ContrastVerdict {
  const ratio = contrastRatio(foreground, background);
  const isLarge =
    (opts.textSizePx ?? 16) >= 24 ||
    ((opts.textSizePx ?? 16) >= 18.67 && Boolean(opts.bold));
  const required = isLarge ? 3 : 4.5;
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    required,
  };
}

// ---------------------------------------------------------------------------
// Spatial and motion constraints
// ---------------------------------------------------------------------------

export function checkTouchTarget(sizePx: number): ConstraintResult {
  const pass = sizePx >= MIN_TOUCH_TARGET_PX;
  return {
    ruleId: 'A11Y-TARGET-01',
    pass,
    expected: `>= ${MIN_TOUCH_TARGET_PX}px touch target`,
    actual: `${sizePx}px`,
    detail: pass
      ? `Target meets the ${MIN_TOUCH_TARGET_PX}px minimum (a ${ICON_BOUNDING_BOX_PX}px icon may sit inside the larger hit area).`
      : `Target is ${MIN_TOUCH_TARGET_PX - sizePx}px short of the minimum touch area.`,
  };
}

export function checkSpacing(valuePx: number): ConstraintResult {
  const pass = (SPACING_SCALE as readonly number[]).includes(valuePx);
  return {
    ruleId: 'TOKEN-SPACING-01',
    pass,
    expected: `one of ${SPACING_SCALE.join(', ')}px (4px base)`,
    actual: `${valuePx}px`,
    detail: pass
      ? 'Value sits on the shared spacing scale.'
      : 'Off-scale spacing is design-system drift; move to the nearest scale token.',
  };
}

export function checkRadius(valuePx: number): ConstraintResult {
  const pass = (RADIUS_SCALE as readonly number[]).includes(valuePx);
  return {
    ruleId: 'TOKEN-RADIUS-01',
    pass,
    expected: `one of ${RADIUS_SCALE.join(', ')}px`,
    actual: `${valuePx}px`,
    detail: pass
      ? 'Radius sits on the shared radius scale.'
      : 'Off-scale radius breaks concentric corner relationships.',
  };
}

export function checkMotionDuration(durationMs: number): ConstraintResult {
  const pass =
    durationMs >= MOTION_RANGE_MS.min && durationMs <= MOTION_RANGE_MS.max;
  return {
    ruleId: 'MOTION-DURATION-01',
    pass,
    expected: `${MOTION_RANGE_MS.min}–${MOTION_RANGE_MS.max}ms shared vocabulary`,
    actual: `${durationMs}ms`,
    detail: pass
      ? 'Duration is inside the shared motion vocabulary.'
      : durationMs < MOTION_RANGE_MS.min
        ? 'Too fast to register as intentional motion.'
        : 'Too slow; exits should be faster and attention motion kept brief.',
  };
}

/** Doherty threshold: input acknowledgement within ~100ms. */
export function checkFeedbackLatency(feedbackMs: number): ConstraintResult {
  const pass = feedbackMs <= DOHERTY_FEEDBACK_MS;
  return {
    ruleId: 'FEEDBACK-DOHERTY-01',
    pass,
    expected: `acknowledgement within ${DOHERTY_FEEDBACK_MS}ms`,
    actual: `${feedbackMs}ms`,
    detail: pass
      ? 'Feedback arrives inside the perceived-instant threshold.'
      : 'No acknowledgement inside ~100ms; pair the wait with skeleton, progress or optimism.',
  };
}

/**
 * Stacking hygiene: small, semantic layer numbers. Escalation past the named
 * layers indicates stacking-context wars (P44).
 */
export const STACKING_LAYERS = [0, 10, 20, 30, 40, 50] as const;

export function checkZIndex(z: number): ConstraintResult {
  const pass = (STACKING_LAYERS as readonly number[]).includes(z);
  return {
    ruleId: 'TOKEN-ELEVATION-01',
    pass,
    expected: `a named layer (${STACKING_LAYERS.join(', ')})`,
    actual: `z-index ${z}`,
    detail: pass
      ? 'z-index maps to a named stacking layer token.'
      : 'Escalated z-index; isolate the stacking context instead of raising the number.',
  };
}

export function isOnSpacingScale(valuePx: number): boolean {
  return (SPACING_SCALE as readonly number[]).includes(valuePx);
}
