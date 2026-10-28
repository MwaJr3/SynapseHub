/**
 * Static UX detectors — pure, deterministic source analysis.
 *
 * Each detector reads a single file and returns findings that carry the same
 * rule IDs the interactive auditor uses, so the evidence chain (finding →
 * rule → pattern) is identical for scanned code and hand-written descriptors.
 * Confidence is honest: mechanical facts are high, structural heuristics are
 * medium or low and say so in their evidence.
 */
import { checkContrast, isOnSpacingScale } from '../constraints';
import type { DetectorContext, ScanFinding } from './types';
import { buildScanFinding } from './builder';

type Detector = (context: DetectorContext) => ScanFinding[];

const HEX = '#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\\b';

// Tailwind spacing scale in pixels (h-8 → 32px, size-11 → 44px, …).
function tailwindPx(token: string): number | null {
  const arbitrary = token.match(
    /^(?:min-)?(?:h|w|size)-\[(\d+(?:\.\d+)?)px\]$/,
  );
  if (arbitrary) return Number(arbitrary[1]);
  const scaled = token.match(/^(?:min-)?(?:h|w|size)-(\d+)$/);
  if (scaled) return Number(scaled[1]) * 4;
  return null;
}

// ---------------------------------------------------------------------------
// A11Y-FOCUS-01 — outline removal without a visible replacement
// ---------------------------------------------------------------------------

