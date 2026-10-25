/**
 * The flow is data, so it can be checked without a model or a browser. These
 * tests are the reason the diagram on the page is allowed to be shown: it is the
 * same object the request uses.
 */
import { describe, expect, it } from 'vitest';

import { ASSISTANTS } from '@/content/assistants';
import { FLOWS, composeTemperature, maxTokens, retrieveLimit } from '@/content/flows';
import { MAX_STEPS, runFlow } from '@/lib/assistant/flow';
import { requestBody } from '@/lib/assistant/stream';

const CONFIGURED = {
  configured: true,
  baseUrl: 'https://router.huggingface.co/v1',
  model: 'meta-llama/Llama-3.3-70B-Instruct',
  keySource: 'ASSISTANT_API_KEY' as const,
  missing: [],
  reason: 'Configured.',
};

describe('flow definitions', () => {
  it('every assistant has a flow whose nodes have unique ids', () => {
    for (const name of Object.keys(ASSISTANTS) as (keyof typeof ASSISTANTS)[]) {
      const flow = FLOWS[name];
      expect(flow).toBeDefined();
      const ids = flow.nodes.map((node) => node.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('every flow retrieves, guards and composes, in that order', () => {
    for (const flow of Object.values(FLOWS)) {
      const kinds = flow.nodes.map((node) => node.kind);
      expect(kinds.indexOf('retrieve')).toBeLessThan(kinds.indexOf('guard'));
      expect(kinds.indexOf('guard')).toBeLessThan(kinds.indexOf('compose'));
    }
  });

  it('reads its settings from the nodes rather than hard-coded numbers', () => {
    const flow = FLOWS['velaqori-triage'];
    expect(retrieveLimit(flow)).toBe(3);
    expect(composeTemperature(flow)).toBeCloseTo(0.2);
    expect(maxTokens(flow)).toBe(700);
  });

  it('feeds those settings into the request actually sent', () => {
    const body = requestBody(CONFIGURED, 'tamuzi-study-plan', 'twenty minutes a day', []);
    expect(body.temperature).toBe(composeTemperature(FLOWS['tamuzi-study-plan']));
    expect(body.max_tokens).toBe(maxTokens(FLOWS['tamuzi-study-plan']));
  });
});

describe('runFlow', () => {
  it('reports a step per node when material was found', () => {
    const result = runFlow(FLOWS['velaqori-triage'], {
      question: 'leaked credential',
      passages: [{ id: 'severity', title: 'Deciding how urgent something is', score: 1 }],
    });
    expect(result.proceed).toBe(true);
    expect(result.steps.map((step) => step.id)).toEqual(['retrieve', 'guard', 'policy', 'compose', 'structure']);
    expect(result.steps.every((step) => step.ok)).toBe(true);
  });

  it('stops at the guard and refuses when nothing matched', () => {
    const result = runFlow(FLOWS['velaqori-triage'], { question: 'quantum', passages: [] });
    expect(result.proceed).toBe(false);
    expect(result.refusal).toContain('not going to guess');
    // Nothing after the failing guard ran.
    expect(result.steps.map((step) => step.id)).toEqual(['retrieve', 'guard']);
    expect(result.steps[1]?.ok).toBe(false);
  });

  it('is bounded by a step budget', () => {
    const looped = {
      id: 'loop',
      name: 'looped',
      nodes: Array.from({ length: MAX_STEPS + 5 }, (_, index) => ({
        id: `n${index}`,
        kind: 'retrieve' as const,
        label: `Retrieve ${index}`,
        config: {},
      })),
    };
    expect(runFlow(looped, { question: 'q', passages: [] }).steps).toHaveLength(MAX_STEPS);
  });

  it('survives an empty flow without pretending it answered', () => {
    const empty = { id: 'empty', name: 'empty', nodes: [] };
    const result = runFlow(empty, { question: 'q', passages: [] });
    expect(result.steps).toEqual([]);
    // No guard ran, so nothing refused: the caller must not treat this as success
    // with content. The route never reaches here, because every real flow has one.
    expect(result.proceed).toBe(true);
  });
});
