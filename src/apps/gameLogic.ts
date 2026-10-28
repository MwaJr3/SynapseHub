export type Mark = 'X' | 'O' | null;

export function ticTacToeResult(board: Mark[]): Mark | 'draw' | null {
  const lines: Array<[number, number, number]> = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  for (const [a, b, c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  return board.every(Boolean) ? 'draw' : null;
}

export type Disc = 0 | 1 | 2;
export function connectFourWinner(board: Disc[][]): Disc {
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < board.length; row++) for (let col = 0; col < (board[row]?.length ?? 0); col++) {
    const player = board[row]?.[col] ?? 0;
    if (!player) continue;
    for (const [dr, dc] of directions) {
      let count = 1;
      for (let step = 1; step < 4; step++) if (board[row + dr * step]?.[col + dc * step] === player) count++; else break;
      if (count === 4) return player;
    }
  }
  return 0;
}

export function shuffled<T>(values: readonly T[], random = Math.random): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
