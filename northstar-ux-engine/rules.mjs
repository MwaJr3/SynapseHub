/**
 * The rule set: UX defects that can be established from source alone.
 *
 * Every rule here is a *checkable* claim. The engine does not score taste, and it
 * does not claim to have seen the page: a rule either finds a pattern whose
 * consequence is known, or it stays silent. That is why there is no rule for
 * "the hero lacks a clear value proposition" — that needs a human or a browser —
 * and why there is one for "this input removes the focus ring and puts nothing
 * back", which is decidable from the text of the file.
 *
 * Each rule names the pattern it enforces so a finding can be traced back to the
 * catalogue in `PATTERNS.md`.
 */

import { blend, contrast, ratio } from './lib/contrast.mjs';
import { coloursIn } from './lib/palette.mjs';

const SMALL_TEXT_RATIO = 4.5;
const LARGE_TEXT_RATIO = 3.0;
const NON_TEXT_RATIO = 3.0;

/**
 * What kind of source is this? Rules are scoped by kind, so a JSX rule never
 * fires on a stylesheet and a CSS rule never fires on a Markdown-adjacent file.
 * @param {{ kind?: string }} file
 * @param {...string} kinds
 */
const is = (file, ...kinds) => kinds.includes(file.kind);

/** Line number for a character offset (1-based). */
function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i += 1) if (text[i] === '\n') line += 1;
  return line;
}

/** The source line containing `index`, trimmed, for the evidence field. */
function snippetAt(text, index, max = 160) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index);
  const line = text.slice(start, end === -1 ? text.length : end).trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/**
 * Build a reportable finding. Only the fields a reader needs are copied across —
 * the rule's own `check` function is not part of the output, so a serialised
 * report is the same shape as the in-memory one.
 */
function finding(meta, file, text, index, extra = {}) {
  return {
    id: meta.id,
    pattern: meta.pattern,
    severity: meta.severity,
    confidence: meta.confidence,
    title: meta.title,
    why: meta.why,
    fix: meta.fix,
    aggregate: meta.aggregate ?? 'line',
    file: file.relPath,
    line: lineAt(text, index),
    evidence: snippetAt(text, index),
    ...extra,
  };
}

/** Resolve a `color:`/`background:` pair to a ratio against the known surface. */
function ratioOf(foreground, background, surface) {
  const fg = foreground.alpha < 1 && background ? blend(foreground.colour, background, foreground.alpha) : foreground.colour;
  if (!background) return fg && surface ? ratio(fg, surface) : null;
  const bg = background.alpha < 1 && surface ? blend(background.colour, surface, background.alpha) : background.colour;
  return fg ? ratio(fg, bg) : null;
}

/**
 * Is this offset inside a quoted string on its line?
 *
 * `setMessage(\`${n} new alert(s)\`)` contains the word alert followed by a
 * parenthesis, and it is not a call. Counting the quote characters before the match
 * on that line is enough to tell the two apart, and it is the kind of check that
 * cannot misfire on real code because real calls are not written inside strings.
 */
function insideQuotedString(raw, index) {
  const lineStart = raw.lastIndexOf('\n', index) + 1;
  const before = raw.slice(lineStart, index);
  for (const quote of ['"', "'", '`']) {
    let count = 0;
    for (let i = 0; i < before.length; i += 1) {
      if (before[i] === '\\') { i += 1; continue; }
      if (before[i] === quote) count += 1;
    }
    if (count % 2 === 1) return true;
  }
  return false;
}

/** Rule 1 — a removed focus ring with no visible replacement. */
const focusRingRemoved = {
  id: 'focus-ring-removed',
  pattern: 'P46',
  severity: 'P1',
  confidence: 'high',
  title: 'Focus ring removed without a replacement',
  why:
    'Keyboard users cannot see where they are. WCAG 2.4.7 requires a visible focus indicator, and 1.4.11 asks for 3:1 against the adjacent colour.',
  fix:
    'Keep the outline, or replace it with a visible ring: `focus-visible:ring-2 focus-visible:ring-<accent> focus-visible:ring-offset-2`. Never `outline-none` alone.',
  check(file, text) {
    if (!is(file, 'css', 'jsx')) return [];
    const out = [];
    if (is(file, 'css')) {
      // A declaration that removes the outline is only a defect when its rule block
      // does not also paint something in its place.
      for (const match of text.matchAll(/outline\s*:\s*(?:none|0)\b/gi)) {
        const blockStart = text.lastIndexOf('{', match.index);
        const blockEnd = text.indexOf('}', match.index);
        const block = text.slice(Math.max(blockStart, 0), blockEnd === -1 ? match.index + 240 : blockEnd);
        if (/(box-shadow|outline-(width|color|style)|border(-color)?)\s*:/.test(block)) continue;
        out.push(finding(focusRingRemoved, file, text, match.index));
      }
    }
    if (is(file, 'jsx')) {
      for (const match of text.matchAll(/["'`]([^"'`]*?(?:focus|focus-visible):outline-none[^"'`]*?)["'`]/g)) {
        const classList = match[1];
        if (/(focus|focus-visible):(ring|outline-(?!none)|shadow)/.test(classList)) continue;
        out.push(finding(focusRingRemoved, file, text, match.index));
      }
    }
    return out;
  },
};

