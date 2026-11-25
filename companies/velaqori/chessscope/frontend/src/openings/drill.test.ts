import { describe, expect, it } from 'vitest';
import { fenAfter, isLegalUci, opponentReply } from './drill';

describe('drill helpers', () => {
  it('replays legal lines and rejects illegal ones', () => {
    expect(fenAfter(['e2e4', 'e7e5'])).toContain('4P3');
    expect(fenAfter(['e2e5'])).toBeNull();
  });
  it('schedules opponent replies by side', () => {
    const opp = ['e7e5', 'b8c6'];
    expect(opponentReply(opp, 1, 'white')).toBe('e7e5');
    expect(opponentReply(opp, 0, 'black')).toBe('e7e5');
    expect(opponentReply(opp, 1, 'black')).toBe('b8c6');
  });
  it('checks legality', () => {
    expect(isLegalUci('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e4')).toBe(true);
    expect(isLegalUci('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2e5')).toBe(false);
  });
});