const detectFocusRemoval: Detector = ({ filePath, source, lines }) => {
  const findings: ScanFinding[] = [];
  // A bare ':focus-visible { … }' rule is a global replacement that covers
  // every element in the stylesheet, including rules that reset outline.
  const globalFocusVisible = /(?:^|[},])\s*:focus-visible\s*\{/.test(source);
  lines.forEach((line, index) => {
    if (!/outline-none|outline:\s*none|outline:\s*0\b/.test(line)) return;
    // A ring on the same rule is a valid replacement.
    if (/\bring\b|ring-2|ring-4|focus-visible/.test(line)) return;
    if (globalFocusVisible) return;
    const scopedFocusVisible = /:focus-visible|focus-visible:|focus:ring/.test(
      source,
    );
    findings.push(
      buildScanFinding({
        ruleId: 'A11Y-FOCUS-01',
        evidence: `Outline is removed without a ring or focus-visible replacement on the same rule${scopedFocusVisible ? ' (a scoped focus style exists elsewhere — verify it covers this selector)' : ''}.`,
        filePath,
        line: index + 1,
        snippet: line.trim(),
        confidence: scopedFocusVisible ? 'medium' : 'high',
      }),
    );
  });
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-TARGET-01 — interactive targets under 44px
// ---------------------------------------------------------------------------

const INTERACTIVE_TAG = /<(button|a)\b|role=["']button["']/;

const detectSmallTargets: Detector = ({ filePath, lines }) => {
  const findings: ScanFinding[] = [];
  lines.forEach((line, index) => {
    if (!INTERACTIVE_TAG.test(line)) return;
    const classes = line.match(/className=["'`]([^"'`]+)["'`]/)?.[1] ?? '';
    const tokens = classes.split(/\s+/);
    const dimensions = tokens
      .map(tailwindPx)
      .filter((value): value is number => value !== null);
    const inline = line.match(/style=\{\{[^}]*\}\}/)?.[0] ?? '';
    for (const match of inline.matchAll(
      /(?:minHeight|minWidth|height|width):\s*(\d+(?:\.\d+)?)px/g,
    )) {
      dimensions.push(Number(match[1]));
    }
    if (dimensions.length === 0) return;
    const smallest = Math.min(...dimensions);
    if (smallest < 44) {
      findings.push(
        buildScanFinding({
          ruleId: 'A11Y-TARGET-01',
          evidence: `Interactive element declares a ${smallest}px dimension, below the 44x44px minimum touch target (padding may enlarge it — verify the rendered box).`,
          filePath,
          line: index + 1,
          snippet: line.trim(),
          confidence: 'medium',
        }),
      );
    }
  });
  return findings;
};

// ---------------------------------------------------------------------------
// CSS rule-block variant of the touch-target and outline checks
// ---------------------------------------------------------------------------

interface CssRule {
  selector: string;
  body: string;
  headerLine: number;
}

/**
 * Blank out comments without moving a single character.
 *
 * Comments are prose, but the rule parser reads whatever sits before `{` as a
 * selector, so a sentence like "the bar reports what the learner did" can match the
 * bare `a` tag and hand a progress bar to the touch-target check. Replacing every
 * non-newline character keeps the file's line numbers intact for reporting.
 */
function withoutCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, ' '),
  );
}

function parseCssRules(source: string): CssRule[] {
  const rules: CssRule[] = [];
  const text = withoutCssComments(source);
  const regex = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(0, match.index);
    const headerLine = before.split('\n').length;
    rules.push({ selector: match[1]!.trim(), body: match[2]!, headerLine });
  }
  return rules;
}

const detectCssTargets: Detector = ({ filePath, source }) => {
  if (!filePath.endsWith('.css')) return [];
  const findings: ScanFinding[] = [];
  for (const rule of parseCssRules(source)) {
    if (
      !/(^|[\s,>])(button|a|input|select|textarea)([\s,:.[]|$)|\.btn|\.chip|\.icon-button/.test(
        rule.selector,
      )
    )
      continue;
    // Native checkboxes/radios keep a small visual glyph while the wrapping
    // label carries the 44px target; accent-color marks exactly that pattern.
    if (/\binput\b/.test(rule.selector) && /accent-color\s*:/.test(rule.body))
      continue;
    const heights = [
      ...rule.body.matchAll(/(?:min-height|height):\s*(\d+(?:\.\d+)?)px/g),
    ].map((m) => Number(m[1]));
    if (
      heights.length > 0 &&
      Math.min(...heights) < 44 &&
      !rule.body.includes('min-height: 44')
    ) {
      findings.push(
        buildScanFinding({
          ruleId: 'A11Y-TARGET-01',
          evidence: `CSS rule for "${rule.selector.split('\n').pop()}" sets an interactive height of ${Math.min(...heights)}px; touch targets need at least 44px.`,
          filePath,
          line: rule.headerLine,
          snippet: `${rule.selector} { ${rule.body.trim().slice(0, 120)} }`,
          confidence: 'medium',
        }),
      );
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// JSX tag-span parsing — line-based checks miss attributes on multiline tags.
// ---------------------------------------------------------------------------

interface TagSpan {
  tag: string;
  line: number;
  /** Full tag text including multiline attributes. */
  text: string;
  /** Source index immediately after the closing '>'. */
  end: number;
  selfClosing: boolean;
  isClose: boolean;
}

const VOID_TAGS = new Set(['input', 'br', 'img', 'hr', 'meta', 'link']);

/**
 * Replace comment contents with spaces (preserving length and newlines) so
 * JSX mentioned in JSDoc or commented-out markup is never parsed as real tags.
 */
function blankComments(source: string): string {
  let out = '';
  let quote: '' | "'" | '"' | '`' = '';
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]!;
    const next = source[i + 1];
    if (quote) {
      out += char;
      if (char === '\\' && next !== undefined) {
        out += next;
        i += 1;
        continue;
      }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      out += char;
      continue;
    }
    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') {
        out += ' ';
        i += 1;
      }
      if (i < source.length) out += '\n';
      continue;
    }
    if (char === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (
        i < source.length &&
        !(source[i] === '*' && source[i + 1] === '/')
      ) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      if (i < source.length) {
        // Land on the closing '/'; the for-loop increment moves past it so
        // the following character (often a newline) is still emitted.
        out += '  ';
        i += 1;
      }
      continue;
    }
    out += char;
  }
  return out;
}

function extractTags(source: string): TagSpan[] {
  const tags: TagSpan[] = [];
  const view = blankComments(source);
  const opener = /<(\/)?([A-Za-z][\w.-]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(view)) !== null) {
    const isClose = Boolean(match[1]);
    const tag = match[2]!;
    let i = opener.lastIndex;
    let depth = 0;
    let quote = '';
    // Walk to the closing '>' while respecting strings and brace
    // expressions, so '=>' inside handlers never terminates a tag.
    while (i < view.length) {
      const char = view[i]!;
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'" || char === '`') {
        quote = char;
      } else if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      } else if (char === '>' && depth === 0) {
        break;
      }
      i += 1;
    }
    const text = view.slice(match.index, i + 1);
    tags.push({
      tag,
      line: view.slice(0, match.index).split('\n').length,
      text,
      end: i + 1,
      isClose,
      selfClosing: text.trimEnd().endsWith('/>') || VOID_TAGS.has(tag),
    });
    opener.lastIndex = i + 1;
  }
  return tags;
}

const INPUT_TAGS = new Set(['input', 'select', 'textarea']);
const SKIPPED_INPUT_TYPES =
  /type=["'](?:hidden|submit|button|reset|checkbox|radio|file)["']/;

// ---------------------------------------------------------------------------
// FORM-LABEL-01 — inputs without a persistent label
// ---------------------------------------------------------------------------

/** Shape key for a template-literal id/htmlFor, e.g. `filter-${key}` → "filter-|". */
function templateShape(expression: string): string {
  const template = expression.match(/^[`'"]?([^`'"]*)\$\{[^}]+\}(.*)[`'"]?$/);
  if (!template) return expression;
  return `${template[1]}|${template[2]}`;
}

const detectUnlabelledInputs: Detector = ({ filePath, source }) => {
  const findings: ScanFinding[] = [];
  const htmlForIds = new Set(
    [...source.matchAll(/htmlFor=["']([^"']+)["']/g)].map((m) => m[1]),
  );
  const htmlForShapes = new Set(
    [...source.matchAll(/htmlFor=\{`([^`]+)`\}/g)].map((m) =>
      templateShape(m[1]!),
    ),
  );
  // Bare identifier associations: <label htmlFor={fieldId}> with id={fieldId}.
  const htmlForVars = new Set(
    [...source.matchAll(/htmlFor=\{(\w+)\}/g)].map((m) => m[1]),
  );

  // Open/close stack built from the brace-aware tag parser: a control is
  // known to sit inside a <label> or *Field wrapper regardless of line spans.
  const stack: TagSpan[] = [];
  for (const tag of extractTags(source)) {
    if (tag.isClose) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i]!.tag === tag.tag) {
          stack.splice(i, 1);
          break;
        }
      }
      continue;
    }
    if (INPUT_TAGS.has(tag.tag)) {
      const insideLabel = stack.some(
        (entry) => entry.tag === 'label' || entry.tag.endsWith('Field'),
      );
      const labelled =
        SKIPPED_INPUT_TYPES.test(tag.text) ||
        /className=["'][^"']*\bsr-only\b/.test(tag.text) ||
        /aria-label|aria-labelledby|title=/.test(tag.text) ||
        insideLabel;
      const staticId = tag.text.match(/\bid=["']([^"']+)["']/)?.[1];
      const templateId = tag.text.match(/\bid=\{`([^`]+)`\}/)?.[1];
      const variableId = tag.text.match(/\bid=\{(\w+)\}/)?.[1];
      const idLinked =
        (staticId !== undefined && htmlForIds.has(staticId)) ||
        (templateId !== undefined &&
          htmlForShapes.has(templateShape(templateId))) ||
        (variableId !== undefined && htmlForVars.has(variableId));
      if (!labelled && !idLinked) {
        findings.push(
          buildScanFinding({
            ruleId: 'FORM-LABEL-01',
            evidence:
              'Form control has no visible label, aria-label/aria-labelledby association or wrapping <label>.',
            filePath,
            line: tag.line,
            snippet: tag.text.replaceAll('\n', ' ').trim().slice(0, 160),
            confidence: 'high',
          }),
        );
      }
    }
    if (!tag.selfClosing) stack.push(tag);
  }
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-NAME-01 — icon-only interactive elements without an accessible name
// ---------------------------------------------------------------------------

const detectNamelessInteractive: Detector = ({ filePath, source }) => {
  const findings: ScanFinding[] = [];
  for (const tag of extractTags(source).filter(
    (candidate) => candidate.tag === 'button' && !candidate.isClose,
  )) {
    if (/aria-label|aria-labelledby|title=/.test(tag.text)) continue;
    const close = source.indexOf('</button>', tag.end);
    const inner = close >= 0 ? source.slice(tag.end, close) : '';
    const hasAltImage = /<img[^>]+alt=["'][^"']+["']/.test(inner);
    const hasExpression = /\{[^}]+\}/.test(inner.replace(/<[^>]+>/g, ' '));
    const visibleText = inner
      .replace(/<[^>]+>/g, ' ')
      .replace(/\{[^}]*\}/g, ' ')
      .trim();
    // A brace expression typically renders the label ({children}, {label},
    // a ternary of strings); only truly content-free icon buttons are flagged.
    if (visibleText.length === 0 && !hasAltImage && !hasExpression) {
      findings.push(
        buildScanFinding({
          ruleId: 'A11Y-NAME-01',
          evidence:
            'Button renders no visible text and carries no aria-label/aria-labelledby/title, labelled image or label expression.',
          filePath,
          line: tag.line,
          snippet: tag.text.replaceAll('\n', ' ').trim().slice(0, 160),
          confidence: 'medium',
        }),
      );
    }
  }
  return findings;
};

// ---------------------------------------------------------------------------
// TOKEN-ELEVATION-01 — z-index escalation beyond named layers
// ---------------------------------------------------------------------------

const detectZIndexEscalation: Detector = ({ filePath, source, lines }) => {
  const findings: ScanFinding[] = [];
  lines.forEach((line, index) => {
    const candidates = [
      ...line.matchAll(/z-\[(\d+)\]/g),
      ...line.matchAll(/z-index:\s*(\d+)/g),
    ];
    for (const candidate of candidates) {
      const value = Number(candidate[1]);
      if (value > 50) {
        findings.push(
          buildScanFinding({
            ruleId: 'TOKEN-ELEVATION-01',
            evidence: `z-index ${value} escalates past the named stacking layers (0–50); isolate the stacking context instead.`,
            filePath,
            line: index + 1,
            snippet: line.trim(),
          }),
        );
      }
    }
  });
  // Reference the source so the signature stays stable when callers pass it.
  void source;
  return findings;
};

// ---------------------------------------------------------------------------
// TOKEN-SPACING-01 — off-scale literal spacing
// ---------------------------------------------------------------------------

const SPACING_DECLARATION =
  /(?:^|[;{])\s*(padding|margin|gap)(?:-(?:block|inline|top|right|bottom|left|x|y))?\s*:\s*([^;}]+)/g;
const PX_VALUES = /(\d+(?:\.\d+)?)px/g;

function offScaleValues(values: Iterable<number>): number[] {
  // Values below 4px are optical/hairline adjustments (sr-only clips, mark
  // padding, segmented-control insets); the spacing-scale rule governs
  // structural rhythm, which starts at the 4px token.
  return [...new Set(values)].filter(
    (value) => value >= 4 && !isOnSpacingScale(value),
  );
}

const detectOffScaleSpacing: Detector = ({ filePath, lines, source }) => {
  const findings: ScanFinding[] = [];

  if (filePath.endsWith('.css')) {
    // Minified/bundled stylesheets (lines over 500 chars) are build-style
    // output: token linting them would be unactionable churn, and their
    // source tokens live elsewhere. The report states this limitation.
    if (lines.some((line) => line.length > 500)) return [];
    for (const rule of parseCssRules(source)) {
      const values = new Set<number>();
      for (const declaration of rule.body.matchAll(SPACING_DECLARATION)) {
        for (const px of declaration[2]!.matchAll(PX_VALUES))
          values.add(Number(px[1]));
      }
      const offScale = offScaleValues(values);
      if (offScale.length === 0) continue;
      findings.push(
        buildScanFinding({
          ruleId: 'TOKEN-SPACING-01',
          evidence: `Rule "${rule.selector.split('\n').pop()}" uses literal spacing ${offScale.join(', ')}px, off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64).`,
          filePath,
          line: rule.headerLine,
          snippet: `${rule.selector} { … }`.slice(0, 160),
          severity: 'minor',
          confidence: 'medium',
        }),
      );
    }
    return findings;
  }

  lines.forEach((line, index) => {
    const values = new Set<number>();
    for (const match of line.matchAll(
      /(?:p|m|gap|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr)-\[(\d+(?:\.\d+)?)px\]/g,
    )) {
      values.add(Number(match[1]));
    }
    for (const declaration of line.matchAll(SPACING_DECLARATION)) {
      for (const px of declaration[2]!.matchAll(PX_VALUES))
        values.add(Number(px[1]));
    }
    const offScale = offScaleValues(values);
    if (offScale.length === 0) return;
    findings.push(
      buildScanFinding({
        ruleId: 'TOKEN-SPACING-01',
        evidence: `Literal spacing ${offScale.join(', ')}px is off the 4px-base scale (4, 8, 12, 16, 24, 32, 48, 64).`,
        filePath,
        line: index + 1,
        snippet: line.trim().slice(0, 160),
        severity: 'minor',
        confidence: 'medium',
      }),
    );
  });
  return findings;
};

// ---------------------------------------------------------------------------
// MOTION-DURATION-01 — durations outside the 100–500ms vocabulary
// ---------------------------------------------------------------------------

const detectMotionDuration: Detector = ({ filePath, lines }) => {
  const findings: ScanFinding[] = [];
  lines.forEach((line, index) => {
    const values = [
      ...line.matchAll(/duration-\[(\d+(?:\.\d+)?)ms\]/g),
      ...line.matchAll(
        /(?:transition-duration|animation-duration):\s*(\d+(?:\.\d+)?)ms/g,
      ),
    ];
    for (const match of values) {
      const duration = Number(match[1]);
      // Sub-millisecond values are the standard "instant" reduced-motion
      // override (animation-duration: 0.001ms), equivalent to 0.
      if (duration < 1 || (duration >= 100 && duration <= 500)) continue;
      findings.push(
        buildScanFinding({
          ruleId: 'MOTION-DURATION-01',
          evidence: `Motion duration ${duration}ms sits outside the shared 100–500ms vocabulary.`,
          filePath,
          line: index + 1,
          snippet: line.trim().slice(0, 160),
          severity: 'minor',
        }),
      );
    }
  });
  return findings;
};

// ---------------------------------------------------------------------------
// MOTION-REDUCED-01 — animated stylesheets without a reduced-motion fallback
// ---------------------------------------------------------------------------

const detectReducedMotion: Detector = ({ filePath, source }) => {
  if (!filePath.endsWith('.css')) return [];
  const animates = /@keyframes|transition:|animation:|transition-property/.test(
    source,
  );
  if (!animates || /prefers-reduced-motion/.test(source)) return [];
  return [
    buildScanFinding({
      ruleId: 'MOTION-REDUCED-01',
      evidence:
        'Stylesheet defines transitions or animations but contains no prefers-reduced-motion fallback.',
      filePath,
      line: 1,
      snippet: '(stylesheet header)',
      severity: 'major',
    }),
  ];
};

// ---------------------------------------------------------------------------
// A11Y-CONTRAST-01 — hardcoded color pairs that fail WCAG AA
// ---------------------------------------------------------------------------

const HEX_CAPTURE = new RegExp(HEX, 'g');

function hexes(declaration: string | undefined): string[] {
  if (!declaration) return [];
  return [...declaration.matchAll(HEX_CAPTURE)].map((match) => match[0]);
}

// ---------------------------------------------------------------------------
// CSS custom-property resolution — turn var(--token) colour references back
// into concrete hex values so contrast math covers token-driven stylesheets.
// ---------------------------------------------------------------------------

/**
 * A custom-property scope: every `:root` or themed block
 * (`html.dark`, `html[data-company=…]`) becomes one context so colour pairs
 * are always evaluated inside the theme that defines them, never as an
 * impossible cross-theme combination.
 */
interface ThemeContext {
  selector: string;
  props: Map<string, string>;
}

function collectThemeContexts(source: string): ThemeContext[] {
  const contexts: ThemeContext[] = [];
  for (const rule of parseCssRules(source)) {
    const props = new Map<string, string>();
    for (const match of rule.body.matchAll(
      /(--[\w-]+)\s*:\s*([^;]+?)\s*(?:;|$)/gm,
    )) {
      props.set(match[1]!, match[2]!.trim());
    }
    if (props.size > 0) contexts.push({ selector: rule.selector, props });
  }
  return contexts;
}

/** Split a selector into compound tokens, dropping combinators. */
function selectorTokens(selector: string): Set<string> {
  return new Set(
    selector
      .split(/[\s>+~]+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
}

/**
 * Base (`:root`) properties with every ancestor theme block layered in source
 * order and the context's own declarations last. A block counts as an
 * ancestor when every compound token it declares also appears in the current
 * selector — so `.dark` contributes its tokens to
 * `.dark [data-tone='contrast']` (matching real custom-property inheritance)
 * but never to the light `[data-tone='contrast']` block.
 */
function propertiesForContext(
  contexts: ThemeContext[],
  context: ThemeContext,
): Map<string, string> {
  const base = contexts.find((entry) => entry.selector === ':root');
  const merged = new Map<string, string>(base?.props ?? []);
  if (context === base) return merged;
  const ownTokens = selectorTokens(context.selector);
  for (const candidate of contexts) {
    if (candidate === base || candidate === context) continue;
    const candidateTokens = selectorTokens(candidate.selector);
    const isAncestor = [...candidateTokens].every((token) =>
      ownTokens.has(token),
    );
    if (!isAncestor) continue;
    for (const [name, value] of candidate.props) merged.set(name, value);
  }
  for (const [name, value] of context.props) merged.set(name, value);
  return merged;
}

function tripletToHex(value: string): string | null {
  const channels = value
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (
    channels.length !== 3 ||
    channels.some((channel) => !Number.isInteger(channel) || channel < 0 || channel > 255)
  ) {
    return null;
  }
  return (
    '#' +
    channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')
  );
}

/**
 * Resolve one CSS colour expression inside a single theme context. Returns
 * null when the value cannot be computed honestly (alpha over an unknown
 * backdrop, hsl/named colours, undefined or circular variables).
 */
function resolveColor(
  expression: string,
  props: Map<string, string>,
  seen: ReadonlySet<string> = new Set(),
  depth = 0,
): string | null {
  if (depth > 5) return null;
  const expr = expression.trim();
  const literal = expr.match(new RegExp(`^${HEX}$`));
  if (literal) return literal[0];

  const varRef = expr.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+?))?\s*\)$/);
  if (varRef) {
    const name = varRef[1]!;
    if (seen.has(name)) return null;
    const next = new Set(seen).add(name);
    const raw = props.get(name);
    if (raw !== undefined) return resolveColor(raw, props, next, depth + 1);
    return varRef[2]
      ? resolveColor(varRef[2], props, next, depth + 1)
      : null;
  }

  const rgb = expr.match(/^rgba?\(\s*(.+?)\s*\)$/);
  if (rgb) {
    const inner = rgb[1]!;
    // Alpha composes over an unknown backdrop; the ratio is not knowable.
    if (inner.includes('/') || inner.split(',').length === 4) return null;
    const innerVar = inner.match(
      /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/,
    );
    if (innerVar) {
      const name = innerVar[1]!;
      if (seen.has(name)) return null;
      const raw = props.get(name) ?? innerVar[2];
      if (raw === undefined) return null;
      return tripletToHex(raw);
    }
    return tripletToHex(inner);
  }
  return null;
}