/**
 * Rule 2 — a page whose stylesheet never gives focus a visible style.
 *
 * This is the failure the eight server-rendered products share: buttons and links
 * are styled, and nothing anywhere says what they look like when reached by
 * keyboard. It is a whole-page claim, so the rule reports once per stylesheet.
 */
const noFocusStyle = {
  id: 'no-focus-style',
  pattern: 'P46',
  severity: 'P1',
  confidence: 'high',
  title: 'Stylesheet never declares a focus style',
  why:
    'The browser default outline is the only focus indicator left, and the first `outline: none` anywhere removes it. Nothing here confirms keyboard focus is visible.',
  fix: 'Add `:focus-visible { outline: 2px solid <accent>; outline-offset: 2px; }` to the base layer and check it on buttons, links and inputs.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    if (/:focus(-visible|-within)?\b/.test(text)) return [];
    if (!/(button|input|a\s*[,{]|\.btn|\[type=)/.test(text)) return [];
    return [finding(noFocusStyle, file, text, text.search(/(button|input|\.btn)/))];
  },
};

/** Rule 3 — a disabled control that never says why. */
const disabledWithoutReason = {
  id: 'disabled-without-reason',
  pattern: 'P05',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Button is disabled by an unsatisfied condition with no stated reason',
  why:
    'A disabled control drops out of the tab order and its tooltip never fires, so the reason is unreachable. Users are left guessing which field is missing.',
  fix:
    'Keep the button enabled, validate on click, and put focus on the first blocking field with a sentence naming it. If it must stay disabled, add `aria-describedby` to a visible explanation.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/<button\b[\s\S]{0,400}?>/g)) {
      const element = match[0];
      const disabled = /disabled=\{([^}]+)\}/.exec(element);
      if (!disabled) continue;
      const expression = disabled[1].trim();
      // Only block-on-unfilled-content is in scope. A button disabled while a
      // request is in flight says so in its own label; a button disabled because
      // the game already ended is not asking the user for anything. What is worth
      // reporting is the case where the user must fill something and nothing says
      // what — the reason is only discoverable by tabbing backwards.
      const blockedOnContent = /^!\s*[\w.]+(\.trim\(\))?$/.test(expression) ||
        /\.length\s*===\s*0/.test(expression) ||
        /===\s*(''|"")/.test(expression);
      if (!blockedOnContent) continue;
      if (/aria-describedby|aria-disabled|title=/.test(element)) continue;
      out.push(finding(disabledWithoutReason, file, text, match.index, { detail: `disabled={${expression}}` }));
    }
    return out;
  },
};

/** Rule 4 — a disabled style that pushes its own label below contrast. */
const disabledContrast = {
  id: 'disabled-contrast',
  pattern: 'P70',
  severity: 'P2',
  confidence: 'medium',
  title: 'Disabled styling fades the label below the contrast floor',
  why:
    'Greyed-out text usually lands near 2–3:1. The control is already blocked; making the reason unreadable compounds it.',
  fix:
    'Style disabled from tokens (muted surface + readable label) instead of `opacity`, and pair it with a sentence or `aria-disabled` explaining the block.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    const out = [];
    for (const match of text.matchAll(/([^{}]{0,200}?:disabled[^{}]*)\{([^}]*)\}/g)) {
      const opacity = /opacity\s*:\s*([\d.]+)/.exec(match[2]);
      if (!opacity) continue;
      const value = Number(opacity[1]);
      if (!Number.isFinite(value) || value >= 0.75) continue;
      out.push(finding(disabledContrast, file, text, match.index, { detail: `opacity: ${value}` }));
    }
    return out;
  },
};

/**
 * Rule 5 — measurable text contrast.
 *
 * Three sources of pairs, in one rule, because they all answer the same question:
 * a JSX class list, a CSS rule that sets `color` and a background, and a CSS rule
 * that sets only `color` (checked against the page surface). Where the pair cannot
 * be resolved to two colours the rule says nothing.
 */
