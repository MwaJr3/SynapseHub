import { describe, expect, it } from 'vitest';
import { classificationTone, formatEval, materialLabel } from './utils';

describe('classificationTone', () => {
  it('maps engine classifications', () => {
    expect(classificationTone('blunder')).toContain('rose');
    expect(classificationTone('mistake')).toContain('amber');
    expect(classificationTone('inaccuracy')).toContain('sky');
  });
});

describe('formatEval', () => {
  it('converts centipawns and handles null', () => {
    expect(formatEval(150)).toBe('1.50');
    expect(formatEval(null)).toBe('—');
  });
});

describe('materialLabel', () => {
  it('describes balances without implying safety', () => {
    expect(materialLabel(0)).toBe('level');
    expect(materialLabel(3)).toBe('White +3');
    expect(materialLabel(-9)).toBe('Black +9');
  });
});
