/**
 * The fixer: the part of the engine that changes source instead of describing it.
 *
 * A UX tool that only reports is a tool someone has to remember to run. This module
 * exists so the engine can be a background fixer — but the licence to edit source is
 * narrow on purpose, and every edit has to earn it twice:
 *
 * 1. **Only mechanical defects are touched.** A colour that fails 4.5:1 has a
 *    computable replacement; a button disabled for no stated reason needs a sentence
 *    only a person can write. The first is fixed here; the second is refused, with a
 *    reason and a suggested owner, rather than guessed at.
 *
 * 2. **Every fix is verified, not assumed.** The edit is applied in memory, the same
 *    rule is run again on the result, and the file is written only if the finding is
 *    gone and nothing new appeared. A fixer that reports success without checking is
 *    worse than no fixer, because it spends the reader's trust on the wrong thing.
 *
 * The table below is therefore an allow-list, not a heuristic.
 */

import fs from 'node:fs';
import path from 'node:path';

import { RULES } from './rules.mjs';
import { PALETTE } from './lib/palette.mjs';
import { contrast, parseHex, toHex } from './lib/contrast.mjs';
import { stripComments } from './lib/project.mjs';

const SMALL_TEXT = 4.5;

/** The rule each remediation answers to, and the rules it deliberately will not. */
export const REMEDIATION_NOTES = {
  'no-focus-style': 'Appends a visible :focus-visible ring to a stylesheet that declares none.',
  'no-reduced-motion': 'Appends a prefers-reduced-motion block that removes animation.',
  'text-contrast': 'Moves the failing colour to the next accessible shade, or adjusts its lightness.',
  'placeholder-contrast': 'Moves the placeholder colour to the next accessible shade.',
  'target-blank-noopener': 'Adds rel="noopener noreferrer" to a link that opens a new tab.',
};

/**
 * Defects the fixer will not touch, with the reason. This is reported to the user
 * for every finding it declines, so "not fixed" never means "not noticed".
 */
export const REFUSALS = {
  'disabled-without-reason':
    'The button needs a sentence explaining what is missing, and where that sentence goes is a product decision. Keep it enabled and validate on click, or describe it with aria-describedby.',
  'native-alert': 'Replace it with an inline region next to the control; the placement is a design decision.',
  'swallowed-error': 'A swallowed catch needs a real failure path — a message, a retry, or an honest empty state.',
  'unlabelled-input': 'A label needs words. Add a persistent <label> or an aria-label written for this field.',
  'table-semantics': 'Rebuilding a div grid as a table changes layout; that is a structural edit, not a substitution.',
  'numeric-cells': 'Right-aligning numeric cells needs a class decision the project owns.',
  'small-target': 'A 44px target needs the surrounding layout to accept it; the CSS change is a design decision.',
  'radius-off-scale': 'Snapping a radius to the scale is a deliberate visual change; choose the step.',
  'hover-only-action': 'An action revealed on hover needs a keyboard-reachable equivalent and a resting affordance.',
  'image-without-alt': 'An empty alt makes an image decorative. Whether it carries meaning is not decidable from source.',
  'placeholder-link': 'A link with href="#" needs a destination; the fixer will not invent one.',
  'nav-missing-current': 'Current-page state needs the router the project uses; the fixer does not guess at it.',
  'pagination-not-in-url': 'Moving pagination into the URL changes routing and state ownership.',
  'zindex-arms-race': 'Replacing a magic z-index with a layer token needs the project‘s stacking order.',
  'raw-colour-in-class': 'Replacing an arbitrary colour class needs the project‘s token names.',
  'animate-height-auto': 'Animating height needs a layout decision (transform or measured height).',
  'bare-loading': 'A loading state needs a shape that matches the content it is waiting for.',
  'accidental-submit': 'Preventing an accidental submit changes the form‘s interaction model.',
  'fixed-width-container': 'A fixed width needs a fluid replacement chosen against the layout.',
  'disabled-contrast': 'Raising a disabled opacity is not enough; the label needs a token that passes on its own.',
  'focus-ring-removed': 'Restoring a focus ring is safe in CSS but the replacement ring is a design choice; run /restyle.',
  'engine-error': 'This is a bug in the engine, not a defect in the project.',
};

/** True when the fixer is allowed to edit for this rule. */
export function isFixable(finding) {
  return Object.hasOwn(REMEDIATION_NOTES, finding.id);
}

/* ------------------------------------------------------------------ colours */

function hexOf(colour) {
  const parsed = parseHex(colour);
  return parsed ? toHex(parsed) : null;
}

