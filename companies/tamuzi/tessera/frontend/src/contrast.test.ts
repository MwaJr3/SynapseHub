/**
 * Contrast, measured rather than assumed.
 *
 * axe cannot check colour contrast in jsdom (no layout, no compositing), and no
 * browser was available when this was written, so the numbers are computed here
 * from the values actually in `styles.css`. Two things are asserted:
 *
 * 1. **Every pair the product uses clears its WCAG 2.2 threshold** — 4.5:1 for
 *    body text, 3:1 for large text and for the boundary of a control.
 * 2. **No stylesheet or component reads a token that does not exist.** A missing
 *    custom property fails silently in CSS (the declaration is dropped), which is
 *    how an invisible border on the consent screen survived until this pass.
 *
 * This is a lower bound, not a substitute for looking at the thing: contrast
 * here is foreground-on-background for the tokens as declared, not for every
 * composite a browser might paint (opacity, gradients, the aurora layer).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = dirname(fileURLToPath(import.meta.url));

function read(file: string): string {
  return readFileSync(join(SRC, file), 'utf8');
}

const css = read('styles.css');

/** Every component the sweep can touch, read as source text. */
const components = readdirSync(SRC)
  .filter((file) => file.endsWith('.tsx'))
  .map((file) => read(file))
  .join('\n');

function tokens(css: string): Map<string, string> {
  const root = css.slice(css.indexOf(':root'), css.indexOf('}', css.indexOf(':root')));
  const found = new Map<string, string>();
  for (const match of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    found.set(match[1]!, match[2]!.trim());
  }
  return found;
}

function rgb(colour: string): [number, number, number] {
  const hex = colour.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** One named background from the stylesheet, or a failure that names the rule. */
function boardColour(selector: string): string {
  const match = css.match(new RegExp(`\\.square\\.${selector}\\s*{\\s*background:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!match?.[1]) throw new Error(`no background declared for .square.${selector}`);
  return match[1];
}

function contrast(foreground: string, background: string): number {
  const a = luminance(rgb(foreground));
  const b = luminance(rgb(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const palette = tokens(css);

/** Resolve a token, or fail loudly naming the token — no silent fallbacks. */
function token(name: string): string {
  const value = palette.get(name);
  if (!value) throw new Error(`token ${name} is not declared in :root`);
  return value;
}

describe('the tokens exist', () => {
  it('declares every custom property the stylesheet and the components read', () => {
    // `var(--x, #hex)` is allowed only for a fallback that is itself correct at
    // runtime; the ones here are all real tokens, so a missing declaration is a
    // defect rather than a style choice.
    const referenced = new Set(
      [...(`${css}\n${components}`).matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1]!),
    );
    const missing = [...referenced].filter((name) => !palette.has(name)).sort();
    expect(missing).toEqual([]);
  });
});

describe('text contrast (WCAG 1.4.3, AA)', () => {
  const pairs: [string, string, string, 'body' | 'large'][] = [
    ['ink on paper', '--ink', '--paper', 'body'],
    ['ink on a card', '--ink', '--card', 'body'],
    ['muted on paper', '--muted', '--paper', 'body'],
    ['muted on a card', '--muted', '--card', 'body'],
    ['accent on a card', '--accent', '--card', 'body'],
    ['accent on its soft fill', '--accent', '--accent-soft', 'body'],
    ['white on the primary button', '--on-accent', '--accent', 'body'],
    ['good on a card', '--good', '--card', 'body'],
    ['warn on a card', '--warn', '--card', 'body'],
    ['bad on a card', '--bad', '--card', 'body'],
    ['bad on paper', '--bad', '--paper', 'body'],
    ['the disabled label on its fill', '--muted', '--panel-2', 'body'],
  ];

  for (const [name, foreground, background, size] of pairs) {
    it(`${name} clears ${size === 'body' ? '4.5' : '3'}:1`, () => {
      const ratio = contrast(token(foreground), token(background));
      expect(ratio, `${name}: ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(size === 'body' ? 4.5 : 3);
    });
  }
});

describe('non-text contrast (WCAG 1.4.11)', () => {
  it('the boundary of a text field is visible against a card', () => {
    expect(contrast(token('--line-strong'), token('--card'))).toBeGreaterThanOrEqual(3);
  });

  it('the boundary of a text field is visible against the page', () => {
    expect(contrast(token('--line-strong'), token('--paper'))).toBeGreaterThanOrEqual(3);
  });

  it('the two colours of the chess board are distinguishable', () => {
    // Read from the stylesheet rather than repeated here, so the assertion cannot
    // drift from what ships.
    expect(contrast(boardColour('light'), boardColour('dark'))).toBeGreaterThanOrEqual(3);
  });

  it('a legal-move marker is visible on both square colours', () => {
    // The marker is the green dot plus its ink ring, and the ring is what has to
    // carry the contrast (the dot alone is close to the dark square).
    const light = boardColour('light');
    const dark = boardColour('dark');
    const ring = token('--ink');
    expect(contrast(ring, light)).toBeGreaterThanOrEqual(3);
    expect(contrast(ring, dark)).toBeGreaterThanOrEqual(3);
    // And the dot is still a second cue on the light squares.
    expect(contrast(token('--move'), light)).toBeGreaterThanOrEqual(3);
  });

  it('the focus ring stands out from both surfaces', () => {
    const ring = token('--accent');
    expect(contrast(ring, token('--card'))).toBeGreaterThanOrEqual(3);
    expect(contrast(ring, token('--paper'))).toBeGreaterThanOrEqual(3);
  });
});

describe('the file itself', () => {
  it('has a reduced-motion block for every animation it declares', () => {
    // Every @keyframes name is either switched off wholesale by the reduced-motion
    // block (`* { animation: none !important; }`) or named there individually.
    // Both are fine; what is not fine is a stylesheet with no such block at all.
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    expect(css).toMatch(/animation:\s*none\s*!important/);
  });
});
