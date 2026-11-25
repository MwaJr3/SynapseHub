import { useEffect, useState } from 'react';
import { tacticsApi, type TacticPuzzle } from '../api';
import { ErrorBanner } from '../ui';
import { ExercisePlayer } from './ExercisePlayer';

export function TacticsPage() {
  const [puzzle, setPuzzle] = useState<TacticPuzzle | null>(null);
  const [reason, setReason] = useState('');
  const [themes, setThemes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const load = () => tacticsApi.next().then((r) => { setPuzzle(r.puzzle); setReason(r.reason); }).catch((e) => setError(e.message));
  useEffect(() => { void load(); tacticsApi.list().then((r) => setThemes(r.themes)).catch(() => undefined); }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tactics</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <p className="text-sm text-slate-400">Themes: {themes.join(', ')}. Puzzles are chosen by what is due and which themes you miss; every position is verified by search.</p>
      {puzzle ? (
        <>
          <p className="text-sm text-slate-300" aria-live="polite">{reason} Theme: {puzzle.theme}, level {puzzle.difficulty}.</p>
          <ExercisePlayer
            ex={{ id: puzzle.id, title: puzzle.kind === 'mate' ? `Mate in ${puzzle.mate_in}` : 'Win material', fen: puzzle.fen, side_to_move: puzzle.side_to_move, highlights: [], concept: puzzle.theme, hint: puzzle.hint }}
            send={(fen, move) => tacticsApi.move(puzzle.id, fen, move)}
          />
          <button className="btn" onClick={() => void load()}>Next puzzle</button>
        </>
      ) : null}
    </div>
  );
}
