import { useEffect, useMemo, useRef, useState } from 'react';
import type { Square } from 'chess.js';
import type { Analysis } from '../api';
import { BrowserEngine, ENGINE_SOURCE, browserEngineSupported } from '../engine/browserEngine';
import type { EngineScore } from '../engine/uci';
import { Board } from './Board';
import { EvalBar } from './EvalBar';
import { MoveList } from './MoveList';
import {
  exportPgn,
  gameStatus,
  InputError,
  parseInput,
  playMove,
  sideToMove,
  type MistakeClass,
  type ParsedGame,
  type Ply,
} from './gameModel';

/** Replayable, explorable game with eval bar, mistake markers and FEN/PGN import/export. */
export function GameViewer({
  initialText,
  analysis,
  allowImport = true,
}: {
  initialText?: string;
  analysis?: Analysis | null;
  allowImport?: boolean;
}) {
  const [game, setGame] = useState<ParsedGame | null>(() => {
    try {
      return initialText ? parseInput(initialText) : null;
    } catch {
      return null;
    }
  });
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [ply, setPly] = useState(0);
  const [variation, setVariation] = useState<Ply[] | null>(null);
  const [orientation, setOrientation] = useState<'w' | 'b'>('w');
  const [live, setLive] = useState<{ score: EngineScore; source: string } | null>(null);
  const [engineMsg, setEngineMsg] = useState('');
  const engine = useRef<BrowserEngine | null>(null);
  useEffect(() => () => engine.current?.dispose(), []);

  const startFen = game?.startFen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const plies = game?.plies ?? [];
  const mainFen = ply === 0 ? startFen : (plies[ply - 1]?.fen ?? startFen);
  const fen = variation && variation.length ? (variation[variation.length - 1] as Ply).fen : mainFen;
  const lastPly: Ply | null = variation && variation.length ? (variation[variation.length - 1] as Ply) : ply > 0 ? (plies[ply - 1] ?? null) : null;

  const classes = useMemo(() => {
    const out: Record<number, MistakeClass> = {};
    for (const m of analysis?.moves ?? []) {
      if (m.classification === 'inaccuracy' || m.classification === 'mistake' || m.classification === 'blunder') out[m.ply] = m.classification;
    }
    return out;
  }, [analysis]);

  const stored = !variation && ply > 0 ? analysis?.moves[ply - 1] : null;
  const storedScore: EngineScore | null =
    stored && stored.engine_eval_cp !== null && analysis?.engine.available ? { cp: stored.engine_eval_cp, mate: null } : null;
  const evalScore = live ?? (storedScore ? { score: storedScore, source: analysis?.engine.name ? `stockfish (server): ${analysis.engine.name}` : 'server engine' } : null);
  const cls = !variation && ply > 0 ? classes[ply] : undefined;
  const status = gameStatus(fen);

  function go(n: number) {
    setVariation(null);
    setLive(null);
    setPly(Math.max(0, Math.min(plies.length, n)));
  }

  function onMove(from: Square, to: Square, promotion?: 'q' | 'r' | 'b' | 'n') {
    const played = playMove(fen, from, to, promotion);
    if (!played) return;
    setLive(null);
    if (!variation) {
      const next = plies[ply];
      if (next && next.uci === played.uci) {
        setPly(ply + 1);
        return;
      }
      if (!game) setGame({ startFen, plies: [], headers: {}, source: 'fen' });
      if (!next && game) {
        // extend the main line when at its end
        setGame({ ...game, plies: [...plies, played] });
        setPly(ply + 1);
        return;
      }
    }
    setVariation([...(variation ?? []), played]);
  }

  function load(src: string) {
    try {
      const g = parseInput(src);
      setGame(g);
      setPly(0);
      setVariation(null);
      setLive(null);
      setError('');
    } catch (e) {
      setError(e instanceof InputError ? e.message : 'Could not load this input.');
    }
  }

  async function evaluate() {
    const support = browserEngineSupported();
    if (!support.ok) return setEngineMsg(`Engine unavailable: ${support.reason}`);
    setEngineMsg('Evaluating...');
    try {
      engine.current ??= new BrowserEngine();
      const r = await engine.current.analyse(fen, { depth: 12, movetimeMs: 1500 });
      if (r.info) {
        setLive({ score: r.info.score, source: r.source });
        setEngineMsg(r.best ? `Engine suggests ${r.best} (depth ${r.info.depth}).` : '');
      } else setEngineMsg('Engine returned no evaluation.');
    } catch (e) {
      setEngineMsg(`Engine unavailable: ${e instanceof Error ? e.message : 'error'}`);
    }
  }

  async function copy(value: string, what: string) {
    try {
      await navigator.clipboard.writeText(value);
      setEngineMsg(`${what} copied.`);
    } catch {
      setEngineMsg(`Could not copy automatically. Select the ${what} text and copy it.`);
    }
  }

  function downloadPgn() {
    if (!game) return;
    const blob = new Blob([exportPgn({ ...game, plies })], { type: 'application/x-chess-pgn' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'game.pgn';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const mistakeList = Object.entries(classes).map(([p, c]) => ({ ply: Number(p), cls: c, san: plies[Number(p) - 1]?.san ?? '' }));

  return (
    <div className="space-y-3">
      {allowImport ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(text);
          }}
        >
          <label className="text-xs text-slate-400" htmlFor="board-import">
            Load a FEN or PGN
          </label>
          <textarea id="board-import" className="input h-20 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
          <button className="btn-ghost" disabled={!text.trim()}>
            Load
          </button>
          {error ? (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          ) : null}
        </form>
      ) : null}

      <div className="flex flex-wrap items-start gap-4">
        <EvalBar score={evalScore?.score ?? null} source={evalScore?.source ?? null} />
        <div className="w-full max-w-[34rem] flex-1">
          <Board
            fen={fen}
            orientation={orientation}
            lastMove={lastPly ? { from: lastPly.from, to: lastPly.to } : null}
            marker={cls && lastPly ? { square: lastPly.to, cls } : null}
            onMove={onMove}
            label={`${sideToMove(fen) === 'w' ? 'White' : 'Black'} to move${status.text ? ` - ${status.text}` : ''}`}
          />
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Replay controls">
            <button className="btn-ghost" onClick={() => go(0)} aria-label="First position">|&lt;</button>
            <button className="btn-ghost" onClick={() => go(ply - 1)} aria-label="Previous move" disabled={ply === 0 && !variation}>&lt;</button>
            <button className="btn-ghost" onClick={() => go(ply + 1)} aria-label="Next move" disabled={ply >= plies.length && !variation}>&gt;</button>
            <button className="btn-ghost" onClick={() => go(plies.length)} aria-label="Last position">&gt;|</button>
            <button className="btn-ghost" onClick={() => setOrientation(orientation === 'w' ? 'b' : 'w')}>Flip board</button>
            <button className="btn-ghost" onClick={() => void evaluate()}>Evaluate (browser engine)</button>
          </div>
          {variation ? (
            <p className="mt-2 text-xs text-amber-300" role="status">
              Exploring a variation (not part of the game or saved). <button className="underline" onClick={() => go(ply)}>Return to the game</button>
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-400" role="status" aria-live="polite">{engineMsg}</p>
          <p className="mt-1 text-xs text-slate-500">Evaluation source: {ENGINE_SOURCE} when you press Evaluate; otherwise the stored server analysis, if any.</p>
        </div>
      </div>

      {plies.length > 0 ? (
        <div className="space-y-2">
          <MoveList plies={plies} current={variation ? -1 : ply} onSelect={go} classes={classes} />
          {mistakeList.length > 0 ? (
            <p className="text-xs text-slate-300">
              Mistake markers (from engine drop, a suggestion not a verdict):{' '}
              {mistakeList.map((m, i) => (
                <button key={m.ply} className="underline" onClick={() => go(m.ply)}>
                  {i ? ', ' : ''}ply {m.ply} {m.san} ({m.cls})
                </button>
              ))}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => void copy(fen, 'FEN')}>Copy FEN</button>
        <button className="btn-ghost" disabled={!game || plies.length === 0} onClick={() => game && void copy(exportPgn({ ...game, plies }), 'PGN')}>Copy PGN</button>
        <button className="btn-ghost" disabled={!game || plies.length === 0} onClick={downloadPgn}>Download PGN</button>
      </div>
      <code className="block break-all text-xs text-slate-400" aria-label="Current FEN">{fen}</code>
    </div>
  );
}
