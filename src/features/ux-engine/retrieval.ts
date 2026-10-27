/**
 * Reasoning / Retrieval Layer — hybrid pattern retrieval.
 *
 * Ranking combines weighted lexical relevance (title, tags, summary, rule
 * statements) with hard constraints (domain, component kind, state). Every
 * returned pattern carries the reasons it matched and the trade-offs it
 * introduces, so downstream commands can explain themselves.
 */
import { getPattern, PATTERNS } from './patterns';
import { getRule } from './rules';
import type {
  ComponentKind,
  CoreState,
  PatternDomain,
  RetrievalQuery,
  ScoredPattern,
  UXPattern,
} from './types';

// Component kinds imply the patterns that usually govern them.
const KIND_SIGNALS: Record<ComponentKind, string[]> = {
  button: ['button', 'disabled', 'destructive', 'loading', 'undo'],
  'text-field': ['form', 'validation', 'field', 'masking', 'label'],
  form: ['form', 'validation', 'wizard', 'password', 'upload'],
  modal: ['modal', 'overlay', 'focus', 'dialog'],
  sheet: ['bottom-sheet', 'sheet', 'overlay', 'mobile'],
  drawer: ['modal', 'overlay', 'drawer'],
  popover: ['dropdown', 'tooltip', 'overlay', 'placement'],
  tooltip: ['tooltip', 'overlay', 'hover'],
  toast: ['toast', 'notification', 'feedback'],
  table: ['table', 'bulk', 'sorting', 'data'],
  card: ['card', 'hover', 'depth', 'shadow'],
  tabs: ['tabs', 'navigation', 'indicator'],
  menu: ['context-menu', 'menu', 'keyboard', 'dropdown'],
  dropdown: ['dropdown', 'menu', 'overlay', 'search'],
  nav: ['navigation', 'command-palette', 'menu', 'tabs'],
  search: ['search', 'command-palette', 'empty', 'pagination'],
  upload: ['upload', 'progress', 'drag', 'queue'],
  slider: ['slider', 'range', 'touch', 'keyboard'],
  toggle: ['toggle', 'switch', 'optimistic', 'rollback'],
  rating: ['rating', 'star', 'preview', 'input'],
  wizard: ['wizard', 'stepper', 'validation', 'progress'],
  pagination: ['pagination', 'url-state', 'filters'],
  accordion: ['accordion', 'disclosure', 'aria'],
  'date-picker': ['date', 'picker', 'calendar', 'sheet'],
  otp: ['otp', 'input', 'paste', 'autofill'],
  'command-palette': ['command-palette', 'keyboard', 'search', 'fuzzy'],
  filter: ['filter', 'chips', 'url-state', 'counts'],
  generic: ['hierarchy', 'state', 'tokens'],
};

const STATE_SIGNALS: Record<CoreState, string[]> = {
  default: ['hierarchy', 'affordance'],
  hover: ['hover', 'card-hover'],
  'focus-visible': ['focus', 'keyboard'],
  pressed: ['animation-timing', 'doherty'],
  selected: ['selection', 'tabs', 'toggle'],
  disabled: ['disabled', 'validation'],
  loading: ['loading', 'skeleton', 'doherty'],
  optimistic: ['optimistic', 'rollback', 'autosave'],
  success: ['toast', 'notification', 'feedback'],
  error: ['error', 'recovery', 'microcopy'],
  offline: ['autosave', 'offline', 'queue'],
  empty: ['empty', 'no-result', 'microcopy'],
  permission: ['settings', 'access'],
  destructive: ['destructive', 'undo', 'danger'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

function lexicalScore(
  pattern: UXPattern,
  tokens: string[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const haystacks: Array<{ field: string; text: string; weight: number }> = [
    { field: 'title', text: pattern.title, weight: 6 },
    { field: 'tags', text: pattern.tags.join(' '), weight: 5 },
    { field: 'slug', text: pattern.slug, weight: 4 },
    { field: 'summary', text: pattern.summary, weight: 2 },
    {
      field: 'rules',
      text: pattern.ruleIds.map((id) => getRule(id).statement).join(' '),
      weight: 2,
    },
    {
      field: 'guidance',
      text: [...pattern.do, ...pattern.dont].join(' '),
      weight: 1,
    },
  ];

  for (const token of tokens) {
    for (const stack of haystacks) {
      const words = tokenize(stack.text);
      if (words.includes(token) || stack.text.toLowerCase().includes(token)) {
        score += stack.weight;
        if (stack.field === 'title') reasons.push(`title matches “${token}”`);
        else if (stack.field === 'tags') reasons.push(`tagged “${token}”`);
      }
    }
  }
  return { score, reasons: [...new Set(reasons)].slice(0, 4) };
}

/**
 * Hybrid retrieval: hard constraints filter, lexical + signal weights rank.
 */
export function retrievePatterns(query: RetrievalQuery): ScoredPattern[] {
  const tokens = tokenize(query.text);
  const domains = new Set<PatternDomain>(query.domains ?? []);
  const kindSignals = new Set(
    (query.componentKinds ?? []).flatMap((kind) => KIND_SIGNALS[kind] ?? []),
  );
  const stateSignals = new Set(
    (query.states ?? []).flatMap((state) => STATE_SIGNALS[state] ?? []),
  );

  const scored: ScoredPattern[] = [];

  for (const pattern of PATTERNS) {
    if (domains.size > 0 && !domains.has(pattern.domain)) continue;

    const { score: lexical, reasons } = lexicalScore(pattern, tokens);
    let score = lexical;

    if (kindSignals.size > 0) {
      const kindHits = pattern.tags.filter((tag) => kindSignals.has(tag));
      const slugHit = kindSignals.has(pattern.slug);
      if (kindHits.length > 0 || slugHit) {
        score += 4 + kindHits.length;
        reasons.push(
          `relevant to ${query.componentKinds?.join('/')} components`,
        );
      }
    }

    if (stateSignals.size > 0) {
      const stateHits = pattern.tags.filter((tag) => stateSignals.has(tag));
      const slugHit = stateSignals.has(pattern.slug);
      if (stateHits.length > 0 || slugHit) {
        score += 3 + stateHits.length;
        reasons.push(`addresses the ${query.states?.join('/')} state`);
      }
    }

    if (score <= 0) continue;

    const conflicts = pattern.conflicts.map((id) => getPattern(id));
    scored.push({
      pattern,
      score,
      reasons: [...new Set(reasons)],
      conflicts,
    });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.pattern.number - b.pattern.number)
    .slice(0, query.limit ?? 8);
}

/** Convenience used by the audit engine to cite patterns for a component. */
export function patternsForComponent(
  kind: ComponentKind,
  states: CoreState[] = [],
  limit = 6,
): ScoredPattern[] {
  return retrievePatterns({
    text: KIND_SIGNALS[kind]?.join(' ') ?? kind,
    componentKinds: [kind],
    states,
    limit,
  });
}