const textContrast = {
  id: 'text-contrast',
  pattern: 'P70',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file-detail',
  title: 'Text/background pair is below the WCAG contrast floor',
  why:
    'Body text needs 4.5:1 and large text 3:1. Muted greys are where most failures hide, because they look deliberate and read as broken.',
  fix: 'Darken or lighten one side of the pair until it clears 4.5:1 (3:1 for text at 24px+ or 18.66px bold).',
  check(file, text) {
    const surface = file.surface ?? null;
    const out = [];

    const record = (index, foreground, background, classList, note) => {
      const value = ratioOf(foreground, background, surface);
      if (value === null || value >= SMALL_TEXT_RATIO) return;
      out.push(
        finding(textContrast, file, text, index, {
          severity: value < NON_TEXT_RATIO ? 'P1' : 'P2',
          detail: `${foreground.colour} on ${background ? background.colour : surface} = ${value.toFixed(2)}:1${
            note ? ` (${note})` : ''
          }`,
          sizeHint: classList,
        }),
      );
    };

    if (is(file, 'jsx', 'html')) {
      for (const match of text.matchAll(/class(?:Name)?=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g)) {
        const classList = match[1] ?? match[2] ?? match[3] ?? '';
        const { background, text: foreground, unknownBackground } = coloursIn(classList);
        if (!foreground.length) continue;
        if (unknownBackground && !background.length) continue;
        record(match.index, foreground[0], background[0] ?? null, classList);
      }
    }

    if (is(file, 'css')) {
      for (const match of text.matchAll(/@apply\s+([^;]+);/g)) {
        const classList = match[1];
        const { background, text: foreground, unknownBackground } = coloursIn(classList);
        if (!foreground.length) continue;
        if (unknownBackground && !background.length) continue;
        record(match.index, foreground[0], background[0] ?? null, classList);
      }
      for (const match of text.matchAll(/\{([^}]*)\}/g)) {
        const block = match[1];
        if (/@apply/.test(block)) continue;
        const colour = /(?:^|[;{\s])color\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(block);
        if (!colour) continue;
        const back = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(block);
        if (!back) {
          // A rule that sets only `color` inherits its background from wherever the
          // element sits. That is unknowable from a stylesheet, so the page surface
          // is only a fair substitute for a rule that *is* the page.
          const selector = text.slice(text.lastIndexOf('}', match.index) + 1, match.index).trim();
          if (!/^(body|html|:root)\b/.test(selector)) continue;
        }
        record(
          match.index,
          { colour: colour[1], alpha: 1 },
          back ? { colour: back[1], alpha: 1 } : null,
          '',
          back ? null : 'page surface',
        );
      }
    }

    if (is(file, 'html')) {
      for (const match of text.matchAll(/style="([^"]*)"/g)) {
        const declarations = match[1];
        const colour = /(?:^|;)\s*color\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(declarations);
        if (!colour) continue;
        const back = /background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/.exec(declarations);
        record(
          match.index,
          { colour: colour[1], alpha: 1 },
          back ? { colour: back[1], alpha: 1 } : null,
          '',
          back ? null : 'inline style on page surface',
        );
      }
    }
    return out;
  },
};

/** Rule 6 — placeholder colour as if it were body text. */
const placeholderContrast = {
  id: 'placeholder-contrast',
  pattern: 'P24',
  severity: 'P3',
  confidence: 'high',
  aggregate: 'file-detail',
  title: 'Placeholder text is below contrast threshold',
  why:
    'Placeholder text carries instructions. At 3–4:1 it is hard to read and disappears for low-vision users exactly when it is needed.',
  fix: 'Use a placeholder token at 4.5:1 against the field background, and keep a persistent label above the field.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    const out = [];
    for (const match of text.matchAll(/@apply\s+([^;]+);/g)) {
      const classList = match[1];
      const placeholder = /placeholder-([a-z]+)-?(\d{2,3})?/.exec(classList);
      if (!placeholder) continue;
      const { background } = coloursIn(classList.replace(/placeholder-\S+/g, ''));
      if (!background.length) continue;
      const resolved = coloursIn(`text-${placeholder[1]}${placeholder[2] ? `-${placeholder[2]}` : ''}`);
      const colour = resolved.text[0];
      if (!colour) continue;
      const value = ratio(colour.colour, background[0].colour);
      if (value === null || value >= SMALL_TEXT_RATIO) continue;
      out.push(
        finding(placeholderContrast, file, text, match.index, {
          detail: `${colour.colour} on ${background[0].colour} = ${value.toFixed(2)}:1`,
        }),
      );
    }
    return out;
  },
};

