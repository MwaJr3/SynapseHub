import { useMemo, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import {
  boardFromFen,
  legalTargets,
  MARKER_SYMBOL,
  nextFocusSquare,
  PIECE_NAMES,
  sideToMove,
  squareAt,
  type MistakeClass,
} from './gameModel';

const GLYPH: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' };
type Promo = 'q' | 'r' | 'b' | 'n';

export interface BoardProps {
  fen: string;
  orientation?: 'w' | 'b';
  interactive?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  /** Mistake marker shown on a square (a text symbol, never colour alone). */
  marker?: { square: Square; cls: MistakeClass } | null;
  /** Squares to highlight as a hint (e.g. key squares in endgames). */
  highlights?: Square[];
  onMove?: (from: Square, to: Square, promotion?: Promo) => void;
  /** Square-picking mode (strategy exercises): clicking toggles instead of moving. */
  onSquare?: (sq: Square) => void;
  picked?: Square[];
  label?: string;
}

/**
 * Click- and keyboard-operable board. Legality comes from chess.js; arrow keys
 * move a roving focus, Enter/Space selects and moves, Escape cancels. Motion is
 * limited to colour transitions that are disabled under prefers-reduced-motion.
 */
export function Board({ fen, orientation = 'w', interactive = true, lastMove, marker, highlights = [], onMove, onSquare, picked = [], label }: BoardProps) {
  const squares = useMemo(() => boardFromFen(fen), [fen]);
  const turn = sideToMove(fen);
  const [selected, setSelected] = useState<Square | null>(null);
  const [focusSq, setFocusSq] = useState<Square>(orientation === 'w' ? 'e2' : 'e7');
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [status, setStatus] = useState('');

  const targets = useMemo(() => (selected ? legalTargets(fen, selected) : []), [fen, selected]);
  const targetSet = new Set(targets.map((t) => t.to));

  const pieceAt = (sq: Square) => {
    const idx = [...Array(64).keys()].find((i) => squareAt(i, 'w') === sq);
    return idx === undefined ? null : squares[idx] ?? null;
  };

  const focusSquare = (sq: Square) => {
    setFocusSq(sq);
    refs.current[sq]?.focus();
  };

  function activate(sq: Square) {
    if (!interactive) return;
    if (onSquare) { onSquare(sq); return; }
    if (selected && targetSet.has(sq)) {
      const t = targets.find((x) => x.to === sq);
      if (t?.promotion) {
        setPromo({ from: selected, to: sq });
        setStatus('Choose a promotion piece');
        return;
      }
      setSelected(null);
      onMove?.(selected, sq);
      return;
    }
    const p = pieceAt(sq);
    if (p && p.color === turn && legalTargets(fen, sq).length > 0) {
      setSelected(sq);
      setStatus(`${sq} selected, ${legalTargets(fen, sq).length} legal moves`);
    } else {
      setSelected(null);
      setStatus(p ? `${sq}: no legal moves for this piece` : '');
    }
  }

  function onKey(e: React.KeyboardEvent, sq: Square) {
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      focusSquare(nextFocusSquare(sq, e.key, orientation));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate(sq);
    } else if (e.key === 'Escape') {
      setSelected(null);
      setPromo(null);
      setStatus('Selection cleared');
    }
  }

  const order = [...Array(64).keys()];
  return (
    <div className="board-wrap">
      {label ? <p className="mb-1 text-sm text-slate-300">{label}</p> : null}
      <div className="board" role="grid" aria-label="Chess board" aria-rowcount={8} aria-colcount={8}>
        {order.map((i) => {
          const sq = squareAt(i, orientation);
          const wIdx = order.find((k) => squareAt(k, 'w') === sq) as number;
          const piece = squares[wIdx] ?? null;
          const dark = (Math.floor(wIdx / 8) + (wIdx % 8)) % 2 === 1;
          const isSel = selected === sq || picked.includes(sq);
          const isTarget = targetSet.has(sq);
          const isLast = !!lastMove && (lastMove.from === sq || lastMove.to === sq);
          const hint = highlights.includes(sq);
          const mk = marker && marker.square === sq ? marker : null;
          const desc =
            `${sq}, ${piece ? `${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : 'empty'}` +
            (isSel ? ', selected' : '') +
            (isTarget ? ', legal destination' : '') +
            (mk ? `, ${mk.cls} marker` : '');
          return (
            <button
              key={sq}
              ref={(el) => {
                refs.current[sq] = el;
              }}
              type="button"
              role="gridcell"
              aria-label={desc}
              aria-selected={isSel}
              tabIndex={focusSq === sq ? 0 : -1}
              onFocus={() => setFocusSq(sq)}
              onClick={() => activate(sq)}
              onKeyDown={(e) => onKey(e, sq)}
              data-square={sq}
              className={['sq', dark ? 'sq-dark' : 'sq-light', isSel ? 'sq-sel' : '', isTarget ? 'sq-target' : '', isLast ? 'sq-last' : '', hint ? 'sq-hint' : ''].join(' ')}
            >
              {piece ? (
                <span aria-hidden="true" className={piece.color === 'w' ? 'pc-w' : 'pc-b'}>
                  {GLYPH[piece.type]}
                </span>
              ) : null}
              {mk ? (
                <span aria-hidden="true" className={`mk mk-${mk.cls}`}>
                  {MARKER_SYMBOL[mk.cls]}
                </span>
              ) : null}
              {isTarget && !piece ? <span aria-hidden="true" className="dot" /> : null}
            </button>
          );
        })}
      </div>
      {promo ? (
        <div role="dialog" aria-label="Choose promotion piece" className="mt-2 flex gap-2">
          {(['q', 'r', 'b', 'n'] as Promo[]).map((p, idx) => (
            <button
              key={p}
              className="btn-ghost"
              autoFocus={idx === 0}
              onClick={() => {
                const m = promo;
                setPromo(null);
                setSelected(null);
                onMove?.(m.from, m.to, p);
              }}
            >
              {PIECE_NAMES[p]}
            </button>
          ))}
          <button className="btn-ghost" onClick={() => setPromo(null)}>
            Cancel
          </button>
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
