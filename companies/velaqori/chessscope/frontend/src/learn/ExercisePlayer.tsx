import { useEffect, useState } from 'react';
import type { Square } from 'chess.js';
import { Board } from '../board/Board';
import { Card, ErrorBanner } from '../ui';

export interface PlayerExercise {
  id: string;
  title: string;
  fen: string;
  side_to_move: 'white' | 'black';
  highlights: string[];
  concept: string;
  verification_text?: string;
  hint?: string;
}
export interface Verdict {
  accepted: boolean;
  san: string;
  reply: { uci: string; san: string } | null;
  fen_after: string;
  solved: boolean;
  why: string;
  explanation: string | null;
}

/** Shared interactive exercise: the server validates every move and returns the scripted reply. */
export function ExercisePlayer({ ex, send, onSolved }: {
  ex: PlayerExercise;
  send: (fen: string, move: string) => Promise<Verdict>;
  onSolved?: () => void;
}) {
  const [fen, setFen] = useState(ex.fen);
  const [log, setLog] = useState('');
  const [done, setDone] = useState(false);
  const [explain, setExplain] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setFen(ex.fen); setLog(''); setDone(false); setExplain(null); setShowHint(false); setError(''); }, [ex.id, ex.fen]);

  async function onMove(from: Square, to: Square, promo?: string) {
    if (done) return;
    try {
      const v = await send(fen, `${from}${to}${promo ?? ''}`);
      if (!v.accepted) { setLog(`${v.san}: not accepted. ${v.why}`); setExplain(v.explanation); return; }
      setFen(v.fen_after);
      setLog(`${v.san}${v.reply ? `, reply ${v.reply.san}` : ''}${v.solved ? '. Solved.' : '. Good, keep going.'}`);
      if (v.solved) { setDone(true); setExplain(v.explanation); onSolved?.(); }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Move failed');
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Board fen={fen} orientation={ex.side_to_move === 'white' ? 'w' : 'b'} interactive={!done} highlights={ex.highlights as Square[]}
        onMove={onMove} label={`${ex.title}. ${ex.side_to_move} to move`} />
      <Card title={ex.title}>
        <p className="text-sm text-slate-300">{ex.concept}. {ex.side_to_move === 'white' ? 'White' : 'Black'} to move.</p>
        {error ? <ErrorBanner message={error} /> : null}
        <p role="status" className="mt-2 text-sm text-slate-100">{log}</p>
        <div className="mt-2 flex gap-2">
          <button className="btn" onClick={() => setShowHint(true)}>Hint</button>
          <button className="btn" onClick={() => { setFen(ex.fen); setLog(''); setDone(false); setExplain(null); }}>Reset</button>
        </div>
        {showHint && ex.hint ? <p className="mt-2 text-sm text-amber-200">{ex.hint}</p> : null}
        {explain ? <p className="mt-2 text-sm text-slate-300">{explain}</p> : null}
        {ex.verification_text ? <p className="mt-2 text-xs text-slate-400">Verification: {ex.verification_text}</p> : null}
        <p className="mt-1 text-xs text-slate-500">Original ChessScope explanation; positions are standard textbook setups.</p>
      </Card>
    </div>
  );
}
