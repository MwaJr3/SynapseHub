import { MARKER_SYMBOL, type MistakeClass, type Ply } from './gameModel';

export function MoveList({
  plies,
  current,
  onSelect,
  classes,
  startMoveNumber = 1,
  startColor = 'w',
}: {
  plies: Ply[];
  current: number; // 0 = start position, n = after ply n
  onSelect: (ply: number) => void;
  classes?: Record<number, MistakeClass>;
  startMoveNumber?: number;
  startColor?: 'w' | 'b';
}) {
  const label = (p: Ply, i: number) => {
    const n = startMoveNumber + Math.floor((i + (startColor === 'b' ? 1 : 0)) / 2);
    const prefix = p.color === 'w' ? `${n}. ` : i === 0 ? `${n}... ` : '';
    return prefix + p.san;
  };
  return (
    <ol className="flex flex-wrap gap-1 text-sm" aria-label="Move list">
      {plies.map((p, i) => {
        const cls = classes?.[i + 1];
        return (
          <li key={i}>
            <button
              type="button"
              aria-current={current === i + 1 ? 'step' : undefined}
              onClick={() => onSelect(i + 1)}
              className={`rounded px-1.5 py-1 font-mono ${current === i + 1 ? 'bg-cyan-800 text-white' : 'hover:bg-slate-800'}`}
            >
              {label(p, i)}
              {cls ? (
                <span className={`ml-0.5 mk-text mk-${cls}`} title={cls}>
                  {MARKER_SYMBOL[cls]}
                  <span className="sr-only"> ({cls})</span>
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
