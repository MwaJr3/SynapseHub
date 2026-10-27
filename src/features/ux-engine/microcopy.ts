/**
 * Content Engine — microcopy as UI.
 *
 * Outcome-oriented CTA generation, empty-state classification, error recovery
 * templates and tone constraints. Every template has slots rather than fixed
 * product names so the output is implementation-ready but never invents
 * facts about a product.
 */
import type { EmptyStateKind } from './types';

export interface MicrocopyResult {
  copy: string;
  rationale: string;
  patternIds: string[];
}

// ---------------------------------------------------------------------------
// Outcome-oriented CTAs
// ---------------------------------------------------------------------------

const OUTCOME_VERBS: Record<string, string> = {
  create: 'Create',
  save: 'Save',
  delete: 'Delete',
  submit: 'Continue',
  download: 'Download',
  search: 'Search',
  invite: 'Invite',
  upload: 'Upload',
  confirm: 'Confirm',
};

/**
 * Generic verbs ("Submit", "OK") are replaced with verb + object + outcome.
 * Destructive CTAs must name the thing being destroyed (P11, P51).
 */
export function generateCta(input: {
  intent: string;
  object: string;
  outcome?: string;
  destructive?: boolean;
}): MicrocopyResult {
  const verb =
    OUTCOME_VERBS[input.intent.toLowerCase()] ?? capitalize(input.intent);
  const object = input.object.trim();
  if (!object) {
    return {
      copy: verb,
      rationale:
        'Provide the object the action acts on so the CTA is outcome-oriented.',
      patternIds: ['P51', 'P2'],
    };
  }
  const copy = input.destructive
    ? `${verb} ${object}`
    : input.outcome
      ? `${verb} ${object} — ${input.outcome}`
      : `${verb} ${object}`;
  return {
    copy,
    rationale: input.destructive
      ? 'Destructive CTA names the object being destroyed; friction and undo are decided by irreversibility (P11).'
      : 'Verb plus object (plus outcome) tells the user what will happen before they click (P51).',
    patternIds: input.destructive ? ['P51', 'P11'] : ['P51', 'P2'],
  };
}

// ---------------------------------------------------------------------------
// Empty states — four classified templates
// ---------------------------------------------------------------------------

export const EMPTY_STATE_COPY: Record<
  EmptyStateKind,
  { explanation: string; action: string }
> = {
  'first-run': {
    explanation:
      'Nothing here yet — this is where your {object} will appear once you create one.',
    action: 'Create your first {object}',
  },
  'no-result': {
    explanation:
      'We could not find any {object} matching “{query}”. Check the spelling or try a broader term.',
    action: 'Clear search',
  },
  filtered: {
    explanation:
      'No {object} match the current filters. Remove a filter to widen the results.',
    action: 'Clear filters',
  },
  error: {
    explanation:
      'The {object} could not be loaded. Your work is saved — this is a loading problem, not a data problem.',
    action: 'Try again',
  },
};

export function generateEmptyState(
  kind: EmptyStateKind,
  slots: { object: string; query?: string },
): MicrocopyResult {
  const template = EMPTY_STATE_COPY[kind];
  const fill = (text: string) =>
    text
      .replaceAll('{object}', slots.object)
      .replaceAll('{query}', slots.query ?? '');
  return {
    copy: `${fill(template.explanation)}\n${fill(template.action)}`,
    rationale: `Classified as a ${kind} empty state: explanation plus the next useful action, never a blank container (P22).`,
    patternIds: ['P22', 'P51'],
  };
}

// ---------------------------------------------------------------------------
// Error recovery — what happened / why it matters / next action
// ---------------------------------------------------------------------------

export interface ErrorCopyInput {
  whatHappened: string;
  whyItMatters: string;
  recoveryAction: string;
  severity?: 'transient' | 'blocking' | 'destructive';
}

export function generateErrorCopy(input: ErrorCopyInput): MicrocopyResult {
  const surface =
    input.severity === 'blocking'
      ? 'modal/banner (blocking surface)'
      : input.severity === 'destructive'
        ? 'inline danger state plus undo'
        : 'inline message or toast';
  const copy = [
    `What happened: ${input.whatHappened}`,
    `Why it matters: ${input.whyItMatters}`,
    `Next step: ${input.recoveryAction}`,
  ].join('\n');
  return {
    copy,
    rationale: `Human copy with a concrete recovery action, surfaced via ${surface} chosen by severity (P23).`,
    patternIds: ['P23', 'P51'],
  };
}

// ---------------------------------------------------------------------------
// Tone constraints
// ---------------------------------------------------------------------------

const BLAME_PATTERNS = [
  /you (failed|didn't|must)/i,
  /invalid input/i,
  /illegal/i,
];
const FAKE_URGENCY = [
  /last chance!*$/i,
  /act now or lose/i,
  /\d+ users waiting/i,
];

export interface ToneVerdict {
  acceptable: boolean;
  issues: string[];
}

export function checkTone(copy: string): ToneVerdict {
  const issues: string[] = [];
  if (BLAME_PATTERNS.some((pattern) => pattern.test(copy))) {
    issues.push(
      'Copy blames the user; rephrase around the system and the recovery action (P51).',
    );
  }
  if (FAKE_URGENCY.some((pattern) => pattern.test(copy))) {
    issues.push(
      'Manufactured urgency; only signal urgency backed by real state (P45).',
    );
  }
  if (copy === copy.toUpperCase() && copy.length > 12) {
    issues.push(
      'All-caps sentences read as shouting and harm screen-reader pronunciation.',
    );
  }
  return { acceptable: issues.length === 0, issues };
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0]!.toUpperCase() + value.slice(1);
}