/** Rule 7 — an input with no accessible name. */
const unlabelledInput = {
  id: 'unlabelled-input',
  pattern: 'P51',
  severity: 'P1',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Input has no accessible name',
  why:
    'A placeholder vanishes on the first keystroke and is announced inconsistently; screen readers get an unnamed edit box. WCAG 3.3.2 and 4.1.2 both apply.',
  fix: 'Add a persistent `<label htmlFor>` (or `aria-label`), and keep the placeholder as an example only.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<input\b[^>]*>/g)) {
      const element = match[0];
      if (/type=\{?["']?(hidden|submit|checkbox|radio|file)["']?/.test(element)) continue;
      if (/aria-label|aria-labelledby/.test(element)) continue;
      if (/id=/.test(element) && /<label\b[^>]*htmlFor|<label\b[^>]*for=/.test(text)) continue;
      // A `<Field label>` or `<label>` wrapper associates nearby text.
      const before = text.slice(Math.max(0, match.index - 400), match.index);
      if (/<Field\b[^>]*label=|<label\b[^>]*>/.test(before)) continue;
      out.push(finding(unlabelledInput, file, text, match.index, { detail: element.slice(0, 90) }));
    }
    return out;
  },
};

/** Rule 8 — native `confirm()` for a destructive or consequential action. */
const nativeConfirm = {
  id: 'native-confirm',
  pattern: 'P48',
  severity: 'P2',
  confidence: 'high',
  title: 'Consequential action uses the browser’s blocking confirm()',
  why:
    '`window.confirm` blocks the page, cannot be styled or translated, is suppressed by some embedded browsers, and offers no way back. It also trains users to dismiss dialogs without reading.',
  fix: 'Name the action on both buttons (Delete / Keep) and confirm inline, or perform it immediately with a time-limited undo.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    const raw = file.raw ?? text;
    for (const match of text.matchAll(/(?<![.\w])confirm\s*\(/g)) {
      if (/confirm[A-Za-z]/.test(text.slice(match.index, match.index + 20))) continue;
      if (insideQuotedString(raw, match.index)) continue;
      out.push(finding(nativeConfirm, file, text, match.index));
    }
    return out;
  },
};

/** Rule 9 — `alert()` as the error surface. */
const nativeAlert = {
  id: 'native-alert',
  pattern: 'P23',
  severity: 'P2',
  confidence: 'high',
  title: 'Errors surfaced through a native alert()',
  why:
    '`alert()` blocks the main thread, is not announced with the field it belongs to, and cannot be recovered from inline. It is the pattern error states were invented to replace.',
  fix: 'Render the error inline next to the control, with `role="alert"` and a recovery action.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    const raw = file.raw ?? text;
    for (const match of text.matchAll(/(?<![.\w])alert\s*\(/g)) {
      if (insideQuotedString(raw, match.index)) continue;
      out.push(finding(nativeAlert, file, text, match.index));
    }
    return out;
  },
};

/** Rule 10 — a page-level load that only says "Loading…". */
const bareLoading = {
  id: 'bare-loading',
  pattern: 'P54',
  severity: 'P2',
  confidence: 'high',
  title: 'Loading state is bare text with no status semantics or shape',
  why:
    'A spinner or the word “Loading” tells the user nothing about what is coming, and without `role="status"` it is invisible to assistive technology.',
  fix:
    'Render a skeleton shaped like the content, wrap it in `role="status" aria-live="polite"` with an accessible name, and let `prefers-reduced-motion` stop the shimmer.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/Loading…|Loading\.\.\./g)) {
      const context = text.slice(Math.max(0, match.index - 300), match.index + 200);
      if (/role="status"|aria-busy|aria-live|skeleton/i.test(context)) continue;
      // A button that swaps its own label while it works is the behind-the-button
      // pattern, not a page-level loader: its label and disabled state carry the
      // news. Scope this to the element the text actually sits inside — a window of
      // surrounding source would swallow a page-level loader whenever any nearby
      // button happened to be disabled.
      const tagStart = text.lastIndexOf('<', match.index);
      if (tagStart !== -1) {
        const tagEnd = text.indexOf('>', tagStart);
        const tag = tagEnd === -1 ? '' : text.slice(tagStart, tagEnd + 1);
        if (/^<button\b/.test(tag) && /disabled=\{|aria-busy|onClick/.test(tag)) continue;
      }
      out.push(finding(bareLoading, file, text, match.index));
    }
    return out;
  },
};