/**
 * Split a declaration into whole colour expressions, walking balanced
 * parentheses so `rgb(var(--token))` stays one expression instead of being
 * torn into a nested `var(...)` fragment.
 */
function* iterateColorExpressions(
  declaration: string,
): Generator<string> {
  const re = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b|(?:rgba?|var)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(declaration)) !== null) {
    if (!match[0].endsWith('(')) {
      yield match[0];
      continue;
    }
    let depth = 0;
    let i = re.lastIndex - 1;
    for (; i < declaration.length; i += 1) {
      if (declaration[i] === '(') depth += 1;
      else if (declaration[i] === ')') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
    }
    yield declaration.slice(match.index, i);
    re.lastIndex = i;
  }
}

/** Every resolvable solid colour mentioned in a declaration, literals included. */
function colorsIn(
  declaration: string | undefined,
  props: Map<string, string>,
): string[] {
  if (!declaration) return [];
  const colors: string[] = [];
  for (const expression of iterateColorExpressions(declaration)) {
    const resolved = resolveColor(expression, props);
    if (resolved) colors.push(resolved);
  }
  return [...new Set(colors)];
}

function worstFailingPair(foregrounds: string[], backgrounds: string[]) {
  let worst: {
    ratio: number;
    fg: string;
    bg: string;
    required: number;
  } | null = null;
  for (const fg of foregrounds) {
    for (const bg of backgrounds) {
      const verdict = checkContrast(fg, bg);
      if (
        verdict.ratio < verdict.required &&
        (!worst || verdict.ratio < worst.ratio)
      ) {
        worst = { ratio: verdict.ratio, fg, bg, required: verdict.required };
      }
    }
  }
  return worst;
}

