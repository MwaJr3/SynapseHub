import { useEffect, useState } from 'react';
import type { Square } from 'chess.js';
import { strategyApi, type StrategyExercise, type StrategyLesson } from '../api';
import { Board } from '../board/Board';
import { Card, ErrorBanner } from '../ui';

function Lesson({ l }: { l: StrategyLesson }) {
  const f = l.features;
  return (
    <Card title={l.title}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_1fr]">
        <Board fen={l.fen} interactive={false} label={`${l.title} example position`} />
        <div className="space-y-2 text-sm text-slate-300">
          <p><strong>Structure:</strong> {l.structure}</p>
          <p><strong>Plan:</strong> {l.plan}</p>
          <p><strong>Typical errors:</strong> {l.pitfalls}</p>
          <p className="text-xs text-slate-400">
            Detected in the example (computed): isolated W {f.isolated.white.join(' ') || '-'} / B {f.isolated.black.join(' ') || '-'};
            passed W {f.passed.white.join(' ') || '-'} / B {f.passed.black.join(' ') || '-'};
            outposts W {f.outposts.white.join(' ') || '-'} / B {f.outposts.black.join(' ') || '-'}.
          </p>
        </div>
      </div>
    </Card>
  );
}

function Exercise({ ex, onDone }: { ex: StrategyExercise; onDone: () => void }) {
  const [picked, setPicked] = useState<Square[]>([]);
  const [res, setRes] = useState<string>('');
  const [error, setError] = useState('');
  useEffect(() => { setPicked([]); setRes(''); }, [ex.id]);
  const toggle = (sq: Square) => setPicked((p) => (p.includes(sq) ? p.filter((x) => x !== sq) : [...p, sq]));
  async function check() {
    try {
      const r = await strategyApi.answer(ex.id, picked);
      setRes(r.correct ? `Correct. ${r.explanation}` : `Not yet. Missed: ${r.missed.join(' ') || 'none'}. Extra: ${r.extra.join(' ') || 'none'}. ${r.explanation}`);
      onDone();
    } catch (e) { setError((e as Error).message); }
  }
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,380px)_1fr]">
      <Board fen={ex.fen} onSquare={toggle} picked={picked} label={`${ex.title}. Select squares`} />
      <Card title={ex.title}>
        <p className="text-sm text-slate-300">{ex.prompt}</p>
        <p className="mt-1 text-xs text-slate-400">Selected: {picked.join(' ') || 'none'}</p>
        {error ? <ErrorBanner message={error} /> : null}
        <button className="btn mt-2" onClick={check}>Check answer</button>
        <p role="status" className="mt-2 text-sm text-slate-100">{res}</p>
        <p className="mt-1 text-xs text-slate-500">The answer is computed from the position by ChessScope, not hand-typed.</p>
      </Card>
    </div>
  );
}

export function StrategyPage() {
  const [data, setData] = useState<{ lessons: StrategyLesson[]; exercises: StrategyExercise[] } | null>(null);
  const [sel, setSel] = useState<StrategyExercise | null>(null);
  const [error, setError] = useState('');
  const load = () => strategyApi.overview().then(setData).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Middlegame strategy</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <section aria-label="Pawn-structure exercises" className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Exercises</h2>
        <ul className="flex flex-wrap gap-2">
          {data?.exercises.map((e) => (
            <li key={e.id}><button className={`btn ${sel?.id === e.id ? 'ring-2 ring-sky-400' : ''}`} onClick={() => setSel(e)}>{e.title}{e.progress?.solved ? ' (done)' : ''}</button></li>
          ))}
        </ul>
        {sel ? <Exercise ex={sel} onDone={() => void load()} /> : null}
      </section>
      <section aria-label="Pawn-structure lessons" className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Lessons</h2>
        {data?.lessons.map((l) => <Lesson key={l.id} l={l} />)}
      </section>
    </div>
  );
}
