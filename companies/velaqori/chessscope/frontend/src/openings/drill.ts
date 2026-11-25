import { Chess } from 'chess.js';

/** Convert a UCI move list to the FEN after the last move; null if any move is illegal. */
export function fenAfter(ucis: string[]): string | null {
  const chess = new Chess();
  for (const u of ucis) {
    try {
      chess.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
    } catch {
      return null;
    }
  }
  return chess.fen();
}

/**
 * Scripted opponent move to play after the learner has made `userCount` moves.
 * White learner: opponent replies are opponent[userCount-1]; black learner moves second so
 * opponent[0] is played before any user move, i.e. opponent[userCount].
 */
export function opponentReply(opponent: string[], userCount: number, side: 'white' | 'black'): string | undefined {
  return side === 'white' ? opponent[userCount - 1] : opponent[userCount];
}

export function isLegalUci(fen: string, uci: string): boolean {
  try {
    new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return true;
  } catch {
    return false;
  }
}
