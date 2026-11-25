import { useCallback, useEffect, useState } from 'react';
import { endgamesApi, type EndgameExercise } from '../api';
import { Badge, ErrorBanner } from '../ui';
import { ExercisePlayer } from './ExercisePlayer';

export function EndgamesPage() {
  const [list, setList] = useState<EndgameExercise[]>([]);
  const [sel, setSel] = useState<EndgameExercise | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => { endgamesApi.list().then((r) => setList(r.exercises)).catch((e) => setError(e.message)); }, []);
  useEffect(reload, [reload]);
  const pick = async (e: EndgameExercise) => { try { setSel(await endgamesApi.get(e.id)); } catch (x) { setError((x as Error).message); } };
  const cats = [...new Set(list.map((e) => e.category))];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Endgames</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav aria-label="Endgame exercises" className="space-y-3">
          {cats.map((c) => (
            <div key={c}>
              <h2 className="text-xs uppercase tracking-wide text-slate-400">{c}</h2>
              <ul className="mt-1 space-y-1">
                {list.filter((e) => e.category === c).map((e) => (
                  <li key={e.id}>
                    <button className={`btn w-full justify-between ${sel?.id === e.id ? 'ring-2 ring-sky-400' : ''}`} onClick={() => pick(e)}>
                      <span>{e.title}</span>
                      {e.progress?.solved ? <Badge tone="bg-emerald-900 text-emerald-200">solved</Badge> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {sel ? (
          <ExercisePlayer ex={sel} send={(fen, move) => endgamesApi.move(sel.id, fen, move)} onSolved={reload} />
        ) : <p className="text-sm text-slate-400">Choose an exercise.</p>}
      </div>
    </div>
  );
}
