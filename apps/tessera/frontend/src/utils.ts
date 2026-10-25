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