/** Rule 11 — motion with no reduced-motion escape. */
const noReducedMotion = {
  id: 'no-reduced-motion',
  pattern: 'P21',
  severity: 'P2',
  confidence: 'high',
  title: 'Motion declared without a prefers-reduced-motion escape',
  why:
    'Roughly one user in three has asked their OS for less motion. An animation with no media query ignores that request and can trigger discomfort.',
  fix: 'Add `@media (prefers-reduced-motion: reduce) { … animation: none; transition: none; }` for the declarations you added.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    if (!/(animation|transition)\s*:/.test(text)) return [];
    if (/prefers-reduced-motion/.test(text)) return [];
    const index = text.search(/(animation|transition)\s*:/);
    return [finding(noReducedMotion, file, text, index)];
  },
};

/** Rule 12 — animating `height: auto`. */
const animateHeightAuto = {
  id: 'animate-height-auto',
  pattern: 'P62',
  severity: 'P3',
  confidence: 'high',
  title: 'Transition targets `height: auto`, which cannot animate',
  why: 'The browser cannot interpolate `auto`, so the transition snaps. It reads as broken rather than as instant.',
  fix: 'Animate `grid-template-rows` from `0fr` to `1fr`, or measure the element and animate to a pixel value.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    const out = [];
    for (const match of text.matchAll(/transition[^;{}]*height[^;{}]*[,;]/g)) {
      out.push(finding(animateHeightAuto, file, text, match.index));
    }
    return out;
  },
};

/** Rule 13 — escalating z-index. */
const zIndexArmsRace = {
  id: 'zindex-arms-race',
  pattern: 'P44',
  severity: 'P3',
  confidence: 'high',
  title: 'Escalating z-index instead of a stacking context',
  why:
    'A large number cannot climb out of a parent stacking context. The value hides the real cause and guarantees the next component picks a larger one.',
  fix: 'Give the parent `isolation: isolate` and rank siblings in a small, documented scale (1–5).',
  check(file, text) {
    if (!is(file, 'css', 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/z-index\s*:\s*(\d{3,})|z-\[(\d{3,})\]|z-(\d{3,})\b/g)) {
      const value = Number(match[1] ?? match[2] ?? match[3]);
      if (!Number.isFinite(value) || value < 100) continue;
      out.push(finding(zIndexArmsRace, file, text, match.index, { detail: `z-index ${value}` }));
    }
    return out;
  },
};

/** Rule 14 — a table header without `scope`. */
const tableSemantics = {
  id: 'table-semantics',
  pattern: 'P63',
  severity: 'P3',
  confidence: 'high',
  aggregate: 'file',
  title: 'Table header without `scope`',
  why:
    'Without `scope`, a screen reader cannot say which column a cell belongs to, and the table degrades to a stream of numbers.',
  fix: 'Add `scope="col"` to column headers and `scope="row"` to row headers.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<th\b[^>]*>/g)) {
      if (/scope=/.test(match[0])) continue;
      out.push(finding(tableSemantics, file, text, match.index));
    }
    return out;
  },
};

/** Rule 15 — numbers rendered without tabular figures. */
const numericCells = {
  id: 'numeric-cells',
  pattern: 'P63',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Numeric cell without tabular figures or right alignment',
  why:
    'Proportional, left-aligned digits jitter between rows, so a column of numbers cannot be compared at a glance.',
  fix: 'Right-align numeric columns and set `font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums text-right`).',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<td\b[^>]*class(?:Name)?=(?:"([^"]*)"|\{`([^`]*)`\})[^>]*>([\s\S]{0,400}?)<\/td>/g)) {
      const classList = match[1] ?? match[2] ?? '';
      const body = match[3];
      if (!/toLocaleString|toFixed|\.length\}|%<\/|count\b|amount|total/i.test(body)) continue;
      // `td-num` is this repository's documented numeric-cell class; the engine
      // cannot read the stylesheet from here, so the convention is named instead.
      if (/tabular-nums|text-right|td-num|num-cell/.test(classList)) continue;
      out.push(finding(numericCells, file, text, match.index));
    }
    return out;
  },
};