/** The shade of a Tailwind family nearest to `colour`, for name lookups. */
function familyShade(token) {
  const match = /^(?:text|bg|border|ring|from|via|to|placeholder)-([a-z]+)(?:-(\d{2,3}))?$/.exec(token);
  if (!match) return null;
  const [, family, shade] = match;
  return PALETTE[family] ? { family, shade: shade ? Number(shade) : null } : null;
}

/**
 * The first shade in the same family that clears the ratio, searching away from the
 * background first. Returns the token suffix or null.
 */
function nextAccessibleShade(family, shade, background, target = SMALL_TEXT) {
  const shades = Object.keys(PALETTE[family])
    .filter((key) => key !== 'DEFAULT')
    .map(Number)
    .sort((a, b) => a - b);
  if (!shades.length) return null;
  const start = shade ?? shades[Math.floor(shades.length / 2)];
  const backgroundIsLight = (contrast('#ffffff', background) ?? 0) < 2.5;
  // On a light surface, go darker; on a dark one, go lighter. Then try the other
  // direction as a fallback, because a mid-family shade can be the wrong side.
  const order = backgroundIsLight
    ? [...shades.filter((value) => value >= start), ...shades.filter((value) => value < start).reverse()]
    : [...shades.filter((value) => value <= start).reverse(), ...shades.filter((value) => value > start)];
  for (const candidate of order) {
    const hex = PALETTE[family][candidate];
    const value = contrast(hex, background);
    if (value !== null && value >= target) return candidate;
  }
  return null;
}

/** Move a hex colour's lightness toward safety until it clears the ratio. */
function adjustHex(foreground, background, target = SMALL_TEXT) {
  const rgb = parseHex(foreground);
  const bg = parseHex(background);
  if (!rgb || !bg) return null;
  const towardWhite = (contrast('#ffffff', background) ?? 0) < 2.5 ? false : true;
  for (let step = 1; step <= 60; step += 1) {
    const amount = step * 0.02;
    const candidate = {
      r: Math.round(towardWhite ? rgb.r + (255 - rgb.r) * amount : rgb.r * (1 - amount)),
      g: Math.round(towardWhite ? rgb.g + (255 - rgb.g) * amount : rgb.g * (1 - amount)),
      b: Math.round(towardWhite ? rgb.b + (255 - rgb.b) * amount : rgb.b * (1 - amount)),
    };
    const hex = toHex(candidate);
    const value = contrast(hex, background);
    if (value !== null && value >= target) return hex;
  }
  return null;
}

/* ------------------------------------------------------------------- edits */

function lineBounds(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) if (text[index] === '\n') starts.push(index + 1);
  return starts;
}

/** The raw text of a 1-based line. */
function lineAt(text, lineNumber) {
  const starts = lineBounds(text);
  const start = starts[lineNumber - 1] ?? 0;
  const end = starts[lineNumber] ?? text.length;
  return { start, end, text: text.slice(start, end) };
}

/** Every `{ ... }` block that contains `index`, with its bounds. */
function blockAround(text, index) {
  const open = text.lastIndexOf('{', index);
  if (open === -1) return null;
  const close = text.indexOf('}', index);
  if (close === -1) return null;
  const selectorStart = Math.max(text.lastIndexOf('}', open) + 1, text.lastIndexOf(';', open) + 1);
  return { start: selectorStart, bodyStart: open + 1, bodyEnd: close, end: close + 1 };
}

