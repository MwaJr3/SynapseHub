import { describe, expect, it } from 'vitest';
import {
  boardFromFen, exportPgn, gameStatus, InputError, legalTargets, nextFocusSquare, parseInput, playMove, squareAt, START_FEN,
} from './gameModel';

describe('rules via chess.js', () => {
  it('allows kingside castling and moves the rook', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1';
    expect(legalTargets(fen, 'e1').map((t) => t.to)).toEqual(expect.arrayContaining(['g1', 'c1']));
    const p = playMove(fen, 'e1', 'g1');
    expect(p?.san).toBe('O-O');
    expect(p?.fen.split(' ')[0]).toBe('r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R4RK1');
  });
  it('refuses castling through check', () => {
    const fen = 'r3k2r/pppppppp/8/8/8/5r2/PPPPP1PP/R3K2R w KQkq - 0 1';
    expect(legalTargets(fen, 'e1').map((t) => t.to)).not.toContain('g1');
  });
  it('handles en passant', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3';
    const p = playMove(fen, 'e5', 'd6');
    expect(p?.san).toBe('exd6');
    expect(p?.fen.split(' ')[0]).toBe('rnbqkbnr/ppp1pppp/3P4/8/8/8/PPPP1PPP/RNBQKBNR');
  });
  it('flags promotion and requires a piece', () => {
    const fen = '8/P6k/8/8/8/8/8/K7 w - - 0 1';
    expect(legalTargets(fen, 'a7')).toEqual([{ to: 'a8', promotion: true }]);
    expect(playMove(fen, 'a7', 'a8', 'n')?.san).toMatch(/^a8=N/);
    expect(playMove(fen, 'a7', 'a8')).toBeNull();
  });
  it('detects stalemate, mate and rejects illegal moves', () => {
    expect(gameStatus('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1').text).toMatch(/Stalemate/);
    expect(gameStatus('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3').text).toMatch(/Checkmate - Black/);
    expect(playMove(START_FEN, 'e2', 'e5')).toBeNull();
  });
});

describe('import / export', () => {
  it('parses PGN with headers and round-trips', () => {
    const g = parseInput('[Event "T"]\n[White "A"]\n[Black "B"]\n\n1. e4 e5 2. Nf3 Nc6 1-0');
    expect(g.plies.map((p) => p.san)).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(g.plies[0]?.uci).toBe('e2e4');
    const again = parseInput(exportPgn(g));
    expect(again.plies.map((p) => p.san)).toEqual(g.plies.map((p) => p.san));
  });
  it('parses FEN and rejects garbage', () => {
    expect(parseInput(START_FEN).plies).toHaveLength(0);
    expect(() => parseInput('')).toThrow(InputError);
    expect(() => parseInput('1. e4 e5 2. Ke4')).toThrow(InputError);
    expect(() => parseInput('x'.repeat(300000))).toThrow(/too large/);
    expect(() => parseInput('8/8/8/8/8/8/8/8 w - - 0 1')).toThrow(InputError);
  });
  it('round-trips a custom start FEN in PGN', () => {
    const g = parseInput('[SetUp "1"]\n[FEN "8/P6k/8/8/8/8/8/K7 w - - 0 1"]\n\n1. a8=Q+ Kg6 *');
    const again = parseInput(exportPgn(g));
    expect(again.startFen).toBe(g.startFen);
    expect(again.plies).toHaveLength(2);
  });
});

describe('board geometry and keyboard', () => {
  it('maps squares by orientation', () => {
    expect(squareAt(0, 'w')).toBe('a8');
    expect(squareAt(0, 'b')).toBe('h1');
    expect(squareAt(63, 'w')).toBe('h1');
  });
  it('arrow keys move focus within bounds, orientation aware', () => {
    expect(nextFocusSquare('e4', 'ArrowUp', 'w')).toBe('e5');
    expect(nextFocusSquare('e4', 'ArrowUp', 'b')).toBe('e3');
    expect(nextFocusSquare('a1', 'ArrowLeft', 'w')).toBe('a1');
    expect(nextFocusSquare('h8', 'ArrowUp', 'w')).toBe('h8');
  });
  it('reads piece placement', () => {
    const b = boardFromFen(START_FEN);
    expect(b).toHaveLength(64);
    expect(b[4]).toEqual({ color: 'b', type: 'k' });
    expect(b[60]).toEqual({ color: 'w', type: 'k' });
  });
});
