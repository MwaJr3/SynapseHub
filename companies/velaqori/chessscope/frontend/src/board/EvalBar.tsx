import { evalBarFraction, formatScore, scoreToCp, type EngineScore } from '../engine/uci';

/** Vertical evaluation bar. Always labelled with its source; absent score shows an explicit message. */
export function EvalBar({ score, source }: { score: EngineScore | null; source: string | null }) {
  if (!score) {
    return (
      <div className="evalbar-empty text-xs text-slate-400" role="status">
        No evaluation{source ? '' : ' (no engine ran)'}
      </div>
    );
  }
  const frac = evalBarFraction(scoreToCp(score));
  const text = formatScore(score);
  const who = scoreToCp(score) === 0 ? 'equal' : scoreToCp(score) > 0 ? 'White is better' : 'Black is better';
  return (
    <div className="flex items-stretch gap-2">
      <div
        className="evalbar"
        role="img"
        aria-label={`Evaluation ${text}, ${who}. Source: ${source ?? 'unknown'}`}
      >
        <div className="evalbar-white" style={{ height: `${(frac * 100).toFixed(1)}%` }} />
      </div>
      <div className="text-xs text-slate-300">
        <div className="font-mono text-sm">{text}</div>
        <div className="max-w-[10rem] text-slate-400">{source}</div>
      </div>
    </div>
  );
}
