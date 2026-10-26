/**
 * Assistant flows — the one idea worth taking from Flowise.
 *
 * Flowise's model is a graph you draw: nodes with typed edges, executed in order,
 * with the state passed along. What is useful here is not the canvas, it is the
 * declaration: an assistant's behaviour is **data**, not code buried in a route
 * handler. So each assistant has a flow below, the runner executes it, and the
 * page renders the same flow it actually runs — no picture that drifts from the
 * implementation.
 *
 * What is deliberately not taken: dragging, a saved canvas, a plugin marketplace.
 * Two assistants with five nodes do not need a graph editor, and shipping one
 * would be a feature nobody asked for that also had to be maintained.
 *
 * Node kinds are the only vocabulary:
 *   retrieve   pull grounded passages for the question
 *   guard      decide whether there is enough material to answer at all
 *   policy     apply the assistant's guardrails as a system instruction
 *   compose    the model call
 *   structure  trim and label the answer before it is stored
 */

export type NodeKind = 'retrieve' | 'guard' | 'policy' | 'compose' | 'structure';

export interface FlowNode {
  id: string;
  kind: NodeKind;
  label: string;
  /** Node-kind specific settings. Kept small on purpose. */
  config: Record<string, string | number | boolean>;
}

/**
 * What the finished answer must look like, declared as data.
 *
 * Taken from CrewAI's task model: a task states its expected output, and the
 * work is checked against that before it is accepted. Without it, "the model
 * returned something" is treated as success — which is how a truncated or empty
 * answer reaches a visitor looking like a considered one. The checks are
 * deliberately crude (length, ending) because they are honest: they cannot judge
 * truth, and they do not pretend to.
 */
export interface AnswerExpectation {
  /** Below this, the answer is treated as not written, not as short. */
  minChars: number;
  /** Above this, the answer exceeded the cap that was requested. */
  maxChars: number;
  /** The policy this flow enforces, quoted back when the answer breaks it. */
  mustEndWithOneAction: boolean;
}

export interface AssistantFlow {
  id: string;
  name: string;
  nodes: FlowNode[];
  expects: AnswerExpectation;
}

export const FLOWS: Record<'velaqori-triage' | 'tamuzi-study-plan', AssistantFlow> = {
  'velaqori-triage': {
    id: 'flow-velaqori-triage-v1',
    name: 'Triage flow',
    nodes: [
      {
        id: 'retrieve',
        kind: 'retrieve',
        label: 'Retrieve Velaqori guidance',
        config: { limit: 3 },
      },
      {
        id: 'guard',
        kind: 'guard',
        label: 'Refuse when nothing covers the question',
        config: { onEmpty: 'refuse' },
      },
      {
        id: 'policy',
        kind: 'policy',
        label: 'Apply triage guardrails',
        config: { forbid: 'response-times,prices,breach-confirmation' },
      },
      { id: 'compose', kind: 'compose', label: 'Compose the answer', config: { temperature: 0.2 } },
      {
        id: 'structure',
        kind: 'structure',
        label: 'End on one next action',
        config: { maxTokens: 700 },
      },
    ],
    expects: { minChars: 40, maxChars: 2400, mustEndWithOneAction: true },
  },
  'tamuzi-study-plan': {
    id: 'flow-tamuzi-study-v1',
    name: 'Study planning flow',
    nodes: [
      {
        id: 'retrieve',
        kind: 'retrieve',
        label: 'Retrieve Tamuzi study principles',
        config: { limit: 3 },
      },
      {
        id: 'guard',
        kind: 'guard',
        label: 'Refuse when nothing covers the question',
        config: { onEmpty: 'refuse' },
      },
      {
        id: 'policy',
        kind: 'policy',
        label: 'Apply study guardrails',
        config: { forbid: 'grades,progress,enrolment' },
      },
      { id: 'compose', kind: 'compose', label: 'Compose the plan', config: { temperature: 0.3 } },
      {
        id: 'structure',
        kind: 'structure',
        label: 'Keep it to minutes, days and slots',
        config: { maxTokens: 600 },
      },
    ],
    expects: { minChars: 40, maxChars: 2000, mustEndWithOneAction: true },
  },
};

export function retrieveLimit(flow: AssistantFlow): number {
  const node = flow.nodes.find((entry) => entry.kind === 'retrieve');
  const limit = node?.config.limit;
  return typeof limit === 'number' && limit > 0 ? limit : 3;
}

export function composeTemperature(flow: AssistantFlow): number {
  const node = flow.nodes.find((entry) => entry.kind === 'compose');
  const temperature = node?.config.temperature;
  return typeof temperature === 'number' ? temperature : 0.2;
}

export function maxTokens(flow: AssistantFlow): number {
  const node = flow.nodes.find((entry) => entry.kind === 'structure');
  const value = node?.config.maxTokens;
  return typeof value === 'number' ? value : 700;
}
