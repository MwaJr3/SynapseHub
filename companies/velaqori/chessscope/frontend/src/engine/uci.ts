/** Pure UCI helpers (no worker, no DOM) so they can be unit-tested. */

export interface EngineScore {
  /** centipawns from White's point of view, or null when a mate score is reported */
  cp: number | null;
  /** moves to mate (positive: White mates), or null */
  mate: number | null;
}

export interface EngineInfo {
  depth: number;
  score: EngineScore;
  pv: string[];
}

export const MAX_DEPTH = 20;
export const MAX_MOVETIME_MS = 5000;

export function clampDepth(depth: number): number {
  if (!Number.isFinite(depth)) return 12;
  return Math.max(1, Math.min(MAX_DEPTH, Math.round(depth)));
}

/** Parse one `info ...` line. `whiteToMove` converts side-to-move scores to White's view. */
export function parseInfoLine(line: string, whiteToMove: boolean): EngineInfo | null {
  if (!line.startsWith('info ') || line.includes(' string ')) return null;
  const tok = line.trim().split(/\s+/);
  const di = tok.indexOf('depth');
  const si = tok.indexOf('score');
  if (di < 0 || si < 0) return null;
  const kind = tok[si + 1];
  const raw = Number(tok[si + 2]);
  if ((kind !== 'cp' && kind !== 'mate') || !Number.isFinite(raw)) return null;
  const sign = whiteToMove ? 1 : -1;
  const pvi = tok.indexOf('pv');
  return {
    depth: Number(tok[di + 1]),
    score: kind === 'cp' ? { cp: raw * sign, mate: null } : { cp: null, mate: raw * sign },
    pv: pvi >= 0 ? tok.slice(pvi + 1) : [],
  };
}

export function parseBestMove(line: string): string | null {
  const m = /^bestmove\s+(\S+)/.exec(line);
  return m && m[1] !== '(none)' ? (m[1] as string) : null;
}

/** Centipawn-equivalent number for bars/charts; mates saturate at +-10000. */
export function scoreToCp(s: EngineScore): number {
  if (s.mate !== null) return s.mate > 0 ? 10000 - s.mate : -10000 - s.mate;
  return s.cp ?? 0;
}

export function formatScore(s: EngineScore): string {
  if (s.mate !== null) return `${s.mate > 0 ? '+' : '-'}M${Math.abs(s.mate)}`;
  const v = (s.cp ?? 0) / 100;
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
}

/** Win-percentage style squash used for the eval bar (0..1 for White). */
export function evalBarFraction(cp: number): number {
  return 1 / (1 + Math.exp(-cp / 400));
}
