import { describe, expect, it } from 'vitest';
import { formatNumber, formatValue, parseNumber } from './utils';

describe('formatNumber', () => {
  it('keeps integers plain and rounds long floats', () => {
    expect(formatNumber(5)).toBe('5');
    expect(formatNumber(1 / 3)).toBe('0.333333');
  });
});

describe('formatValue', () => {
  it('formats scalars and current maps', () => {
    expect(formatValue(3.5, 'V')).toBe('3.5 V');
    expect(formatValue({ I1: 0.05, I2: 0 }, 'A')).toBe('I1 = 0.05 A · I2 = 0 A');
  });
});

describe('parseNumber', () => {
  it('rejects non-numeric input', () => {
    expect(parseNumber('12.5')).toBe(12.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });
});