/** Rule 16 — pagination state that a refresh throws away. */
const paginationNotInUrl = {
  id: 'pagination-not-in-url',
  pattern: 'P61',
  severity: 'P2',
  confidence: 'medium',
  title: 'List pagination keeps its page in component state only',
  why:
    'A refresh, a shared link or the back button drops the user on page one, and the page they were reading is lost.',
  fix: 'Read and write the page from the URL (`useSearchParams`, or the hash the router already owns) so the view is addressable.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    if (!/useState[^\n]*\bpage\b|setPage\b/.test(text)) return [];
    if (/useSearchParams|URLSearchParams|location\.hash|location\.search/.test(text)) return [];
    const index = text.search(/useState[^\n]*\bpage\b|setPage\b/);
    return [finding(paginationNotInUrl, file, text, index)];
  },
};

/** Rule 17 — an action that only exists on hover. */
const hoverOnlyAction = {
  id: 'hover-only-action',
  pattern: 'P06',
  severity: 'P2',
  confidence: 'medium',
  title: 'Element is hidden until hover',
  why:
    'Touch has no hover. The first tap becomes a sticky hover state, and anything hidden stays undiscoverable on a phone.',
  fix: 'Keep hover for secondary extras, gate the style behind `@media (hover: hover)`, and give every action a tap-reachable home.',
  check(file, text) {
    if (!is(file, 'jsx', 'css')) return [];
    const out = [];
    for (const match of text.matchAll(/\bhidden\s+group-hover:|\bhover:hidden|opacity-0\s+group-hover:opacity-100/g)) {
      out.push(finding(hoverOnlyAction, file, text, match.index));
    }
    if (is(file, 'css')) {
      for (const match of text.matchAll(/opacity\s*:\s*0\s*;/g)) {
        const block = text.slice(Math.max(0, match.index - 200), match.index + 200);
        if (!/:hover/.test(block)) continue;
        out.push(finding(hoverOnlyAction, file, text, match.index));
      }
    }
    return out;
  },
};

/** Rule 18 — raw colour values inside class lists. */
const rawColourInClass = {
  id: 'raw-colour-in-class',
  pattern: 'P69',
  severity: 'P3',
  confidence: 'high',
  title: 'Raw colour literal in a component class list',
  why:
    'A hex value in a component bypasses the token layer, so a rebrand or a dark-mode swap has to hunt it down. Tokens exist so one change cascades.',
  fix: 'Use the semantic token (`bg-surface`, `text-ink-muted`) or a theme value, not `bg-[#…]`.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/\b(?:bg|text|border|ring|from|to|via)-\[#[0-9a-fA-F]{3,8}\]/g)) {
      out.push(finding(rawColourInClass, file, text, match.index));
    }
    return out;
  },
};

/** Rule 19 — a radius scale that is really a pile of one-off numbers. */
const radiusOffScale = {
  id: 'radius-off-scale',
  pattern: 'P72',
  severity: 'P3',
  confidence: 'medium',
  title: 'More than five distinct literal border radii in one stylesheet',
  why:
    'Nested corners read as deliberate only when they come from one scale. Six or more hand-written values is usually a decision made per component, and the next component will invent a seventh.',
  fix: 'Commit to a named scale in `:root` (2 · 4 · 8 · 12 · 16) and reference the tokens everywhere, so a new component picks a step instead of a number.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    const values = new Set();
    // `[^;}]+` stops at the closing brace too: minified rules omit the final
    // semicolon, and without it the captured value runs into the next selector.
    for (const match of text.matchAll(/border-radius\s*:\s*([^;}]+)/g)) {
      const value = match[1].trim();
      // A `var(--radius-…)` reference is on the scale by construction: the scale
      // is the token declaration. `50%` is a shape (circle), not a corner.
      // Count the lengths, not the shorthand strings: `0 0 8px 8px` and
      // `8px 44% 8px 44%` are one decision each. A percentage is a shape (blob,
      // circle, arch), never a corner step, so it is not part of the scale.
      for (const part of value.split(/\s+/)) {
        if (part === '0' || part.includes('%') || /^var\(--radius/.test(part)) continue;
        if (/^[\d.]+(px|rem|em)$/.test(part)) values.add(part);
      }
    }
    if (values.size <= 5) return [];
    const index = text.search(/border-radius\s*:/);
    return [
      finding(radiusOffScale, file, text, Math.max(index, 0), {
        detail: `${values.size} values: ${[...values].slice(0, 8).join(', ')}`,
      }),
    ];
  },
};

