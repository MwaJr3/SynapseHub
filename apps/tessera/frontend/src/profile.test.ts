import { describe, expect, it } from 'vitest';

import type { Instrument } from './api';
import { buildScores } from './profile';
import { formatScore, ringShare } from './utils';

const DIMENSIONS: Instrument = {
  id: 'icanstudy-dimensions',
  label: 'iCanStudy learning dimensions',
  value_kind: 'number',
  scale_min: 0,
  scale_max: 100,
  note: '',
  axes: [
    { axis: 'dimension', name: 'mindset', label: 'Mindset' },
    { axis: 'dimension', name: 'retrieval', label: 'Retrieval' },
    { axis: 'dimension', name: 'self_management', label: 'Self-management' },
  ],
};

const LABELS: Instrument = {
  id: 'self-described',
  label: 'Self-described labels',
  value_kind: 'label',
  scale_min: null,
  scale_max: null,
  note: '',
  axes: [{ axis: 'label', name: 'mbti', label: 'MBTI' }],
};

describe('buildScores', () => {
  it('keeps a supplied zero and drops a blank field', () => {
    const { scores, error } = buildScores(DIMENSIONS, { 'dimension/mindset': '0', 'dimension/retrieval': '' }, {});
    expect(error).toBeNull();
    // A blank input is an absence; a typed 0 is a real score. Collapsing the two
    // is the single most damaging bug this screen could have.
    expect(scores).toEqual([{ axis: 'dimension', name: 'mindset', value: 0, value_label: '', note: '' }]);
  });

  it('keeps every axis that was filled in, including decimals', () => {
    const { scores } = buildScores(DIMENSIONS, { 'dimension/mindset': '84', 'dimension/retrieval': '43.5' }, {});
    expect(scores.map((score) => [score.name, score.value])).toEqual([
      ['mindset', 84],
      ['retrieval', 43.5],
    ]);
  });

  it('refuses text in a numeric field', () => {
    const { scores, error } = buildScores(DIMENSIONS, { 'dimension/mindset': 'high' }, {});
    expect(scores).toEqual([]);
    expect(error).toContain('Mindset');
  });

  it('refuses an assessment with nothing in it', () => {
    expect(buildScores(DIMENSIONS, {}, {}).error).toContain('at least one score');
    expect(buildScores(LABELS, {}, {}).error).toContain('at least one label');
  });

  it('sends labels as labels, never as numbers', () => {
    const { scores } = buildScores(LABELS, {}, { 'label/mbti': '  INTJ  ' });
    expect(scores).toEqual([
      { axis: 'label', name: 'mbti', value: null, value_label: 'INTJ', note: '' },
    ]);
  });

  it('ignores stray keys that belong to another instrument', () => {
    const { scores } = buildScores(DIMENSIONS, { 'dimension/mindset': '50', 'preference/visual': '25' }, {});
    expect(scores).toHaveLength(1);
  });
});

describe('formatScore', () => {
  it('carries the scale with the number', () => {
    expect(formatScore(43, 0, 100)).toBe('43 / 100');
    expect(formatScore(4.2, 0, 5)).toBe('4.2 / 5');
    expect(formatScore(17, 0, 20)).toBe('17 / 20');
  });

  it('states a non-zero minimum instead of pretending the scale starts at zero', () => {
    expect(formatScore(3, 1, 5)).toBe('3 on 1–5');
  });

  it('never renders a missing value as a number', () => {
    // Guard against a future refactor passing 0 for "unknown".
    expect(formatScore(0, 0, 100)).toBe('0 / 100');
  });
});

describe('ringShare', () => {
  it('maps a score onto its own scale', () => {
    expect(ringShare(43, 0, 100)).toBeCloseTo(0.43);
    expect(ringShare(4.2, 0, 5)).toBeCloseTo(0.84);
    expect(ringShare(17, 0, 20)).toBeCloseTo(0.85);
  });

  it('clamps rather than drawing outside the ring', () => {
    expect(ringShare(140, 0, 100)).toBe(1);
    expect(ringShare(-5, 0, 100)).toBe(0);
  });

  it('refuses to divide by a broken scale', () => {
    expect(ringShare(50, 100, 100)).toBe(0);
    expect(ringShare(50, 0, 0)).toBe(0);
    expect(ringShare(Number.NaN, 0, 100)).toBe(0);
  });

  it('keeps a supplied zero at the start of the ring, not at a third of it', () => {
    expect(ringShare(0, 0, 100)).toBe(0);
  });
});
