/**
 * Executes an assistant flow.
 *
 * The runner is deliberately dumb: it walks the declared nodes in order and
 * reports what happened. Two things make that worthwhile rather than decorative:
 *
 * 1. **The settings used at request time come from the flow.** Retrieval limit,
 *    temperature and token cap are read from the same nodes the page displays, so
 *    the diagram cannot drift from the behaviour.
 * 2. **It emits a trace.** Each node that runs produces a step with a label the
 *    visitor can read, and the trace is bounded by a step budget so a malformed
 *    flow cannot loop.
 */
import type { AssistantFlow, AnswerExpectation, FlowNode } from '@/content/flows';

export interface FlowStep {
  id: string;
  kind: FlowNode['kind'];
  label: string;
  /** One short sentence a visitor could understand. */
  detail: string;
  ok: boolean;
}

export interface FlowContext {
  question: string;
  passages: { id: string; title: string; score: number }[];
}

export interface FlowResult {
  steps: FlowStep[];
  /** False when a guard decided the assistant must not answer. */
  proceed: boolean;
  refusal: string | null;
}

/** A flow that needs more than this is a bug, not a workflow. */
export const MAX_STEPS = 12;

export function runFlow(flow: AssistantFlow, context: FlowContext): FlowResult {
  const steps: FlowStep[] = [];
  let proceed = true;
  let refusal: string | null = null;

  for (const node of flow.nodes.slice(0, MAX_STEPS)) {
    if (!proceed) break;

    switch (node.kind) {
      case 'retrieve': {
        const count = context.passages.length;
        steps.push({
          id: node.id,
          kind: node.kind,
          label: node.label,
          detail: count === 0 ? 'Nothing on this site matched.' : `${count} passage${count === 1 ? '' : 's'} matched.`,
          ok: true,
        });
        break;
      }
      case 'guard': {
        const enough = context.passages.length > 0;
        if (!enough) {
          proceed = false;
          refusal =
            'I could not find anything on this site that covers that, so I am not going to guess. ' +
            'A person can take it from here.';
        }
        steps.push({
          id: node.id,
          kind: node.kind,
          label: node.label,
          detail: enough ? 'Material found, continuing.' : 'No material: answering would mean inventing.',
          ok: enough,
        });
        break;
      }
      case 'policy': {
        steps.push({
          id: node.id,
          kind: node.kind,
          label: node.label,
          detail: 'Guardrails attached to the instructions.',
          ok: true,
        });
        break;
      }
      case 'compose': {
        steps.push({
          id: node.id,
          kind: node.kind,
          label: node.label,
          detail: 'Answer streamed from the model.',
          ok: true,
        });
        break;
      }
      case 'structure': {
        steps.push({
          id: node.id,
          kind: node.kind,
          label: node.label,
          detail: 'Answer trimmed and cited.',
          ok: true,
        });
        break;
      }
    }
  }

  return { steps, proceed, refusal };
}

/**
 * Check the finished answer against the flow's declared expectations.
 *
 * Returns the problems found, not a boolean, so the caller can say what was
 * wrong. An answer that fails is not "shown with a warning and kept": the route
 * reports it as unfinished, because a half-answer presented as complete is the
 * failure this whole product is built to avoid.
 */
export function checkAnswer(expects: AnswerExpectation, text: string): string[] {
  const trimmed = text.trim();
  const problems: string[] = [];

  if (trimmed.length < expects.minChars) {
    problems.push(`The answer stopped after ${trimmed.length} characters, below the ${expects.minChars} this flow requires.`);
  }
  if (trimmed.length > expects.maxChars) {
    problems.push(`The answer ran to ${trimmed.length} characters, past the ${expects.maxChars} this flow allows.`);
  }
  if (expects.mustEndWithOneAction && trimmed.length > 0) {
    // A closing question mark means the assistant handed the work back instead
    // of ending on something the visitor can do.
    const finalLine = trimmed.split('\n').map((line) => line.trim()).filter(Boolean).pop() ?? '';
    if (finalLine.endsWith('?')) {
      problems.push('The answer ended by asking the visitor a question instead of naming one next action.');
    }
  }
  return problems;
}

/** The trace as it is shown to a visitor: labels only, no internals. */
export function publicTrace(result: FlowResult): { label: string; detail: string; ok: boolean }[] {
  return result.steps.map((step) => ({ label: step.label, detail: step.detail, ok: step.ok }));
}