/** Rule 20 — navigation with no current-page state. */
const navMissingCurrent = {
  id: 'nav-missing-current',
  pattern: 'P29',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Navigation renders no current-page state',
  why:
    'Every item looks identical, so the user cannot tell which section they are in, and screen-reader users get no `aria-current`.',
  fix: 'Mark the active item with `aria-current="page"` and a visual treatment that is not colour alone (weight or an indicator bar).',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    if (!/<nav\b/.test(text)) return [];
    if (/aria-current/.test(text)) return [];
    // React Router's NavLink sets aria-current="page" itself when active, and a
    // project that wraps it (CurrentNavLink, ActiveLink) moves the marking one
    // level out. Both are the component owning the state, not the page losing it.
    if (/\b(NavLink|CurrentNavLink|ActiveLink)\b/.test(text)) return [];
    if (!/NAV\.map|routes\.map|items\.map|\.map\(\(?\s*item/.test(text)) return [];
    return [finding(navMissingCurrent, file, text, text.search(/<nav\b/))];
  },
};


/** Rule 21 — an image with no alternative text. */
const imageWithoutAlt = {
  id: 'image-without-alt',
  pattern: 'P15',
  severity: 'P1',
  confidence: 'high',
  aggregate: 'file',
  title: 'Image has no alternative text',
  why:
    'WCAG 1.1.1. A decorative image needs `alt=""` (explicitly empty); a meaningful one needs a description. An omitted attribute is neither, and some readers announce the file name instead.',
  fix: 'Add `alt` — a description for content, `alt=""` plus `aria-hidden` if it is decoration.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<img\b[^>]*>/g)) {
      if (/\balt\s*=/.test(match[0])) continue;
      out.push(finding(imageWithoutAlt, file, text, match.index, { detail: match[0].slice(0, 100) }));
    }
    return out;
  },
};

/** Rule 22 — a link that goes nowhere. */
const placeholderLink = {
  id: 'placeholder-link',
  pattern: 'P51',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Link points at the current page instead of a destination',
  why:
    '`href="#"` scrolls to the top and looks like navigation. If a destination is not configured, the link should not be rendered at all.',
  fix: 'Render the real URL, or omit the element and show plain text when the destination is unset. Never leave `#`.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/href=("|')#\1|href=\{["'`]#["'`]\}/g)) {
      out.push(finding(placeholderLink, file, text, match.index));
    }
    return out;
  },
};

/** Rule 23 — an error that is caught and discarded. */
const swallowedError = {
  id: 'swallowed-error',
  pattern: 'P23',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Caught error is discarded, so the user sees nothing',
  why:
    'The request failed, the spinner stopped, and the screen is unchanged. The user cannot tell whether the action worked, so they try again — which is how duplicate records are made.',
  fix: 'Set an error state and render it next to the action, with a retry. If the failure is genuinely ignorable, say why in a comment.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    // Comments are stripped from `text` before rules run, so an empty-looking catch
    // may in fact be an explained one. Look at the raw source to tell them apart.
    const raw = file.raw ?? text;
    for (const match of text.matchAll(/catch\s*(\([^)]*\))?\s*\{\s*\}/g)) {
      const original = raw.slice(match.index, match.index + 240);
      if (/catch[^{]*\{[^}]*\/\//.test(original) || /catch[^{]*\{[^}]*\/\*/.test(original)) continue;
      out.push(finding(swallowedError, file, text, match.index));
    }
    for (const match of text.matchAll(/\.catch\(\s*\(?\s*\)?\s*=>\s*\{\s*\}\s*\)/g)) {
      out.push(finding(swallowedError, file, text, match.index));
    }
    return out;
  },
};

/** Rule 24 — a button inside a form that will submit it by accident. */
const accidentalSubmit = {
  id: 'accidental-submit',
  pattern: 'P51',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Button inside a form has no `type`, so it submits',
  why:
    'A `<button>` defaults to `type="submit"`. A “cancel” or “add row” button without an explicit type submits the form, and the failure looks like the form fired twice.',
  fix: 'Give every non-submit button `type="button"` and the real submit `type="submit"`.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/<button\b[^>]*>/g)) {
      const element = match[0];
      if (/\btype=/.test(element)) continue;
      // The default *is* correct for the submit button, so the defect is narrower:
      // a button with its own click handler, inside a form that also has a submit
      // handler. That click runs the handler and then submits the form.
      if (!/onClick=/.test(element)) continue;
      const formStart = text.lastIndexOf('<form', match.index);
      if (formStart === -1 || formStart > match.index) continue;
      // The button must still be inside that form: a `</form>` between the opening
      // tag and this button means it belongs to something else further down the file.
      if (text.indexOf('</form>', formStart) !== -1 && text.indexOf('</form>', formStart) < match.index) continue;
      const openTag = text.slice(formStart, text.indexOf('>', formStart) + 1);
      if (!/onSubmit=/.test(openTag)) continue;
      out.push(finding(accidentalSubmit, file, text, match.index, { detail: element.slice(0, 90) }));
    }
    return out;
  },
};

