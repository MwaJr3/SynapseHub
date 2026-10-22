import { describe, expect, it } from 'vitest';

import { operationsModules, operationsProvenance } from './operations';

/**
 * The operations layer's contract: seven modules, each with explicit states,
 * defined metrics and an integrity rule — and a hard guarantee that no
 * demonstration figures (uptime %, revenue, churn, waitlists, user counts)
 * ever appear in the data the console renders.
 */

const EXPECTED_ORDER = [
  'service-status',
  'release-changelog',
  'learning-analytics',
  'access-queue',
  'access-funding',
  'provider-health',
  'performance-budgets',
];

describe('operations modules', () => {
  it('contains exactly the seven modules, in order', () => {
    expect(operationsModules.map((module) => module.id)).toEqual(EXPECTED_ORDER);
    expect(operationsModules.map((module) => module.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it('gives every module explicit states, metric definitions and an integrity rule', () => {
    for (const module of operationsModules) {
      expect(module.purpose.length).toBeGreaterThan(20);
      expect(module.adaptedFrom.length).toBeGreaterThan(10);
      expect(module.context.length).toBeGreaterThan(40);

      // Explicit states: at least four, each with a meaning.
      expect(module.states.length).toBeGreaterThanOrEqual(4);
      const stateIds = module.states.map((state) => state.id);
      expect(new Set(stateIds).size).toBe(stateIds.length);
      for (const state of module.states) {
        expect(state.label.length).toBeGreaterThan(1);
        expect(state.meaning.length).toBeGreaterThan(20);
      }

      // Metric definitions: at least three, each fully specified.
      expect(module.metrics.length).toBeGreaterThanOrEqual(3);
      const metricIds = module.metrics.map((metric) => metric.id);
      expect(new Set(metricIds).size).toBe(metricIds.length);
      for (const metric of module.metrics) {
        expect(metric.name.length).toBeGreaterThan(3);
        expect(metric.definition.length).toBeGreaterThan(40);
        expect(metric.unit.length).toBeGreaterThan(1);
        expect(metric.source.length).toBeGreaterThan(5);
      }

      // Integrity rules are substantive commitments, not one-liners.
      expect(module.integrityRule.length).toBeGreaterThan(80);
    }
  });

  it('states plainly that the source series is adapted, not hidden', () => {
    expect(operationsProvenance.source).toMatch(/dashboard/i);
    expect(operationsProvenance.adaptation).toMatch(/not reproduced|invented/i);
    for (const module of operationsModules) {
      expect(module.adaptedFrom).toMatch(/concept \d\/07/i);
    }
  });
});

describe('no invented figures', () => {
  const serialized = JSON.stringify(operationsModules);

  it('contains no percentages or currency amounts', () => {
    // The published Core Web Vitals thresholds are durations/scores
    // ("2.5 s", "200 ms", "0.1") — never written with a % sign.
    expect(serialized).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(serialized).not.toMatch(/[$€£]\s?\d/);
  });

  it('contains no comma-grouped vanity totals', () => {
    // Figures like "18,204 users" or "$48,290" never appear.
    expect(serialized).not.toMatch(/\b\d{1,3}(,\d{3})+\b/);
  });

  it('names no vanity metrics as reportable metrics', () => {
    const metricNames = operationsModules
      .flatMap((module) => module.metrics)
      .map((metric) => metric.name.toLowerCase());
    const forbidden = /\b(mrr|churn|waitlist|active users|signups|revenue)\b/;
    for (const name of metricNames) {
      expect(name).not.toMatch(forbidden);
    }
  });

  it('still names the forbidden figures so integrity rules can forbid them', () => {
    // The rules must be able to say what they prohibit — the words appear
    // only in prohibition language, never as values.
    const rules = operationsModules
      .map((module) => module.integrityRule)
      .join(' ');
    expect(rules.toLowerCase()).toMatch(/no (availability|waitlist|response)/);
  });
});

describe('performance budgets reference published thresholds', () => {
  it('quotes Core Web Vitals guidance as budgets, labelled as published', () => {
    const module = operationsModules.find(
      (entry) => entry.id === 'performance-budgets',
    )!;
    const text = JSON.stringify(module);
    expect(text).toContain('2.5 s');
    expect(text).toContain('200 ms');
    expect(text).toContain('0.1');
    expect(module.integrityRule).toMatch(/published budgets.*not as results|not as measurements/i);
    // Routes with no run are shown as not measured.
    expect(module.states.map((state) => state.id)).toContain('not-measured');
  });
});
