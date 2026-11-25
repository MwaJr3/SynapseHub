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

/**
 * Where does the JSX/HTML tag that starts at `index` end?
 *
 * A naive `/<input[^>]*>/` stops at the first `>` — and inside
 * `onChange={(event) => setValue(event.target.value)}` the first `>` is the arrow
 * function, not the end of the tag. The truncated fragment then has no
 * `aria-label` in it, so an accessible input is reported as an unlabelled one.
 * That is a false positive, and a false positive in an accessibility audit costs
 * more than a miss: it teaches the reader to disbelieve the tool.
 *
 * Returns the index of the closing `>`, or -1.
 */
function tagEnd(text, index) {
  let quote = null;
  let depth = 0;
  for (let i = index; i < text.length; i += 1) {
    const character = text[i];
    if (quote) {
      if (character === '\\') { i += 1; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '{') { depth += 1; continue; }
    if (character === '}') { depth = Math.max(0, depth - 1); continue; }
    if (character === '>' && depth === 0 && text[i - 1] !== '=') return i;
  }
  return -1;
}

/** Every opening tag named `name`, with its real extent. */
function tags(text, name) {
  const out = [];
  for (const match of text.matchAll(new RegExp(`<${name}\\b`, 'g'))) {
    const end = tagEnd(text, match.index);
    if (end === -1) continue;
    out.push({ index: match.index, element: text.slice(match.index, end + 1) });
  }
  return out;
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
    for (const match of tags(text, 'button')) {
      const element = match.element;
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
  pattern: 'X05',
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
    for (const match of tags(text, 'input')) {
      const element = match.element;
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
  pattern: 'P11',
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
  pattern: 'P28',
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
  pattern: 'P09',
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
      // A formatted date or time is text that happens to contain digits, not a number to compare.
      if (/new Date\(|formatDate|formatTime|formatTimestamp|toLocale(?:Date|Time)String|\bdate\b|\btime(?:stamp)?\b/i.test(body)) continue;
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
    if (!/useState[^\n]*(?<![-\w."'])\bpage\b(?![-\w"'])|setPage\b/.test(text)) return [];
    // The page number has to come from the address bar somehow. Either the file
    // reads the URL itself (search params, a hash router), or it calls the
    // repository's `usePageParam` hook, whose job is exactly that — the hook reads
    // `useSearchParams` and writes `?page=`. Anything else means the number is
    // living in component state and will be lost on reload.
    if (/useSearchParams|URLSearchParams|location\.hash|location\.search|pageFromHash|history\.(?:push|replace)State|\busePageParam\b/.test(text)) {
      return [];
    }
    const index = text.search(/useState[^\n]*(?<![-\w."'])\bpage\b(?![-\w"'])|setPage\b/);
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
      // "Hover-*only*" is the claim, so the rule has to look for the escapes before
      // it reports: an element hidden at rest is fine when it is also revealed by
      // keyboard (`:focus-within`) and pinned visible where there is no hover
      // (`@media (hover: none)`). A window of neighbouring characters cannot tell
      // those apart, so the selector is read and the escapes are searched for.
      for (const match of text.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
        const selector = match[1].trim();
        if (!/opacity\s*:\s*0\s*;/.test(match[2])) continue;
        const className = /\.([a-z0-9-]+)/i.exec(selector)?.[1];
        if (!className) continue;
        const escaped = (character) => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const name = escaped(className);
        const revealedByHover = new RegExp(`:hover[^{}]*\\.${name}|\\.${name}[^{}]*:hover`).test(text);
        const revealedByFocus = new RegExp(`:focus(-within)?[^{}]*\\.${name}|\\.${name}[^{}]*:focus`).test(text);
        const pinnedOnTouch = new RegExp(`@media\\s*\\(hover:\\s*none\\)[\\s\\S]{0,300}\\.${name}`).test(text);
        if (!revealedByHover && !/:hover/.test(selector)) continue;
        if (revealedByFocus && pinnedOnTouch) continue;
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
    // In-page tab/segmented controls that expose their state another way (aria-pressed,
    // aria-selected, role=tab) already tell assistive tech which one is active.
    if (/aria-pressed|aria-selected|role\s*=\s*["']tab["']/.test(text)) return [];
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
  pattern: 'X01',
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
  pattern: 'X02',
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
      // Same escape as an empty `catch {}`: a failure that is genuinely ignorable is
      // allowed to say so in a comment. The comment is the review artefact.
      const original = raw.slice(match.index, match.index + 240);
      if (/\/\/[^\n]*\}|\/\*[\s\S]{0,200}?\*\//.test(original)) continue;
      out.push(finding(swallowedError, file, text, match.index));
    }
    return out;
  },
};

/** Rule 24 — a button inside a form that will submit it by accident. */
const accidentalSubmit = {
  id: 'accidental-submit',
  pattern: 'X05',
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
  pattern: 'X02',
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
  pattern: 'X03',
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
      // A class the project's own stylesheet gives padding or a size is not "unpadded".
      if (file.sizedClasses && classList.split(/\s+/).some((name) => file.sizedClasses.has(name))) continue;
      if (/\b(p-1|p-2|p-3|px-2|px-3|w-6|w-7|h-6|h-7|w-8|h-8|size-)/.test(classList)) continue;
      out.push(finding(smallTarget, file, text, match.index, { detail: classList.slice(0, 80) }));
    }
    return out;
  },
};

/** Rule 27 — a container wider than a small phone that cannot shrink. */
const fixedWidthContainer = {
  id: 'fixed-width-container',
  pattern: 'X09',
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

/** Rule 28 — a positive tabindex that reorders the page's focus sequence. */
const tabindexPositive = {
  id: 'tabindex-positive',
  pattern: 'P46',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Positive tabindex overrides the natural focus order',
  why:
    'WCAG 2.4.3. A `tabindex` above 0 jumps the element ahead of everything in DOM order, so Tab moves around the page unpredictably — and every later element added to the page has to be numbered around it.',
  fix: 'Use `tabindex="0"` to make an element focusable in its natural place, `-1` for programmatic focus only, and fix the DOM order instead of numbering it.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/\btab[iI]ndex\s*=\s*(?:\{\s*)?["']?\s*([1-9]\d*)\b/g)) {
      out.push(finding(tabindexPositive, file, text, match.index, { detail: `tabindex=${match[1]}` }));
    }
    return out;
  },
};

/** Rule 29 — an image with no declared size, which lets the layout jump when it loads. */
const imageWithoutDimensions = {
  id: 'image-without-dimensions',
  pattern: 'X01',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Image declares no width and height, so the layout can shift when it loads',
  why:
    'Without dimensions the browser reserves no space, then pushes the content below the image down when it arrives (layout shift). The reader loses their place, and a tap can land on whatever moved under it.',
  fix: 'Add `width` and `height` attributes (the browser derives the aspect ratio from them), or give the image a sized container or an `aspect-ratio`.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of tags(text, 'img')) {
      if (/\bwidth\s*=/.test(element) && /\bheight\s*=/.test(element)) continue;
      // A sized Tailwind box, an aspect ratio or an inline size reserves the space too.
      if (/\bsize-/.test(element)) continue;
      if (/\bw-[^\s"'`}]+/.test(element) && /\bh-[^\s"'`}]+/.test(element)) continue;
      if (/\baspect-|aspect-?ratio/i.test(element)) continue;
      if (/\bstyle\s*=/.test(element) && /width/.test(element) && /height/.test(element)) continue;
      out.push(finding(imageWithoutDimensions, file, text, index, { detail: (element.match(/src\s*=\s*(?:"[^"]*"|'[^']*'|\{[^}]*\})/) ?? [element.slice(0, 60)])[0] }));
    }
    return out;
  },
};

/**
 * Rule 30 — a plain text input whose own name says it is an email, phone or URL.
 * Only the field's name, id and autocomplete are read: a placeholder that says
 * "Search by email" is not a declaration of what the field holds.
 */
const inputTypeGeneric = {
  id: 'input-type-generic',
  pattern: 'X05',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Input is a plain text field although its name says email, phone or URL',
  why:
    'The input type chooses the mobile keyboard and the browser\'s built-in validation. A plain text field makes people hunt for the @ or the digits, and skips format checking that costs nothing.',
  fix: 'Use `type="email"`, `type="tel"` or `type="url"` (and the matching `autocomplete`), keeping the label and server-side validation as they are.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of tags(text, 'input')) {
      const type = element.match(/\btype\s*=\s*(?:"([^"]*)"|'([^']*)')/);
      if (/\btype\s*=\s*\{/.test(element)) continue; // dynamic type — cannot be judged from source
      const declared = type ? (type[1] ?? type[2]).toLowerCase() : 'text';
      if (declared !== 'text') continue;
      if (/\binput[mM]ode\s*=/.test(element)) continue; // the keyboard was chosen another way
      const identity = [element.match(/\b(?:name|id|autoComplete|autocomplete)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{["'`]([^"'`]*)["'`]\})/g) ?? []]
        .flat()
        .join(' ');
      let kind = null;
      // `_` and digits are word characters, so \b would miss `contact_email`; these
      // patterns treat anything that is not a letter as a boundary instead.
      if (/e-?mail/i.test(identity)) kind = 'email';
      else if (/(?:^|[^a-z])(?:tel|mobile)(?:[^a-z]|$)|phone/i.test(identity)) kind = 'tel';
      else if (/(?:^|[^a-z])url(?:[^a-z]|$)|website/i.test(identity)) kind = 'url';
      if (!kind) continue;
      out.push(finding(inputTypeGeneric, file, text, index, { detail: `looks like type="${kind}"` }));
    }
    return out;
  },
};

/** Rule 31 — a click handler on an element that is not a control. */
const clickOnNonInteractive = {
  id: 'click-on-non-interactive',
  pattern: 'X13',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'line',
  title: 'Click handler on an element that cannot be reached or operated by keyboard',
  why:
    'A `<div onClick>` is not in the tab order, has no role, and does not respond to Enter or Space. Keyboard and screen-reader users cannot use it, and it is announced as plain text. (WCAG 2.1.1, 4.1.2)',
  fix: 'Use a real `<button>` (or `<a href>` for navigation). If the element must stay a `div`, it needs `role`, `tabIndex={0}` and an Enter/Space handler — which is a button with extra steps.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const name of ['div', 'span', 'li', 'td', 'p', 'section', 'article', 'img', 'h1', 'h2', 'h3']) {
      for (const { index, element } of tags(text, name)) {
        if (!/\bonClick\s*=/.test(element)) continue;
        if (/\brole\s*=/.test(element) || /\btab[iI]ndex\s*=/.test(element)) continue;
        if (/\bonKey(?:Down|Up|Press)\s*=/.test(element)) continue;
        if (/aria-hidden/.test(element)) continue;
        // Swallowing a click so it does not reach a parent is not an action.
        if (/onClick\s*=\s*\{[^}]*stopPropagation/.test(element)) continue;
        // A dimmed backdrop that dismisses on click is conventional when Escape also closes.
        if (/class(?:Name)?\s*=\s*[^>]*(?:backdrop|overlay|scrim)/i.test(element)) continue;
        out.push(finding(clickOnNonInteractive, file, text, index, { detail: `<${name} onClick>` }));
      }
    }
    return out;
  },
};

const attr = (element, name) => {
  const m = element.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\})`, 'i'));
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

/** Rule 32 — a one-time-code field that does not ask the platform to fill it. */
const otpAutocomplete = {
  id: 'otp-autocomplete',
  pattern: 'P60',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Verification-code field lacks autocomplete="one-time-code"',
  why:
    'Without `autocomplete="one-time-code"` the phone cannot offer the code from the SMS or authenticator it just received, so the person switches apps, memorises six digits and types them — the step where most sign-ins are abandoned.',
  fix: 'Add `autocomplete="one-time-code"` and `inputMode="numeric"` to the field (or to the first box of a split input), and let paste fill every box.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of tags(text, 'input')) {
      const identity = ['name', 'id', 'aria-label', 'placeholder', 'autocomplete']
        .map((n) => attr(element, n) ?? '').join(' ');
      if (!/(?:^|[^a-z])(?:otp|2fa|mfa|totp)(?:[^a-z]|$)|verification[\s_-]?code|security[\s_-]?code|one[\s_-]?time|passcode|sms[\s_-]?code/i.test(identity)) continue;
      if (/one-time-code/i.test(element)) continue;
      out.push(finding(otpAutocomplete, file, text, index, { detail: `<input ${(attr(element, 'name') ?? attr(element, 'id') ?? 'code')}> has no autocomplete="one-time-code"` }));
    }
    return out;
  },
};

/** Rule 33 — a password field that tells the password manager nothing. */
const passwordAutocomplete = {
  id: 'password-autocomplete',
  pattern: 'P57',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Password field has no autocomplete hint',
  why:
    'Without `autocomplete="current-password"` or `"new-password"` password managers guess — they offer to save the wrong thing, fail to fill, or never suggest a strong password on sign-up.',
  fix: 'Use `autocomplete="current-password"` on sign-in and `"new-password"` on sign-up and change-password, and do not block paste.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of tags(text, 'input')) {
      if (!/\btype\s*=\s*(?:\{\s*)?["']password["']/i.test(element)) continue;
      if (/\bautoComplete\s*=|\bautocomplete\s*=|\{\s*\.\.\./i.test(element)) continue;
      out.push(finding(passwordAutocomplete, file, text, index, { detail: '<input type="password"> with no autocomplete' }));
    }
    return out;
  },
};

/** Rule 34 — `transition: all`, which animates properties nobody meant to animate. */
const transitionAll = {
  id: 'transition-all',
  pattern: 'P09',
  severity: 'P3',
  confidence: 'high',
  aggregate: 'file',
  title: '`transition: all` animates properties nobody chose',
  why:
    'It also animates layout properties (width, height, margin), forcing layout on every frame, and it turns a later change to any property — a colour token, a theme switch — into an unintended animation.',
  fix: 'List the properties: `transition: opacity 150ms ease-out, transform 150ms ease-out`. In Tailwind use `transition-colors`, `transition-opacity` or `transition-transform` instead of `transition-all`.',
  check(file, text) {
    if (!is(file, 'css', 'jsx', 'html')) return [];
    const out = [];
    const pattern = is(file, 'css')
      ? /\btransition(?:-property)?\s*:\s*all\b/g
      : /\btransition(?:-property)?\s*:\s*['"]?all\b|\btransition-all\b/g;
    for (const match of text.matchAll(pattern)) {
      out.push(finding(transitionAll, file, text, match.index, { detail: match[0] }));
    }
    return out;
  },
};

/** Rule 35 — linear easing on a transition, which reads as mechanical. */
const linearEasing = {
  id: 'linear-easing',
  pattern: 'P21',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'UI transition uses `linear` easing',
  why:
    'Nothing physical moves at constant speed. A linear transition starts and stops abruptly and feels mechanical; entrances should decelerate (ease-out) and exits accelerate (ease-in).',
  fix: 'Use an ease-out curve for entrances (`cubic-bezier(0.16, 1, 0.3, 1)` or `ease-out`) and ease-in for exits. Keep `linear` for progress bars, spinners and looping animations only.',
  check(file, text) {
    if (!is(file, 'css', 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/\btransition(?:-timing-function)?\s*:\s*[^;}\n]*\blinear\b/g)) {
      out.push(finding(linearEasing, file, text, match.index, { detail: match[0].trim() }));
    }
    for (const match of text.matchAll(/\bease-linear\b/g)) {
      const around = text.slice(Math.max(0, match.index - 80), match.index + 40);
      if (/\btransition|duration-/.test(around)) out.push(finding(linearEasing, file, text, match.index, { detail: 'ease-linear' }));
    }
    return out;
  },
};

/** Rule 36 — an accordion with no expanded state exposed. */
const accordionWithoutExpanded = {
  id: 'accordion-without-expanded',
  pattern: 'P62',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Accordion toggles content but never exposes its expanded state',
  why:
    'A screen reader announces a plain button with no sign that it opens or closes anything, or whether it is open now. The trigger needs `aria-expanded`; a native `<details>` provides this for free.',
  fix: 'Use `<details>/<summary>`, or give the trigger `aria-expanded={open}` and `aria-controls` pointing at the panel.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const match = /\b(?:accordion|collapsible|disclosure)\b/i.exec(text);
    if (!match) return [];
    if (/aria-expanded|<details\b|<summary\b|<Accordion\b|<Collapsible\b|<Disclosure\b/.test(text)) return [];
    if (!/<button\b|onClick/.test(text)) return [];
    return [finding(accordionWithoutExpanded, file, text, match.index, { detail: `"${match[0]}" but no aria-expanded or <details> in this file` })];
  },
};

/** Rule 37 — `:invalid` styled on load, so the field is red before anyone has typed. */
const invalidOnLoad = {
  id: 'invalid-on-load',
  pattern: 'P24',
  severity: 'P3',
  confidence: 'high',
  aggregate: 'file',
  title: 'Field styled with `:invalid`, which fires before the person has typed',
  why:
    'An empty required field matches `:invalid` the moment the page loads, so the form opens covered in red. `:user-invalid` waits until the person has interacted with the field.',
  fix: 'Use `:user-invalid` (with a `.touched`/`[data-touched]` fallback for older browsers), or validate on blur.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    const out = [];
    for (const match of text.matchAll(/:invalid\b(?!-)/g)) {
      const before = text.slice(Math.max(0, match.index - 12), match.index);
      if (/user-$/.test(before)) continue;
      const rest = text.slice(match.index, match.index + 200);
      if (!/\{/.test(rest)) continue;
      out.push(finding(invalidOnLoad, file, text, match.index, { detail: snippetAt(text, match.index, 80) }));
    }
    return out;
  },
};

/** Rule 38 — a switch that never says whether it is on. */
const switchWithoutChecked = {
  id: 'switch-without-checked',
  pattern: 'P41',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Toggle switch does not expose its on/off state',
  why:
    'A `role="switch"` without `aria-checked` is announced as a bare "switch" — a screen-reader user cannot tell whether the setting is on. The colour of the rail is the only signal, and it is invisible to them.',
  fix: 'Add `aria-checked={on}` to every `role="switch"`, or use `<input type="checkbox" role="switch">`, which reports its own state.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<(?!input\b)[A-Za-z][\w.]*\b[^>]*\brole\s*=\s*["']switch["']/g)) {
      const end = tagEnd(text, match.index);
      const element = text.slice(match.index, end === -1 ? match.index + 400 : end + 1);
      if (/aria-checked|\{\s*\.\.\./.test(element)) continue;
      out.push(finding(switchWithoutChecked, file, text, match.index, { detail: 'role="switch" with no aria-checked' }));
    }
    return out;
  },
};

/** Rule 39 — validating on every keystroke. */
const validateOnEveryKeystroke = {
  id: 'validate-on-every-keystroke',
  pattern: 'P50',
  severity: 'P3',
  confidence: 'high',
  aggregate: 'file',
  title: 'Form validates on every keystroke',
  why:
    '`mode: "onChange"` runs validation on each key press, so a person typing "alex" in an email field is told "invalid email" before they have finished. Errors should appear when they leave the field, then update live once shown.',
  fix: 'Use `mode: "onTouched"` (validate on blur, then on change) or `"onBlur"`; keep the submit-time check as the backstop.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    const out = [];
    for (const match of text.matchAll(/\b(?:mode|validateOn)\s*:\s*['"]onChange['"]|validateOnChange\s*[:=]\s*\{?\s*true/g)) {
      out.push(finding(validateOnEveryKeystroke, file, text, match.index, { detail: match[0] }));
    }
    return out;
  },
};

/** Rule 40 — a bar chart whose axis does not start at zero. */
const truncatedBarAxis = {
  id: 'truncated-bar-axis',
  pattern: 'P08',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Bar chart axis starts above zero',
  why:
    'Bar length encodes value, so a baseline above zero makes a 5% difference look like a 5× difference. This is the most common way a chart lies without containing a false number.',
  fix: 'Start the value axis of bar charts at 0. If the differences are too small to see, use a dot or line chart, or show the delta directly.',
  check(file, text) {
    if (!is(file, 'jsx')) return [];
    if (!/<BarChart\b|<Bar\b|type\s*:\s*['"]bar['"]/.test(text)) return [];
    const out = [];
    for (const match of text.matchAll(/\bdomain\s*=\s*\{\s*\[\s*(-?\d+(?:\.\d+)?)\s*,|\bbeginAtZero\s*:\s*false|\by\s*:\s*\{[^}]*\bmin\s*:\s*([1-9]\d*(?:\.\d+)?)/g)) {
      const start = match[1];
      if (start !== undefined && Number(start) <= 0) continue;
      out.push(finding(truncatedBarAxis, file, text, match.index, { detail: match[0].replace(/\s+/g, ' ') }));
    }
    return out;
  },
};

/** Rule 41 — a file input that accepts anything. */
const fileInputAccept = {
  id: 'file-input-accept',
  pattern: 'P56',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'File input has no `accept`, so the picker offers every file type',
  why:
    'Without `accept` the person can choose a file the app will reject, and only learns after the upload. Filtering the picker removes the error instead of reporting it.',
  fix: 'Add `accept="image/png,image/jpeg"` (or the real list) and still validate type and size on the server.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of tags(text, 'input')) {
      if (!/\btype\s*=\s*["']file["']/i.test(element)) continue;
      if (/\baccept\s*=|\{\s*\.\.\./.test(element)) continue;
      out.push(finding(fileInputAccept, file, text, index, { detail: '<input type="file"> with no accept' }));
    }
    return out;
  },
};

/** Rule 42 — an invalid field whose message is not tied to it. */
const invalidWithoutDescription = {
  id: 'invalid-without-description',
  pattern: 'P24',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: '`aria-invalid` set but the error message is not associated with the field',
  why:
    'Marking a field invalid tells a screen reader "something is wrong" but not what. Without `aria-describedby` pointing at the message, the person hears only "invalid entry" and must hunt for the text.',
  fix: 'Give the error message an `id` and add `aria-describedby="that-id"` to the input (and keep the message text, not just a red border, as the visible signal).',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of [...tags(text, 'input'), ...tags(text, 'textarea'), ...tags(text, 'select')]) {
      if (!/\baria-invalid\b/.test(element)) continue;
      if (/aria-describedby|aria-errormessage|\{\s*\.\.\./.test(element)) continue;
      out.push(finding(invalidWithoutDescription, file, text, index, { detail: 'aria-invalid without aria-describedby' }));
    }
    return out;
  },
};

/** Rule 43 — a progress bar with no value for assistive technology. */
const progressWithoutValue = {
  id: 'progress-without-value',
  pattern: 'P28',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Progress bar exposes no value',
  why:
    'A `role="progressbar"` with no `aria-valuenow` is announced as "progress bar" with nothing else — the person cannot tell 10% from 90%, so a long task looks stalled.',
  fix: 'Add `aria-valuenow`, `aria-valuemin` and `aria-valuemax`, or use a native `<progress value max>`. For unknown duration, omit `aria-valuenow` deliberately and add an `aria-label` describing the task.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<[A-Za-z][\w.]*\b[^>]*\brole\s*=\s*["']progressbar["']/g)) {
      const end = tagEnd(text, match.index);
      const element = text.slice(match.index, end === -1 ? match.index + 400 : end + 1);
      if (/aria-valuenow|\{\s*\.\.\./.test(element)) continue;
      out.push(finding(progressWithoutValue, file, text, match.index, { detail: 'role="progressbar" with no aria-valuenow' }));
    }
    return out;
  },
};

/** Rule 44 — pure black behind dark-mode surfaces. */
const darkPureBlack = {
  id: 'dark-pure-black',
  pattern: 'P73',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Dark theme uses pure black as a surface',
  why:
    'On #000 there is nowhere darker to go, so shadows and elevation vanish, and white text on pure black vibrates (halation). Dark themes read better on a very dark grey, with lighter greys for raised surfaces.',
  fix: 'Use a surface around #0f1115–#161b22 and step lighter for each elevation. Keep pure black for video players and true-OLED opt-ins only.',
  check(file, text) {
    if (!is(file, 'css', 'jsx', 'html')) return [];
    const out = [];
    if (!is(file, 'css')) {
      for (const match of text.matchAll(/\bdark:bg-(?:black|\[#0{3}(?:0{3})?\])(?![\w/-])/g)) {
        out.push(finding(darkPureBlack, file, text, match.index, { detail: match[0] }));
      }
      return out;
    }
    for (const block of text.matchAll(/(?:\.dark\b|\[data-theme=["']?dark["']?\]|prefers-color-scheme:\s*dark)[^{]*\{([\s\S]*?\})/g)) {
      const body = block[1];
      const hit = /(?:^|[;{\s])(?:background(?:-color)?|--(?:bg|background|surface)[\w-]*)\s*:\s*(?:#0{3}(?:0{3})?|black)\b/i.exec(body);
      if (hit) out.push(finding(darkPureBlack, file, text, block.index, { detail: hit[0].trim().replace(/^[;{\s]+/, '') }));
    }
    return out;
  },
};

/** Rule 45 — a field that refuses paste, which is what password managers do. */
const pasteBlocked = {
  id: 'paste-blocked',
  pattern: 'P57',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Password or code field blocks paste',
  why:
    'Password managers fill and paste. Blocking paste pushes people toward shorter, memorable, reused passwords — the opposite of the security the block was meant to buy.',
  fix: 'Delete the `onPaste` handler that calls `preventDefault()`. For split code boxes, handle paste by spreading the digits across the boxes instead.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const { index, element } of tags(text, 'input')) {
      const m = /\bonPaste\s*=\s*\{[^}]*preventDefault|\bonpaste\s*=\s*["'][^"']*(?:return\s+false|preventDefault)/i.exec(element);
      if (!m) continue;
      out.push(finding(pasteBlocked, file, text, index, { detail: 'onPaste calls preventDefault()' }));
    }
    return out;
  },
};

/** Rule 46 — z-index on a rule with no positioning, so it does nothing. */
const zindexWithoutPosition = {
  id: 'zindex-without-position',
  pattern: 'P44',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: '`z-index` on an element that is not positioned',
  why:
    'z-index only applies to positioned elements (and flex or grid children). On a static element the number is ignored, so the stacking bug it was meant to fix stays, and people raise the number instead of finding the cause.',
  fix: 'Add `position: relative` (or `isolation: isolate` to create a stacking context without positioning), or remove the z-index if the element is a flex/grid child that already stacks.',
  check(file, text) {
    if (!is(file, 'css')) return [];
    const out = [];
    // A class positioned by one rule and stacked by another (`.card {position:relative}`
    // + `.card:has(.open) {z-index:25}`) is fine: the number is applied to a positioned box.
    const positioned = new Set();
    for (const rule of text.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      if (!/(?:^|[;\s])position\s*:\s*(?:relative|absolute|fixed|sticky)/.test(rule[2])) continue;
      for (const m of rule[1].matchAll(/\.([A-Za-z_][\w-]*)/g)) positioned.add(m[1]);
    }
    for (const rule of text.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const body = rule[2];
      const subject = rule[1].replace(/:[a-z-]+\((?:[^()]|\([^()]*\))*\)/g, '');
      if ([...subject.matchAll(/\.([A-Za-z_][\w-]*)/g)].some((m) => positioned.has(m[1]))) continue;
      const z = /(?:^|[;\s])z-index\s*:\s*(-?\d+)/.exec(body);
      if (!z || Number(z[1]) === 0) continue;
      if (/(?:^|[;\s])position\s*:\s*(?:relative|absolute|fixed|sticky)/.test(body)) continue;
      if (/(?:^|[;\s])(?:display\s*:\s*(?:flex|grid|inline-flex|inline-grid)|isolation\s*:)/.test(body)) continue;
      const selector = rule[1].trim().split(/\s*,\s*/)[0];
      out.push(finding(zindexWithoutPosition, file, text, rule.index + rule[1].length - rule[1].trimStart().length, { detail: `${selector.slice(0, 60)} { z-index: ${z[1]} } with no position` }));
    }
    return out;
  },
};

const CLICHES = /\b(supercharge[sd]?|unleash(?:es|ed)?|elevate (?:your|the)|seamless(?:ly)?|revolutioni[sz]e[sd]?|game[- ]chang(?:er|ing)|next[- ]gen(?:eration)?|cutting[- ]edge|empower(?:s|ing)? (?:your|teams|everyone)|all-in-one platform|take (?:your \w+ )?to the next level|reimagine[sd]?)\b/i;

/** Rule 47 — adjectives where the outcome should be. */
const aiClicheCopy = {
  id: 'ai-cliche-copy',
  pattern: 'X14',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Headline leans on stock adjectives instead of stating the outcome',
  why:
    '"Supercharge your workflow", "seamless", "elevate", "all-in-one platform" describe nothing a visitor can check, and they are the first thing people read as machine-written. The headline is the one sentence every visitor reads; it should say what changes for whom.',
  fix: 'Rewrite as outcome + audience: "Close the month in one afternoon. Bookkeeping for small teams, without the spreadsheet." Keep the proof concrete (a name, a role, a number with a unit).',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)) {
      const hit = CLICHES.exec(match[1].replace(/<[^>]+>/g, ' '));
      if (hit) out.push(finding(aiClicheCopy, file, text, match.index, { detail: `heading uses "${hit[0]}"` }));
    }
    return out;
  },
};

const hexToHue = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
  if (d < 0.15 || max === 0 || d / max < 0.3) return null; // grey or washed-out: no meaningful hue
  let hue;
  if (max === r) hue = ((g - b) / d) % 6; else if (max === g) hue = (b - r) / d + 2; else hue = (r - g) / d + 4;
  return (hue * 60 + 360) % 360;
};

/** Rule 48 — a gradient between opposite hues. */
const gradientOpposedHues = {
  id: 'gradient-opposed-hues',
  pattern: 'X15',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Gradient runs between near-opposite hues',
  why:
    'Hues 120–180° apart (red→green, orange→blue) blend through a muddy grey-brown middle and vibrate at the edge. Neighbouring hues, about 60° apart, stay clean the whole way across.',
  fix: 'Keep the two stops within roughly 60–90° on the colour wheel (indigo→violet, teal→blue), or add a deliberate third stop. Use 135° for a natural diagonal light.',
  check(file, text) {
    if (!is(file, 'css', 'jsx', 'html')) return [];
    const out = [];
    for (const match of text.matchAll(/linear-gradient\(([^;{}]*?)\)(?=\s*[;,'"`}\n])/g)) {
      const stops = [...match[1].matchAll(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g)].map((m) => hexToHue(m[0]));
      const hues = stops.filter((h) => h !== null);
      if (hues.length < 2) continue;
      let worst = 0;
      for (let i = 0; i < hues.length; i++) for (let j = i + 1; j < hues.length; j++) {
        const diff = Math.abs(hues[i] - hues[j]); worst = Math.max(worst, Math.min(diff, 360 - diff));
      }
      if (worst >= 120) out.push(finding(gradientOpposedHues, file, text, match.index, { detail: `hues ${Math.round(worst)}° apart` }));
    }
    return out;
  },
};

/** Rule 50 — a button whose only content is an icon and which has no accessible name. */
const iconButtonUnnamed = {
  id: 'icon-button-unnamed',
  pattern: 'P66',
  severity: 'P1',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Icon-only button has no accessible name',
  why: 'A screen reader announces "button" and nothing else, and a voice-control user has nothing to say. An icon is not a label.',
  fix: 'Add `aria-label="Close"` (or visually hidden text) to the button, and keep a `title`/tooltip for sighted users.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    const re = /<button\b([^>]*)>\s*(<(?:svg|i|[A-Z][A-Za-z]*Icon|[A-Z][a-z]+)\b[^>]*?(?:\/>|>[\s\S]*?<\/(?:svg|i)>))\s*<\/button>/g;
    let m;
    while ((m = re.exec(text))) {
      const attrs = m[1];
      if (/aria-label|aria-labelledby|\btitle\s*=/.test(attrs)) continue;
      if (/sr-only|visually-hidden/.test(m[0])) continue;
      out.push(finding(iconButtonUnnamed, file, text, m.index, { detail: 'button contains only an icon' }));
    }
    return out;
  },
};

/** Rule 51 — a toast container that is not a live region. */
const toastNoLiveRegion = {
  id: 'toast-no-live-region',
  pattern: 'P40',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Toast is not announced to screen readers',
  why: 'A toast that appears and vanishes is invisible to a screen reader unless its container is a live region. The person never learns the action worked or failed.',
  fix: 'Give the toast container `role="status"` (or `role="alert"` for errors) and `aria-live`, and keep it mounted so the update is announced.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    const out = [];
    const re = /<(div|section|ul|ol|aside)\b([^>]*(?:className|class)\s*=\s*["'{`][^>]*\btoasts?\b[^>]*)>/gi;
    let m;
    while ((m = re.exec(text))) {
      if (/role\s*=|aria-live/.test(m[2])) continue;
      out.push(finding(toastNoLiveRegion, file, text, m.index, { detail: 'toast container without role or aria-live' }));
    }
    return out;
  },
};

/** Rule 52 — draggable elements with no keyboard path. */
const draggableNoKeyboard = {
  id: 'draggable-no-keyboard',
  pattern: 'P19',
  severity: 'P2',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Drag-and-drop has no keyboard alternative',
  why: 'Dragging needs a pointer. Keyboard and switch users cannot reorder or move the item at all, and WCAG 2.5.7 requires a single-pointer alternative.',
  fix: 'Add move up/down buttons or an arrow-key handler (`onKeyDown`) alongside `draggable`, and announce the new position.',
  check(file, text) {
    if (!is(file, 'jsx', 'html')) return [];
    if (/onKeyDown|keydown|aria-grabbed|Move (?:up|down|to)|aria-label=["'][^"']*move/i.test(text)) return [];
    const out = [];
    const m = /\bdraggable(?:\s*=\s*(?:\{true\}|["']true["']))?(?=[\s>/])/.exec(text);
    if (m) out.push(finding(draggableNoKeyboard, file, text, m.index, { detail: 'draggable with no key handler in the file' }));
    return out;
  },
};

/** Rule 53 — an app shell (index.html) with no meta description. */
const metaDescriptionMissing = {
  id: 'meta-description-missing',
  pattern: 'X16',
  severity: 'P2',
  confidence: 'high',
  aggregate: 'file',
  title: 'Page has no meta description',
  why: 'Search results and link previews fall back to whatever text the crawler guesses at. A single-page app shell has no content for it to guess from.',
  fix: 'Add `<meta name="description" content="…">` with one honest sentence of what the product does, under about 160 characters.',
  check(file, text) {
    if (!/index\.html$/.test(file.relPath) || !/<html[\s>]/i.test(text) || !/<head[\s>]/i.test(text)) return [];
    if (/<meta[^>]+name\s*=\s*["']description["']/i.test(text)) return [];
    return [finding(metaDescriptionMissing, file, text, text.search(/<head[\s>]/i), { detail: 'no <meta name="description">' })];
  },
};

/** Rule 54 — an app shell with a description but no Open Graph preview tags. */
const ogMetadataMissing = {
  id: 'og-metadata-missing',
  pattern: 'X16',
  severity: 'P3',
  confidence: 'medium',
  aggregate: 'file',
  title: 'Link previews have no Open Graph title or description',
  why: 'Shared links render as a bare URL in chat apps and social feeds unless og:title and og:description are present.',
  fix: 'Add `<meta property="og:title">` and `<meta property="og:description">` (and an `og:image` when there is a real one).',
  check(file, text) {
    if (!/index\.html$/.test(file.relPath) || !/<head[\s>]/i.test(text)) return [];
    if (/property\s*=\s*["']og:title["']/i.test(text) && /property\s*=\s*["']og:description["']/i.test(text)) return [];
    return [finding(ogMetadataMissing, file, text, text.search(/<head[\s>]/i), { detail: 'og:title / og:description missing' })];
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
  tabindexPositive,
  imageWithoutDimensions,
  inputTypeGeneric,
  clickOnNonInteractive,
  otpAutocomplete,
  passwordAutocomplete,
  transitionAll,
  linearEasing,
  accordionWithoutExpanded,
  invalidOnLoad,
  switchWithoutChecked,
  validateOnEveryKeystroke,
  truncatedBarAxis,
  fileInputAccept,
  invalidWithoutDescription,
  progressWithoutValue,
  darkPureBlack,
  pasteBlocked,
  zindexWithoutPosition,
  aiClicheCopy,
  gradientOpposedHues,
  iconButtonUnnamed,
  toastNoLiveRegion,
  draggableNoKeyboard,
  metaDescriptionMissing,
  ogMetadataMissing,
];

export { NON_TEXT_RATIO, SMALL_TEXT_RATIO, LARGE_TEXT_RATIO, contrast, blend };