const detectContrastPairs: Detector = ({ filePath, lines, source }) => {
  const findings: ScanFinding[] = [];

  if (filePath.endsWith('.css')) {
    const contexts = collectThemeContexts(source);
    const scopes: ThemeContext[] =
      contexts.length > 0
        ? contexts
        : [{ selector: ':root', props: new Map() }];
    const reportedPairs = new Set<string>();
    for (const rule of parseCssRules(source)) {
      // :root blocks define token variables, not a rendered color pair.
      if (/:root|@media|@keyframes/.test(rule.selector)) continue;
      let backgroundDeclaration = rule.body.match(
        /(?:^|;)\s*background-color\s*:\s*([^;}]+)/,
      )?.[1];
      if (backgroundDeclaration === undefined) {
        const shorthand = rule.body.match(
          /(?:^|;)\s*background\s*:\s*([^;}]+)/,
        )?.[1];
        // Gradients, images and urls do not resolve to a single backdrop colour.
        if (shorthand && !/gradient|url\(|image\(/.test(shorthand)) {
          backgroundDeclaration = shorthand;
        }
      }
      const foregroundDeclaration = rule.body.match(
        /(?:^|;)\s*color\s*:\s*([^;}]+)/,
      )?.[1];
      for (const context of scopes) {
        const props = propertiesForContext(contexts, context);
        const foregrounds = colorsIn(foregroundDeclaration, props);
        const backgrounds = colorsIn(backgroundDeclaration, props);
        const worst = worstFailingPair(foregrounds, backgrounds);
        if (!worst) continue;
        const pairKey = `${rule.headerLine}|${worst.fg}|${worst.bg}`;
        if (reportedPairs.has(pairKey)) continue;
        reportedPairs.add(pairKey);
        const theme =
          context.selector === ':root'
            ? ''
            : ` (theme \`${context.selector.trim()}\`)`;
        findings.push(
          buildScanFinding({
            ruleId: 'A11Y-CONTRAST-01',
            evidence: `Rule "${rule.selector.split('\n').pop()}"${theme} pairs ${worst.fg} on ${worst.bg}: ${worst.ratio}:1 against a ${worst.required}:1 AA requirement.`,
            filePath,
            line: rule.headerLine,
            snippet: `${rule.selector} { … }`.slice(0, 160),
          }),
        );
      }
    }
    return findings;
  }

  lines.forEach((line, index) => {
    const foregrounds = [
      ...hexes(line.match(/(?:^|[\s{;])color\s*:\s*([^,;}]+)/)?.[1]),
      ...hexes(line.match(/text-\[((?:var\()?#[0-9a-fA-F]{3,6})/)?.[1]),
    ];
    const backgrounds = [
      ...hexes(line.match(/background(?:Color)?\s*:\s*([^,;}]+)/)?.[1]),
      ...hexes(line.match(/bg-\[(#[0-9a-fA-F]{3,6})/)?.[1]),
    ];
    const worst = worstFailingPair(foregrounds, backgrounds);
    if (!worst) return;
    findings.push(
      buildScanFinding({
        ruleId: 'A11Y-CONTRAST-01',
        evidence: `Hardcoded pair ${worst.fg} on ${worst.bg} measures ${worst.ratio}:1 against a ${worst.required}:1 AA requirement.`,
        filePath,
        line: index + 1,
        snippet: line.trim().slice(0, 160),
      }),
    );
  });
  return findings;
};

// ---------------------------------------------------------------------------
// RESP-HOVER-01 — mouse handlers without a click/keyboard equivalent
// ---------------------------------------------------------------------------

const detectHoverOnly: Detector = ({ filePath, lines }) => {
  const findings: ScanFinding[] = [];
  lines.forEach((line, index) => {
    if (!/onMouse(Enter|Over|Leave|Out)\b/.test(line)) return;
    if (/onClick|onKeyDown|onKeyUp|role=/.test(line)) return;
    findings.push(
      buildScanFinding({
        ruleId: 'RESP-HOVER-01',
        evidence:
          'Element reacts to mouse hover/leave with no onClick or keyboard handler on the same element (manual verification recommended).',
        filePath,
        line: index + 1,
        snippet: line.trim().slice(0, 160),
        severity: 'major',
        confidence: 'low',
      }),
    );
  });
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-NAME-01 — images without an alt attribute (missing alt entirely;
// alt="" is the valid decorative form and passes)
// ---------------------------------------------------------------------------

const detectMissingImageAlt: Detector = ({ filePath, source }) => {
  const findings: ScanFinding[] = [];
  for (const tag of extractTags(source).filter(
    (candidate) => candidate.tag === 'img' && !candidate.isClose,
  )) {
    if (/\balt=/.test(tag.text)) continue;
    findings.push(
      buildScanFinding({
        ruleId: 'A11Y-NAME-01',
        evidence:
          'Image has no alt attribute; add descriptive alt text or alt="" when the image is purely decorative.',
        filePath,
        line: tag.line,
        snippet: tag.text.replaceAll('\n', ' ').trim().slice(0, 160),
        severity: 'major',
      }),
    );
  }
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-KEYBOARD-01 — autoFocus steals focus on mount, disorienting keyboard
// and screen-reader users; focus should move in response to a user action.
// ---------------------------------------------------------------------------

const detectAutofocus: Detector = ({ filePath, source }) => {
  const findings: ScanFinding[] = [];
  for (const tag of extractTags(source).filter(
    (candidate) => !candidate.isClose,
  )) {
    if (!/\bautoFocus\b/.test(tag.text)) continue;
    findings.push(
      buildScanFinding({
        ruleId: 'A11Y-KEYBOARD-01',
        evidence:
          'autoFocus moves focus when the component mounts; move focus deliberately (ref + effect) after a user action instead.',
        filePath,
        line: tag.line,
        snippet: tag.text.replaceAll('\n', ' ').trim().slice(0, 160),
        severity: 'major',
        confidence: 'medium',
      }),
    );
  }
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-HEADING-01 — heading levels must not skip (h1 then h3)
// ---------------------------------------------------------------------------

const HEADING_TAG = /^h([1-6])$/;

const detectHeadingOrder: Detector = ({ filePath, source }) => {
  if (!/\.[jt]sx$/.test(filePath)) return [];
  const findings: ScanFinding[] = [];
  let previous = 0;
  for (const tag of extractTags(source)) {
    if (tag.isClose) continue;
    const match = HEADING_TAG.exec(tag.tag);
    if (!match) continue;
    const level = Number(match[1]);
    // Components may legitimately start at any level; only downward skips are
    // defects, and per-file analysis cannot see headings composed elsewhere.
    if (previous > 0 && level > previous + 1) {
      findings.push(
        buildScanFinding({
          ruleId: 'A11Y-HEADING-01',
          evidence: `Heading level jumps from h${previous} to h${level}; insert the missing level or restructure the outline (per-file analysis — verify the composed page).`,
          filePath,
          line: tag.line,
          snippet: tag.text.replaceAll('\n', ' ').trim().slice(0, 160),
          severity: 'minor',
          confidence: 'medium',
        }),
      );
    }
    previous = level;
  }
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-LANG-01 — html entry documents must declare a language
// ---------------------------------------------------------------------------

const detectDocumentLanguage: Detector = ({ filePath, source }) => {
  if (!filePath.endsWith('.html')) return [];
  const htmlTag = source.match(/<html\b[^>]*>/i);
  if (!htmlTag || /\blang\s*=\s*["'][^"']+["']/.test(htmlTag[0])) return [];
  const line = source.slice(0, htmlTag.index).split('\n').length;
  return [
    buildScanFinding({
      ruleId: 'A11Y-LANG-01',
      evidence:
        'The <html> element carries no non-empty lang attribute; assistive technology needs it to select the correct pronunciation.',
      filePath,
      line,
      snippet: htmlTag[0].trim().slice(0, 160),
      severity: 'major',
      confidence: 'high',
    }),
  ];
};

// ---------------------------------------------------------------------------
// A11Y-KEYBOARD-02 — key handlers on non-interactive elements
// ---------------------------------------------------------------------------

const NATIVE_INTERACTIVE_TAGS = new Set([
  'button',
  'a',
  'input',
  'select',
  'textarea',
  'summary',
  'details',
]);

const INTERACTIVE_WIDGET_ROLES = new Set([
  'button',
  'link',
  'checkbox',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'tab',
  'combobox',
  'textbox',
  'searchbox',
  'switch',
  'treeitem',
  'slider',
  'spinbutton',
  'gridcell',
  'radiogroup',
  'listbox',
  'menu',
  'menubar',
  'tablist',
  'grid',
  'tree',
  'dialog',
  'alertdialog',
]);

const detectNonInteractiveKeyHandlers: Detector = ({ filePath, source }) => {
  if (!/\.[jt]sx$/.test(filePath)) return [];
  const findings: ScanFinding[] = [];
  for (const tag of extractTags(source)) {
    if (tag.isClose || !/\bonKey(?:Down|Up|Press)\b/.test(tag.text)) continue;
    if (NATIVE_INTERACTIVE_TAGS.has(tag.tag)) continue;
    const role = tag.text.match(/\brole\s*=\s*["']([^"']+)["']/)?.[1];
    if (role && INTERACTIVE_WIDGET_ROLES.has(role)) continue;
    // A presentational element cannot itself be focused: a key listener on it
    // only ever receives bubbled events (e.g. overlay Escape-to-close), which
    // is not an interactive-widget claim.
    if (role === 'presentation' || role === 'none') continue;
    // Escape-only listeners are overlay-dismissal gestures, not widget claims.
    if (/["'`]Escape["'`]/.test(tag.text)) continue;
    findings.push(
      buildScanFinding({
        ruleId: 'A11Y-KEYBOARD-02',
        evidence: `Key handler is attached to a non-interactive <${tag.tag}> with no interactive widget role; move it to a native control or add the matching role and tabindex with full Enter/Space handling.`,
        filePath,
        line: tag.line,
        snippet: tag.text.replaceAll('\n', ' ').trim().slice(0, 160),
        severity: 'major',
        confidence: 'medium',
      }),
    );
  }
  return findings;
};

// ---------------------------------------------------------------------------
// A11Y-SCROLL-01 — scrollable regions that may not be keyboard reachable.
// CSS cannot see rendered overflow or tab order, so this stays a low-confidence
// review cue; the Playwright axe run confirms or clears it against the DOM.
// ---------------------------------------------------------------------------

const NATIVE_SCROLL_SELECTOR =
  /(^|[\s>+~,])(?:html|body|textarea|input)(?:$|[\s:.[#:+~>,])/;

const detectScrollableRegions: Detector = ({ filePath, source, lines }) => {
  if (!filePath.endsWith('.css')) return [];
  // Minified/bundled stylesheets are build output, not hand-authored rules.
  if (lines.some((line) => line.length > 500)) return [];
  const findings: ScanFinding[] = [];
  for (const rule of parseCssRules(source)) {
    const scrollable = [
      ...rule.body.matchAll(
        /(?:^|;)\s*overflow(?:-[xy])?\s*:\s*(auto|scroll)\b/g,
      ),
    ];
    if (scrollable.length === 0) continue;
    if (NATIVE_SCROLL_SELECTOR.test(rule.selector)) continue;
    const axes = [...new Set(scrollable.map((match) => match[1]))].join('/');
    findings.push(
      buildScanFinding({
        ruleId: 'A11Y-SCROLL-01',
        evidence: `Rule "${rule.selector.split('\n').pop()}" creates an ${axes}-scrollable region; verify the rendered element is keyboard reachable (native control, tabindex=0 or a roving-tabindex widget) and that focus can leave it.`,
        filePath,
        line: rule.headerLine,
        snippet: `${rule.selector} { … }`.slice(0, 160),
        severity: 'minor',
        confidence: 'low',
      }),
    );
  }
  return findings;
};

export const DETECTORS: Detector[] = [
  detectFocusRemoval,
  detectSmallTargets,
  detectCssTargets,
  detectUnlabelledInputs,
  detectNamelessInteractive,
  detectMissingImageAlt,
  detectAutofocus,
  detectHeadingOrder,
  detectDocumentLanguage,
  detectNonInteractiveKeyHandlers,
  detectScrollableRegions,
  detectZIndexEscalation,
  detectOffScaleSpacing,
  detectMotionDuration,
  detectReducedMotion,
  detectContrastPairs,
  detectHoverOnly,
];
