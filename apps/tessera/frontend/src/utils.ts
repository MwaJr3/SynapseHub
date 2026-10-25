/** Pure helpers for the chess board and presentation. No DOM, so they are testable. */

export type Piece = { piece: string; colour: 'white' | 'black' } | null;

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;

const GLYPHS: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

/**
 * Parse the piece-placement field of a FEN into 64 squares, a8 first.
 * Anything malformed yields an empty board rather than a half-drawn one.
 */
export function parseFen(fen: string): Piece[] {
  const placement = fen.trim().split(/\s+/)[0] ?? '';
  const rows = placement.split('/');
  if (rows.length !== 8) return Array<Piece>(64).fill(null);

  const squares: Piece[] = [];
  for (const row of rows) {
    for (const char of row) {
      if (/[1-8]/.test(char)) {
        const blanks = Number(char);
        for (let i = 0; i < blanks; i += 1) squares.push(null);
      } else if (GLYPHS[char]) {
        squares.push({
          piece: GLYPHS[char] ?? '',
          colour: char === char.toUpperCase() ? 'white' : 'black',
        });
      } else {
        return Array<Piece>(64).fill(null);
      }
    }
  }
  return squares.length === 64 ? squares : Array<Piece>(64).fill(null);
}

/** Index (0–63, a8 first) to algebraic square name. */
export function squareName(index: number): string {
  if (index < 0 || index > 63) return '';
  const file = FILES[index % 8];
  const rank = 8 - Math.floor(index / 8);
  return `${file}${rank}`;
}

/** Square name back to index, or -1. */
export function squareIndex(name: string): number {
  if (!/^[a-h][1-8]$/.test(name)) return -1;
  const file = FILES.indexOf(name[0] as (typeof FILES)[number]);
  const rank = Number(name[1]);
  return (8 - rank) * 8 + file;
}

/**
 * Find the UCI string for a from→to pair among the legal moves.
 * Promotion defaults to a queen, which is why the caller may pass `promotion`.
 */
export function findMoveUci(
  legalMoves: readonly string[],
  from: string,
  to: string,
  promotion = 'q',
): string | null {
  const base = `${from}${to}`;
  const exact = legalMoves.find((uci) => uci === base);
  if (exact) return exact;
  const promoted = legalMoves.find((uci) => uci === `${base}${promotion}`);
  return promoted ?? null;
}

/** Is this square a legal destination from the given origin? */
export function isLegalTarget(legalMoves: readonly string[], from: string, to: string): boolean {
  return legalMoves.some((uci) => uci.startsWith(`${from}${to}`));
}

export function percent(value: number): string {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function tierColour(tier: string): string {
  if (tier === 'mastered') return 'var(--good)';
  if (tier === 'developing') return 'var(--warn)';
  if (tier === 'weak') return 'var(--bad)';
  return 'var(--muted)';
}

/** A UCI move: from-square, to-square, optional promotion piece. */
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export interface ParsedLine {
  moves: string[];
  rejected: string[];
  note: string | null;
}

/**
 * Read a typed move line into UCI moves.
 *
 * The opening matcher compares coordinates, not notation, so a line typed as
 * "1. e4 e5" cannot be guessed at — SAN would need a board to resolve. Move
 * numbers are stripped because they carry no information, and anything that is
 * not a coordinate is reported back rather than silently dropped.
 */
export function parseUciLine(input: string): ParsedLine {
  const tokens = input
    .split(/[\s,]+/)
    .map((token) => token.trim().toLowerCase())
    // "1." and "1..." are move numbers; keep everything else for inspection.
    .filter((token) => token.length > 0 && !/^\d+\.*$/.test(token));

  const moves: string[] = [];
  const rejected: string[] = [];
  for (const token of tokens) {
    if (UCI.test(token)) moves.push(token);
    else rejected.push(token);
  }

  let note: string | null = null;
  if (rejected.length > 0) {
    note = `Ignored ${rejected.length} token${rejected.length === 1 ? '' : 's'} that are not coordinate moves: ${rejected.join(', ')}.`;
  } else if (moves.length === 0) {
    note = 'Type the move line in coordinates, for example e2e4 e7e5 g1f3.';
  }
  return { moves, rejected, note };
}

/** Group openings by family, families sorted by name for a stable list. */
export function groupByFamily<T extends { family: string }>(openings: readonly T[]): { family: string; items: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const opening of openings) {
    const bucket = groups.get(opening.family);
    if (bucket) bucket.push(opening);
    else groups.set(opening.family, [opening]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([family, items]) => ({ family, items }));
}

export interface SseEvent {
  name: string;
  data: Record<string, unknown>;
}

export interface SseParse {
  events: SseEvent[];
  rest: string;
}

/**
 * Split a buffered Server-Sent Events stream into complete events.
 *
 * A network chunk can end mid-frame, so anything after the last blank line is
 * returned as `rest` for the next call. Frames without a `data:` line are
 * dropped rather than rendered as empty messages.
 */
export function takeSseEvents(buffer: string): SseParse {
  const events: SseEvent[] = [];
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    let name = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) name = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) continue;
    try {
      const parsed: unknown = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        events.push({ name, data: parsed as Record<string, unknown> });
      }
    } catch {
      // A frame we cannot parse is dropped: showing half a JSON blob as an
      // answer would be worse than showing nothing.
    }
  }
  return { events, rest };
}

/** Read a text field out of an untyped SSE payload without casting to any. */
export function eventText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  return typeof value === 'string' ? value : '';
}
