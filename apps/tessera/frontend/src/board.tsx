import { useMemo, useState } from 'react';

import { findMoveUci, isLegalTarget, parseFen, squareName } from './utils';

interface BoardProps {
  fen: string;
  legalMoves: readonly string[];
  disabled?: boolean;
  onMove: (uci: string) => void;
  /** Instructions shown above the board, e.g. "White to move". */
  label: string;
}

/**
 * Click-to-move board. Every destination offered comes from the server's legal
 * move list, so the UI cannot propose an illegal move — the rules live in the
 * engine, not here.
 */
export function ChessBoard({ fen, legalMoves, disabled = false, onMove, label }: BoardProps) {
  const squares = useMemo(() => parseFen(fen), [fen]);
  const [selected, setSelected] = useState<string | null>(null);

  const handleSquare = (name: string) => {
    if (disabled) return;
    if (selected && isLegalTarget(legalMoves, selected, name)) {
      const uci = findMoveUci(legalMoves, selected, name);
      setSelected(null);
      if (uci) onMove(uci);
      return;
    }
    const ownsSquare = legalMoves.some((uci) => uci.startsWith(name));
    setSelected(ownsSquare ? name : null);
  };

  return (
    <div className="grid gap-2">
      <p className="text-sm text-[color:var(--muted)]" aria-live="polite">
        {label}
      </p>
      <div className="board" role="grid" aria-label="Chess board">
        {squares.map((square, index) => {
          const name = squareName(index);
          const isDark = (Math.floor(index / 8) + (index % 8)) % 2 === 1;
          const isSelected = selected === name;
          const isTarget = selected ? isLegalTarget(legalMoves, selected, name) : false;
          return (
            <button
              key={name}
              type="button"
              role="gridcell"
              aria-label={`${name}${square ? `, ${square.colour} ${square.piece}` : ', empty'}`}
              aria-pressed={isSelected}
              disabled={disabled}
              onClick={() => handleSquare(name)}
              className={[
                'square',
                isDark ? 'dark' : 'light',
                isSelected ? 'selected' : '',
                isTarget ? 'target' : '',
                isTarget && square ? 'occupied' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {square ? square.piece : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