const CLASS_TOKEN = /[^\s"'`{}<>]+/g;

/** Replace one whole class token inside a class list, leaving variants alone. */
function replaceToken(raw, lineStart, lineText, token, replacement) {
  const pattern = new RegExp(`(^|[\\s"'\\\`])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[\\s"'\\\`])`);
  const match = pattern.exec(lineText);
  if (!match) return null;
  const offset = lineStart + match.index + match[1].length;
  return { start: offset, end: offset + token.length, replacement };
}

function pushEdit(edits, edit, note) {
  if (!edit) return false;
  edits.push({ ...edit, note });
  return true;
}

/**
 * Plan the edits for one finding.
 *
 * @returns {{ edits: {start:number,end:number,replacement:string,note:string}[] } |
 *           { refuse: string } | null} null means "this finding is not addressed".
 */
export function planFix(finding, context, text) {
  const { line } = finding;
  const raw = text;
  const lineInfo = lineAt(raw, line);

  if (finding.id === 'no-focus-style') {
    const block =
      '\n/* Focus must be visible. Added by the Northstar UX engine: this stylesheet\n' +
      '   styled its controls and never said what they look like when reached by\n' +
      '   keyboard, which leaves the browser default as the only indicator. */\n' +
      ':focus-visible {\n  outline: 2px solid currentColor;\n  outline-offset: 2px;\n}\n';
    return { edits: [{ start: raw.length, end: raw.length, replacement: block, note: 'adds a :focus-visible ring' }] };
  }

  if (finding.id === 'no-reduced-motion') {
    const block =
      '\n/* Motion is decoration; removing it must never remove information.\n' +
      '   Added by the Northstar UX engine. */\n' +
      '@media (prefers-reduced-motion: reduce) {\n' +
      '  *, *::before, *::after {\n    animation-duration: 0.01ms !important;\n' +
      '    animation-iteration-count: 1 !important;\n' +
      '    transition-duration: 0.01ms !important;\n    scroll-behavior: auto !important;\n  }\n}\n';
    return { edits: [{ start: raw.length, end: raw.length, replacement: block, note: 'adds a reduced-motion block' }] };
  }

  if (finding.id === 'target-blank-noopener') {
    const lineText = lineInfo.text;
    if (!/target\s*=\s*["'`]_blank["'`]/.test(lineText)) return null;
    const relMatch = /rel\s*=\s*["'`]([^"'`]*)["'`]/.exec(lineText);
    if (relMatch) {
      if (/noopener/.test(relMatch[1])) return null;
      const start = lineInfo.start + relMatch.index;
      const replacement = relMatch[0].replace(relMatch[1], `${relMatch[1]} noopener noreferrer`.trim());
      return { edits: [{ start, end: start + relMatch[0].length, replacement, note: 'adds noopener' }] };
    }
    const index = lineInfo.start + lineText.search(/target\s*=\s*["'`]_blank["'`]/);
    const at = lineInfo.start + lineText.indexOf('>', index - lineInfo.start);
    if (at === -1) return null;
    return { edits: [{ start: at, end: at, replacement: ' rel="noopener noreferrer"', note: 'adds noopener' }] };
  }

  if (finding.id === 'text-contrast' || finding.id === 'placeholder-contrast') {
    const detail = /(#[0-9a-f]{3,8})\s+on\s+(#[0-9a-f]{3,8})/i.exec(finding.detail ?? '');
    if (!detail) return null;
    const failing = hexOf(detail[1]);
    const background = hexOf(detail[2]);
    if (!failing || !background) return null;

    const tokens = [...lineInfo.text.matchAll(CLASS_TOKEN)].map((match) => match[0]);
    const prefix = finding.id === 'placeholder-contrast' ? 'placeholder' : 'text';

    // A pair has two sides. `bg-cyan-600 text-white` fails because the surface is
    // too light for white text, so the surface is what has to move; moving the text
    // toward white would make it worse. Both are tried, foreground first.
    for (const [slot, target, against] of [
      ['text', failing, background],
      ['bg', background, failing],
    ]) {
      for (const token of tokens) {
        const isPlaceholder = token.startsWith('placeholder-');
        if (slot === 'text' && prefix === 'placeholder' && !isPlaceholder) continue;
        if (slot === 'text' && prefix === 'text' && isPlaceholder) continue;
        if (slot === 'bg' && !token.startsWith('bg-')) continue;
        const probe = isPlaceholder ? token.replace(/^placeholder-/, 'text-') : token;
        if (!probe.startsWith(`${slot}-`)) continue;
        const family = familyShade(probe);
        if (!family) continue;
        const current = family.shade === null ? PALETTE[family.family].DEFAULT : PALETTE[family.family][family.shade];
        if (!current || hexOf(current) !== target) continue;

        const shade = nextAccessibleShade(family.family, family.shade, against);
        if (shade === null) continue;
        const replacement = token.replace(/-(\d{2,3})$/, `-${shade}`);
        if (replacement === token) continue;
        const edit = replaceToken(raw, lineInfo.start, lineInfo.text, token, replacement);
        if (!edit) continue;
        return {
          edits: [{ ...edit, note: `${token} → ${replacement} against ${against}` }],
        };
      }
    }

    // A CSS declaration with a literal hex: move its lightness until the pair passes.
    const hexMatch = new RegExp(failing, 'i').exec(lineInfo.text);
    if (hexMatch) {
      const replacement = adjustHex(failing, background);
      if (!replacement) return { refuse: `no lightness of ${failing} reaches 4.5:1 against ${background}` };
      const start = lineInfo.start + hexMatch.index;
      return {
        edits: [{ start, end: start + failing.length, replacement, note: `${failing} → ${replacement}` }],
      };
    }
    return { refuse: `neither side of the pair (${failing} / ${background}) could be moved to reach 4.5:1 on that line` };
  }

  return null;
}

/* -------------------------------------------------------------- application */

/** Run one rule against one file context, the way the scanner does. */
function runRule(ruleId, context, text) {
  const rule = RULES.find((entry) => entry.id === ruleId);
  if (!rule) return [];
  try {
    return rule.check(context, text) ?? [];
  } catch {
    return [];
  }
}

/**
 * Fix every finding in one file, verifying each edit before it is kept.
 *
 * The verification is the contract: an edit that does not remove the finding it
 * aimed at is reverted, so the caller's "fixed" count is a count of things that are
 * demonstrably no longer there.
 */
export function fixFile({ absolute, context, findings, rules = RULES, dryRun = false, kind = 'react-spa' }) {
  let text = context.raw;
  const applied = [];
  const refused = [];

  if (kind === 'server-rendered') {
    // The markup and CSS in these products live inside a Python string. An offset
    // that is correct for the extracted CSS is not correct for the `.py` file, and a
    // fixer that writes to the wrong offset corrupts code that still imports.
    return {
      applied: [],
      refused: findings.map((finding) => ({
        finding,
        reason:
          'server-rendered pages are fixed by hand: their markup is a Python string, so an edit offset would not be safe',
      })),
      changed: false,
    };
  }

  // The scanner reports one finding per rule per file for aggregated rules, with a
  // single example line. Fixing only that example would leave the rest of the
  // occurrences in place and the report would cry wolf on the next run — so after a
  // successful edit the rule is re-run and its remaining occurrences join the queue.
  const queue = [...findings];
  let guard = 0;

  while (queue.length && guard < 400) {
    guard += 1;
    const finding = queue.shift();
    if (!isFixable(finding)) {
      if (!refused.some((entry) => entry.finding.id === finding.id)) {
        refused.push({ finding, reason: REFUSALS[finding.id] ?? 'not a mechanical defect' });
      }
      continue;
    }
    const current = stripForRules(text);
    const before = runRule(finding.id, { ...context, raw: text }, current).length;
    const plan = planFix(finding, { ...context, raw: text }, text);
    if (!plan) {
      pushRefusal(refused, finding, REFUSALS[finding.id] ?? 'the fixer could not place this edit safely');
      continue;
    }
    if (plan.refuse) {
      pushRefusal(refused, finding, plan.refuse);
      continue;
    }
    const edits = [...plan.edits].sort((a, b) => b.start - a.start);
    let candidate = text;
    for (const edit of edits) {
      candidate = candidate.slice(0, edit.start) + edit.replacement + candidate.slice(edit.end);
    }
    const after = runRule(finding.id, { ...context, raw: candidate }, stripForRules(candidate)).length;
    const otherBefore = countOther(finding.id, context, text, rules);
    const otherAfter = countOther(finding.id, context, candidate, rules);
    if (!(after < before && otherAfter <= otherBefore)) {
      pushRefusal(
        refused,
        finding,
        'the edit did not remove the finding when the rule was run again, so it was reverted',
      );
      continue;
    }
    text = candidate;
    applied.push({ finding, note: plan.edits.map((edit) => edit.note).join('; '), line: finding.line });
    for (const fresh of runRule(finding.id, { ...context, raw: text }, stripForRules(text))) {
      queue.push(fresh);
    }
  }

  if (applied.length && !dryRun) {
    fs.writeFileSync(absolute, text, 'utf8');
  }
  return { applied, refused, changed: applied.length > 0 && !dryRun };
}

function pushRefusal(refused, finding, reason) {
  if (refused.some((entry) => entry.finding.id === finding.id)) return;
  refused.push({ finding, reason });
}

function countOther(ruleId, context, text, rules) {
  let total = 0;
  for (const rule of rules) {
    if (rule.id === ruleId) continue;
    try {
      total += (rule.check(context, stripForRules(text)) ?? []).length;
    } catch {
      total += 0;
    }
  }
  return total;
}

/**
 * The rules read a comment-stripped view of the file, with newlines preserved so line
 * numbers still match. The fixer has to use the same view or it verifies against a
 * different document than the one that produced the finding.
 */
function stripForRules(text) {
  return stripComments(text);
}

/** Build the context object the scanner gives a rule. */
export function contextFor(project, relPath, rawText) {
  const extension = path.extname(relPath).toLowerCase();
  return {
    relPath,
    kind: extension === '.tsx' || extension === '.jsx' ? 'jsx' : extension === '.css' ? 'css' : 'html',
    surface: project.surface,
    raw: rawText,
  };
}

/** Read a project's findings for one file. */
export function findingsForFile(project, finding) {
  return project.findings.filter((entry) => entry.file === finding.file);
}