/** Rule 25 — a new tab opened without `rel="noopener"`. */
const targetBlank = {
  id: 'target-blank-noopener',
  pattern: 'P17',
  severity: 'P3',
  confidence: 'high',
  aggregate: 'file',
  title: 'Link opens a new tab without `rel="noreferrer"`',
  why:
    'Without `noopener` the destination gets a reference back to this page. Modern browsers imply it for `target="_blank"`, but the explicit attribute is what protects older ones and makes the intent visible.',
  fix: 'Add `rel="noopener noreferrer"` to every `target="_blank"` link.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/g)) {
      if (/rel=/.test(match[0])) continue;
      out.push(finding(targetBlank, file, text, match.index, { detail: match[0].slice(0, 90) }));
    }
    return out;
  },
};

/** Rule 26 — a control that is sized below the 24px minimum target. */
const smallTarget = {
  id: 'small-target',
  pattern: 'P42',
  severity: 'P3',
  confidence: 'low',
  aggregate: 'file',
  title: 'Icon-only control likely below the 24×24px minimum target',
  why:
    'WCAG 2.2 2.5.8 requires a 24×24 CSS pixel target (or enough spacing). Icon buttons with no padding fail it, and they are the hardest to hit on a phone.',
  fix: 'Add padding so the hit area reaches 24×24 (44×44 is the comfortable size), or space neighbouring controls by 8px+.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/<button\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\})[^>]*>\s*<[A-Za-z][^>]*\/>\s*<\/button>/g)) {
      const classList = match[1] ?? match[2] ?? '';
      if (/\b(p-1|p-2|p-3|px-2|px-3|w-6|w-7|h-6|h-7|w-8|h-8|size-)/.test(classList)) continue;
      out.push(finding(smallTarget, file, text, match.index, { detail: classList.slice(0, 80) }));
    }
    return out;
  },
};

/** Rule 27 — a container wider than a small phone that cannot shrink. */
const fixedWidthContainer = {
  id: 'fixed-width-container',
  pattern: 'P66',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Fixed width wider than a 320px viewport',
  why:
    'A hard pixel width cannot shrink. At 320px — a small phone, or any phone at 200% zoom — the container forces horizontal scrolling and pushes content off screen.',
  fix: 'Use a fluid width (`width: min(520px, 100%)`, `w-full max-w-[520px]`) and let the parent wrap.',
  check(file, text) {
    const out = [];
    if (is(file, 'css')) {
      for (const match of text.matchAll(/(?:^|[;{\s])(?:min-)?width\s*:\s*(\d{3,})px/g)) {
        const value = Number(match[1]);
        if (value < 360) continue;
        // Inside `@media (min-width: …)` a fixed width is a deliberate desktop rule.
        const media = text.lastIndexOf('@media', match.index);
        const close = text.lastIndexOf('}', match.index);
        if (media > close && /min-width/.test(text.slice(media, match.index))) continue;
        out.push(finding(fixedWidthContainer, file, text, match.index, { detail: `${value}px` }));
      }
    }
    if (is(file, 'jsx')) {
      for (const match of text.matchAll(/\b(?:min-)?w-\[(\d{3,})px\]/g)) {
        const value = Number(match[1]);
        if (value < 360) continue;
        if (/w-full|max-w-/.test(text.slice(Math.max(0, match.index - 80), match.index + 120))) continue;
        out.push(finding(fixedWidthContainer, file, text, match.index, { detail: `${value}px` }));
      }
    }
    return out;
  },
};

export const RULES = [
  focusRingRemoved,
  noFocusStyle,
  disabledWithoutReason,
  disabledContrast,
  textContrast,
  placeholderContrast,
  unlabelledInput,
  nativeConfirm,
  nativeAlert,
  bareLoading,
  noReducedMotion,
  animateHeightAuto,
  zIndexArmsRace,
  tableSemantics,
  numericCells,
  paginationNotInUrl,
  hoverOnlyAction,
  rawColourInClass,
  radiusOffScale,
  navMissingCurrent,
  imageWithoutAlt,
  placeholderLink,
  swallowedError,
  accidentalSubmit,
  targetBlank,
  smallTarget,
  fixedWidthContainer,
];

export { NON_TEXT_RATIO, SMALL_TEXT_RATIO, LARGE_TEXT_RATIO, contrast, blend };
