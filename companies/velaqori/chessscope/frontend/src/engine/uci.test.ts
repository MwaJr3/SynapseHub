import { describe, expect, it } from 'vitest';
import { clampDepth, evalBarFraction, formatScore, parseBestMove, parseInfoLine, scoreToCp } from './uci';

describe('uci parsing', () => {
  it('parses cp scores and flips for black to move', () => {
    const line = 'info depth 12 seldepth 18 multipv 1 score cp 35 nodes 1 pv e2e4 e7e5';
    expect(parseInfoLine(line, true)?.score).toEqual({ cp: 35, mate: null });
    expect(parseInfoLine(line, false)?.score.cp).toBe(-35);
    expect(parseInfoLine(line, true)?.pv).toEqual(['e2e4', 'e7e5']);
  });
  it('parses mate and ignores string/noise lines', () => {
    expect(parseInfoLine('info depth 5 score mate -2 pv a1a2', true)?.score).toEqual({ cp: null, mate: -2 });
    expect(parseInfoLine('info string NNUE evaluation using x', true)).toBeNull();
    expect(parseInfoLine('readyok', true)).toBeNull();
    expect(parseInfoLine('info depth 3 score cp abc', true)).toBeNull();
  });
  it('parses bestmove', () => {
    expect(parseBestMove('bestmove e2e4 ponder e7e5')).toBe('e2e4');
    expect(parseBestMove('bestmove (none)')).toBeNull();
  });
  it('bounds depth', () => {
    expect(clampDepth(999)).toBe(20);
    expect(clampDepth(-3)).toBe(1);
    expect(clampDepth(NaN)).toBe(12);
  });
  it('formats and squashes scores', () => {
    expect(formatScore({ cp: 123, mate: null })).toBe('+1.23');
    expect(formatScore({ cp: null, mate: -3 })).toBe('-M3');
    expect(scoreToCp({ cp: null, mate: 2 })).toBeGreaterThan(9000);
    expect(evalBarFraction(0)).toBeCloseTo(0.5);
  });
});
