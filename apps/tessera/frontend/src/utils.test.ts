import { describe, expect, it } from 'vitest';

import { findMoveUci, groupByFamily, isLegalTarget, parseFen, parseUciLine, percent, squareIndex, squareName } from './utils';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const BACK_RANK = '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1';

describe('parseFen', () => {
  it('reads the starting position', () => {
    const board = parseFen(START);
    expect(board).toHaveLength(64);
    expect(board[0]).toEqual({ piece: '♜', colour: 'black' }); // a8 rook
    expect(board[56]).toEqual({ piece: '♖', colour: 'white' }); // a1 rook
    expect(board[60]).toEqual({ piece: '♔', colour: 'white' }); // e1 king
    expect(board[32]).toBeNull(); // a5 empty
  });

  it('reads a sparse position', () => {
    const board = parseFen(BACK_RANK);
    expect(board[6]).toEqual({ piece: '♚', colour: 'black' }); // g8
    expect(board[56]).toEqual({ piece: '♖', colour: 'white' }); // a1
    // king, three pawns, rook, king
expect(board.filter(Boolean)).toHaveLength(6);
  });

  it('refuses a malformed FEN instead of drawing half a board', () => {
    expect(parseFen('not-a-fen')).toEqual(Array(64).fill(null));
    expect(parseFen('8/8/8')).toEqual(Array(64).fill(null));
  });
});

describe('square names', () => {
  it('maps indexes to algebraic squares', () => {
    expect(squareName(0)).toBe('a8');
    expect(squareName(7)).toBe('h8');
    expect(squareName(56)).toBe('a1');
    expect(squareName(63)).toBe('h1');
    expect(squareName(99)).toBe('');
  });

  it('round-trips through squareIndex', () => {
    for (let index = 0; index < 64; index += 1) {
      expect(squareIndex(squareName(index))).toBe(index);
    }
    expect(squareIndex('z9')).toBe(-1);
  });
});

describe('move lookup', () => {
  const legal = ['a1a8', 'a1a2', 'e7e8q'];

  it('finds an exact move', () => {
    expect(findMoveUci(legal, 'a1', 'a8')).toBe('a1a8');
  });

  it('adds the promotion piece when required', () => {
    expect(findMoveUci(legal, 'e7', 'e8')).toBe('e7e8q');
    expect(findMoveUci(legal, 'e7', 'e8', 'n')).toBeNull();
  });

  it('returns null for an illegal pair', () => {
    expect(findMoveUci(legal, 'h1', 'h2')).toBeNull();
  });

  it('reports legal targets for highlighting', () => {
    expect(isLegalTarget(legal, 'a1', 'a8')).toBe(true);
    expect(isLegalTarget(legal, 'a1', 'b8')).toBe(false);
  });
});

describe('percent', () => {
  it('clamps and rounds', () => {
    expect(percent(0.756)).toBe('76%');
    expect(percent(1.4)).toBe('100%');
    expect(percent(-1)).toBe('0%');
  });
});

describe('parseUciLine', () => {
  it('reads a coordinate line', () => {
    expect(parseUciLine('e2e4 e7e5 g1f3').moves).toEqual(['e2e4', 'e7e5', 'g1f3']);
  });

  it('drops move numbers and is case-insensitive', () => {
    expect(parseUciLine('1. E2E4 e7e5 2. G1F3').moves).toEqual(['e2e4', 'e7e5', 'g1f3']);
  });

  it('accepts a promotion suffix', () => {
    expect(parseUciLine('b7b8q').moves).toEqual(['b7b8q']);
  });

  it('reports notation it cannot resolve instead of guessing', () => {
    const parsed = parseUciLine('e2e4 Nf3');
    expect(parsed.moves).toEqual(['e2e4']);
    expect(parsed.rejected).toEqual(['nf3']);
    expect(parsed.note).toContain('nf3');
  });

  it('asks for coordinates when there is nothing usable', () => {
    expect(parseUciLine('   ').moves).toEqual([]);
    expect(parseUciLine('   ').note).toContain('coordinates');
  });

  it('handles commas as separators', () => {
    expect(parseUciLine('e2e4, e7e5').moves).toEqual(['e2e4', 'e7e5']);
  });
});

describe('groupByFamily', () => {
  it('groups and sorts families', () => {
    const grouped = groupByFamily([
      { family: 'Sicilian', name: 'a' },
      { family: 'Queen\'s Gambit', name: 'b' },
      { family: 'Sicilian', name: 'c' },
    ]);
    expect(grouped.map((group) => group.family)).toEqual(['Queen\'s Gambit', 'Sicilian']);
    expect(grouped[1]?.items).toHaveLength(2);
  });

  it('returns nothing for an empty list', () => {
    expect(groupByFamily([])).toEqual([]);
  });
});
