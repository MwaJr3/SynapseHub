/**
 * WCAG 2.x contrast maths.
 *
 * Every ratio this module returns is quoted in an audit report as evidence, often
 * with a file and a line number beside it. That makes it load-bearing: a wrong
 * number here becomes a wrong fix. The functions are therefore small, and
 * `test/engine.test.mjs` pins them to published reference pairs (white on black is
 * 21:1, #767676 on white is 4.54:1, white on cyan-600 is 3.68:1).
 */

/** Parse `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. Returns `{r,g,b,a}` or null. */
export function parseHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
  const body = hex.slice(1);
  const pair = (index, width) => {
    const chunk = body.slice(index * width, index * width + width);
    return width === 1 ? parseInt(chunk + chunk, 16) : parseInt(chunk, 16);
  };
  const width = body.length <= 4 ? 1 : 2;
  return {
    r: pair(0, width),
    g: pair(1, width),
    b: pair(2, width),
    a: body.length === 4 || body.length === 8 ? pair(3, width) / 255 : 1,
  };
}

/** Accept a hex string, a `{colour}` slot from the palette, or an `{r,g,b}` object. */
function toRgba(value) {
  if (value && typeof value === 'object') {
    if (typeof value.colour === 'string') return toRgba(value.colour);
    if (typeof value.r === 'number') return { r: value.r, g: value.g, b: value.b, a: value.a ?? 1 };
    return null;
  }
  return parseHex(value);
}

/** sRGB channel → linear light, per WCAG 2.1 relative luminance. */
function linear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of an opaque colour given as hex or channels. */
export function luminance(value) {
  const colour = toRgba(value);
  if (!colour || colour.a < 1) return null;
  return 0.2126 * linear(colour.r) + 0.7152 * linear(colour.g) + 0.0722 * linear(colour.b);
}

/**
 * Composite `foreground` over `background` at `alpha` (default: the foreground's own
 * alpha). Both sides take hex strings or palette slots. Returns a hex string, which
 * is what `ratio` expects and what the reports print.
 */
export function blend(foreground, background, alpha) {
  const fg = toRgba(foreground);
  const bg = toRgba(background);
  if (!fg || !bg) return null;
  const a = alpha ?? fg.a ?? 1;
  if (a >= 1) return toHex(fg);
  return toHex({
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  });
}

/** `{r,g,b}` → `#rrggbb`. */
export function toHex({ r, g, b }) {
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((channel) => clamp(channel).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The raw WCAG contrast ratio, 1–21.
 *
 * Translucent colours are composited over each other first: without that step a
 * 5%-white overlay would be measured as pure white and every dark card with a
 * tinted overlay would report a failure that does not exist on screen.
 */
export function contrast(a, b) {
  const left = toRgba(a);
  const right = toRgba(b);
  if (!left || !right) return null;
  const fg = left.a < 1 ? toRgba(blend(left, right)) : left;
  const bg = right.a < 1 ? toRgba(blend(right, toHex({ r: 0, g: 0, b: 0 }))) : right;
  if (!fg || !bg) return null;
  const la = luminance(fg);
  const lb = luminance(bg);
  if (la === null || lb === null) return null;
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The ratio rounded to two decimals.
 *
 * Reporting 4.539710… invites arguments about the fourth digit. Reporting 4.54
 * matches the number WCAG checkers print and the number a reviewer will verify.
 * Rules compare this value against the thresholds, and the tests assert it exactly.
 */
export function ratio(a, b) {
  const value = contrast(a, b);
  if (value === null) return null;
  return Math.round(value * 100) / 100;
}

/** Format a ratio for a report, e.g. `4.54:1`. */
export function formatRatio(value) {
  return value === null ? 'unknown' : `${value.toFixed(2)}:1`;
}

/** WCAG floors. `large` is 18.66px bold or 24px regular; `ui` is 1.4.11. */
export const RATIO = { body: 4.5, large: 3, ui: 3 };
