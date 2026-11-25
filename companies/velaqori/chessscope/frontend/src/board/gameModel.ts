/** Pure chess game model on top of chess.js (rules) - no React, fully unit-tested. */
import { Chess, type Square } from 'chess.js';

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const MAX_INPUT_CHARS = 200_000;

export interface Ply {
  san: string;
  uci: string;
  from: Square;
  to: Square;
  color: 'w' | 'b';
  fen: string; // position after the move
}

export interface ParsedGame {
  startFen: string;
  plies: Ply[];
  headers: Record<string, string>;
  source: 'fen' | 'pgn' | 'moves';
}

export class InputError extends Error {}

const FEN_SHAPE = /^\s*([prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+\s+[wb]\s+/;

function toPly(m: { san: string; from: string; to: string; promotion?: string; color: 'w' | 'b'; after: string }): Ply {
  return {
    san: m.san,
    uci: `${m.from}${m.to}${m.promotion ?? ''}`,
    from: m.from as Square,
    to: m.to as Square,
    color: m.color,
    fen: m.after,
  };
}

/** Accepts a FEN or a PGN/movetext. Throws InputError with a human reason. */
export function parseInput(text: string): ParsedGame {
  const input = text.trim();
  if (!input) throw new InputError('Nothing to load: paste a FEN or a PGN.');
  if (input.length > MAX_INPUT_CHARS) throw new InputError('Input is too large (limit 200 000 characters).');
  if (FEN_SHAPE.test(input) && !input.includes('[') && !/\n/.test(input)) {
    try {
      const chess = new Chess(input);
      return { startFen: chess.fen(), plies: [], headers: {}, source: 'fen' };
    } catch (e) {
      throw new InputError(`Invalid FEN: ${e instanceof Error ? e.message : 'unrecognised position'}`);
    }
  }
  const chess = new Chess();
  try {
    chess.loadPgn(input);
  } catch (e) {
    throw new InputError(`Invalid PGN: ${e instanceof Error ? e.message : 'could not parse'}`);
  }
  const headers = { ...chess.getHeaders() } as Record<string, string>;
  const startFen = headers['FEN'] && headers['SetUp'] === '1' ? headers['FEN'] : START_FEN;
  const plies = chess.history({ verbose: true }).map(toPly);
  if (plies.length === 0) throw new InputError('The PGN contains no moves.');
  return { startFen, plies, headers, source: headers['Event'] !== undefined || /\[/.test(input) ? 'pgn' : 'moves' };
}

/** Legal destination squares for the piece on `from` in `fen`. */
export function legalTargets(fen: string, from: Square): { to: Square; promotion: boolean }[] {
  const chess = new Chess(fen);
  const seen = new Map<string, boolean>();
  for (const m of chess.moves({ square: from, verbose: true })) {
    seen.set(m.to, (seen.get(m.to) ?? false) || m.promotion !== undefined);
  }
  return [...seen.entries()].map(([to, promotion]) => ({ to: to as Square, promotion }));
}

/** Play a move from a FEN. Returns null when illegal (never throws). */
export function playMove(fen: string, from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n'): Ply | null {
  const chess = new Chess(fen);
  try {
    const m = chess.move({ from, to, promotion });
    return toPly({ ...m, after: chess.fen() });
  } catch {
    return null;
  }
}

export function sideToMove(fen: string): 'w' | 'b' {
  return (fen.split(' ')[1] as 'w' | 'b') ?? 'w';
}

export function gameStatus(fen: string): { over: boolean; text: string } {
  const chess = new Chess(fen);
  if (chess.isCheckmate()) return { over: true, text: `Checkmate - ${chess.turn() === 'w' ? 'Black' : 'White'} wins` };
  if (chess.isStalemate()) return { over: true, text: 'Stalemate - draw' };
  if (chess.isInsufficientMaterial()) return { over: true, text: 'Draw - insufficient material' };
  if (chess.isThreefoldRepetition()) return { over: true, text: 'Draw - threefold repetition' };
  if (chess.isDraw()) return { over: true, text: 'Draw' };
  return { over: false, text: chess.inCheck() ? 'Check' : '' };
}

export function exportFen(fen: string): string {
  return fen;
}

export function exportPgn(game: ParsedGame, extraHeaders: Record<string, string> = {}): string {
  const chess = new Chess();
  const custom = game.startFen !== START_FEN;
  if (custom) chess.load(game.startFen);
  for (const [k, v] of Object.entries({ ...game.headers, ...extraHeaders })) chess.setHeader(k, v);
  if (custom) {
    chess.setHeader('SetUp', '1');
    chess.setHeader('FEN', game.startFen);
  }
  for (const p of game.plies) chess.move(p.san);
  return chess.pgn();
}

export interface ParsedFen {
  rows: ({ color: 'w' | 'b'; type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' } | null)[];
}

/** 64 squares, a8 first (rank 8 to 1, file a to h). */
export function boardFromFen(fen: string): ParsedFen['rows'] {
  const out: ParsedFen['rows'] = [];
  for (const ch of (fen.split(' ')[0] ?? '')) {
    if (ch === '/') continue;
    if (/[1-8]/.test(ch)) {
      for (let i = 0; i < Number(ch); i++) out.push(null);
    } else {
      out.push({ color: ch === ch.toUpperCase() ? 'w' : 'b', type: ch.toLowerCase() as 'p' });
    }
  }
  return out;
}

const FILES = 'abcdefgh';
export function squareAt(index: number, orientation: 'w' | 'b'): Square {
  const i = orientation === 'w' ? index : 63 - index;
  return `${FILES[i % 8]}${8 - Math.floor(i / 8)}` as Square;
}

/** Roving-focus arrow-key navigation on screen coordinates (orientation-aware). */
export function nextFocusSquare(sq: Square, key: string, orientation: 'w' | 'b'): Square {
  let file = FILES.indexOf(sq[0] as string);
  let rank = Number(sq[1]);
  const flip = orientation === 'w' ? 1 : -1;
  if (key === 'ArrowRight') file += flip;
  else if (key === 'ArrowLeft') file -= flip;
  else if (key === 'ArrowUp') rank += flip;
  else if (key === 'ArrowDown') rank -= flip;
  file = Math.max(0, Math.min(7, file));
  rank = Math.max(1, Math.min(8, rank));
  return `${FILES[file]}${rank}` as Square;
}

export const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' } as const;

export type MistakeClass = 'inaccuracy' | 'mistake' | 'blunder';
export const MARKER_SYMBOL: Record<MistakeClass, string> = { inaccuracy: '?!', mistake: '?', blunder: '??' };
