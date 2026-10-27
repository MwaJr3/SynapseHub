import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Analysis, type GameRow, type User , Mistake, TrainingPlan } from './api';
import { classificationTone, formatEval, materialLabel } from './utils';
import { Badge, Card, ConfirmButton, EmptyState, ErrorBanner, Loading, StatCard } from './ui';

export function GamesPage() {
  const [games, setGames] = useState<GameRow[] | null>(null);
  const [pgn, setPgn] = useState('');
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    api
      .games()
      .then(setGames)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Loading failed.'));
  }, []);
  useEffect(() => reload(), [reload]);

  const openAnalysis = async (id: number) => {
    setError('');
    setAnalysis(null);
    setOpenId(id);
    setBusy(true);
    try {
      const detail = await api.game(id);
      if (detail.analysis) {
        setAnalysis(detail.analysis);
      } else {
        setAnalysis(await api.analyze(id));
        reload();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Analysis failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Games & analysis</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <Card title="Import a PGN game">
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError('');
            try {
              await api.uploadGame(pgn);
              setPgn('');
              reload();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Import failed.');
            }
          }}
        >
          <textarea
            className="input h-40 font-mono text-xs"
            aria-label="PGN notation"
            placeholder={'[White "..."]\n[Black "..."]\n\n1. e4 e5 2. Nf3 ...'}
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
          />
          <button className="btn-primary" disabled={!pgn.trim()} aria-describedby="import-game-hint">
            Import game
          </button>
          <p id="import-game-hint" className="text-xs text-slate-400">
            Paste a PGN to enable import. Analysis is local and nothing is uploaded.
          </p>
        </form>
      </Card>
      {!games ? (
        <Loading />
      ) : games.length === 0 ? (
        <EmptyState title="No games yet" hint="Import a PGN above to get started." />
      ) : (
        <div className="space-y-2">
          {games.map((g) => (
            <div key={g.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">
                    {g.white} vs {g.black} · {g.result}
                  </div>
                  <div className="text-xs text-slate-400">
                    {g.analysed ? 'analysed' : 'not analysed yet'}
                    {g.created_at ? ` · imported ${new Date(g.created_at).toLocaleString()}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => void openAnalysis(g.id)}>
                    {openId === g.id ? 'Hide analysis' : 'Analyse'}
                  </button>
                  <a className="btn-ghost" href={`/api/games/${g.id}/report.json`}>
                    Report
                  </a>
                  <ConfirmButton
                    label="Delete"
                    confirmMessage={`Delete game ${g.white} vs ${g.black}?`}
                    onConfirm={async () => {
                      await api.deleteGame(g.id);
                      setOpenId(null);
                      setAnalysis(null);
                      reload();
                    }}
                  />
                </div>
              </div>
              {openId === g.id ? (
                <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
                  {busy && !analysis ? <Loading /> : null}
                  {analysis ? <AnalysisView analysis={analysis} /> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: Analysis }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
        <strong className="text-slate-200">Engine status:</strong> {analysis.engine.message}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Plies" value={analysis.stats.plies} />
        <StatCard label="Captures" value={analysis.stats.captures} />
        <StatCard label="Checks" value={analysis.stats.checks} />
        <StatCard label="Material" value={materialLabel(analysis.stats.final_material_balance)} />
      </div>
      {Object.keys(analysis.flags_summary).length > 0 ? (
        <div className="rounded-lg border border-amber-800 bg-amber-950/50 px-3 py-2 text-xs text-amber-200">
          Heuristic flags: {Object.entries(analysis.flags_summary).map(([k, v]) => `${k} ×${v}`).join(' · ')} — these
          mark suspicious patterns for review; they are NOT proof that a move is a mistake.
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-400">
          No heuristic flags triggered. Absence of flags is not proof that the game is mistake-free.
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="min-w-full">
          <thead className="bg-slate-900">
            <tr>
              <th scope="col" className="th">#</th>
              <th scope="col" className="th">Move</th>
              <th scope="col" className="th">Side</th>
              <th scope="col" className="th">Material after</th>
              <th scope="col" className="th">Eval</th>
              <th scope="col" className="th">Class</th>
              <th scope="col" className="th">Flags</th>
            </tr>
          </thead>
          <tbody>
            {analysis.moves.map((m) => (
              <tr key={m.ply} className="border-t border-slate-800">
                <td className="td">{m.ply}</td>
                <td className="td font-mono">
                  {m.san}
                  {m.is_mate ? ' #' : m.is_check ? ' +' : ''}
                </td>
                <td className="td">{m.side}</td>
                <td className="td">{materialLabel(m.material_after)}</td>
                <td className="td font-mono">{formatEval(m.engine_eval_cp)}</td>
                <td className="td">
                  {m.classification ? <Badge tone={classificationTone(m.classification)}>{m.classification}</Badge> : '—'}
                </td>
                <td className="td max-w-md text-xs text-amber-300">{m.flags.join('; ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{analysis.disclaimer}</p>
    </div>
  );
}

export function InsightsPage() {
  const [data, setData] = useState<import('./api').Insights | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .insights()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : 'Loading failed.'));
  }, []);
  if (error) return <ErrorBanner message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Insights</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Games" value={data.games} />
        <StatCard label="White wins" value={data.results.white_wins} />
        <StatCard label="Black wins" value={data.results.black_wins} />
        <StatCard label="Draws" value={data.results.draws} />
      </div>
      <Card title="Openings (from PGN labels)">
        {data.openings.length === 0 ? (
          <EmptyState title="No games" hint="Import games to see opening statistics." />
        ) : (
          <ul className="space-y-1">
            {data.openings.map(([name, count]) => (
              <li key={name} className="flex justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                <span>{name}</span>
                <span className="text-slate-400">×{count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Engine status">
        <p className="text-sm text-slate-300">
          {data.engine_available
            ? 'A local UCI engine is available for this deployment.'
            : 'No local UCI engine is available — heuristic analysis only. Evaluations are not invented.'}
        </p>
        <p className="mt-2 text-xs text-slate-400">{data.disclaimer}</p>
      </Card>
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">
          {user.display_name} · <span className="text-slate-400">{user.email}</span>
        </p>
      </Card>
      <Card title="Analysis honesty rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Heuristic flags mark suspicious patterns for review — NOT proof that a move is a mistake.</li>
          <li>Engine evaluations are shown only when a local UCI engine is configured; otherwise the app says so and invents nothing.</li>
          <li>Analysis runs on the PGN you import; the app does not claim to know what happened outside the moves supplied.</li>
          <li>Demo games are simulated.</li>
        </ul>
      </Card>
    </div>
  );
}


export function TrainingPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.trainingPlan(), api.trainingMistakes()])
      .then(([p, m]) => {
        setPlan(p);
        setMistakes(m.mistakes);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  const progress = (plan?.progress ?? {}) as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Training &amp; improvement</h1>
        <p className="text-sm text-slate-400">
          Every inaccuracy, mistake and blunder recorded from your engine-analysed games, with concrete
          suggestions for where to improve.
        </p>
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      {plan ? (
        <>
          <div className="card">
            <h2 className="mb-2 font-medium text-emerald-300">Where to focus next</h2>
            {plan.focusAreas.length === 0 ? (
              <p className="text-sm text-slate-400">
                No recorded mistakes yet — analyse a game with the engine to build your improvement plan.
              </p>
            ) : (
              <div className="space-y-3">
                {plan.focusAreas.map((f) => (
                  <div key={f.category} className="rounded-lg border border-slate-800 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-100">{f.title}</div>
                      <div className="text-xs text-slate-400">
                        {f.count} recorded · {f.phases.join(', ')}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{f.advice}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{plan.note}</p>
          </div>
          <div className="card">
            <h2 className="mb-2 font-medium text-emerald-300">Recorded pattern summary</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(plan.byClassification).map(([k, v]) => (
                <span key={k} className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                  {k}: {String(v)}
                </span>
              ))}
              {Object.entries(plan.byCategory).map(([k, v]) => (
                <span key={k} className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                  {k}: {String(v)}
                </span>
              ))}
            </div>
            {typeof progress.direction === 'string' ? (
              <p className="mt-2 text-xs text-slate-400">
                Blunders in earlier vs later analysed games: {String(progress.early_blunders)} →{' '}
                {String(progress.recent_blunders)} ({progress.direction}). {String(progress.note ?? '')}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">{String(progress.note ?? '')}</p>
            )}
          </div>
        </>
      ) : null}
      <div className="card">
        <h2 className="mb-2 font-medium text-emerald-300">Mistake journal</h2>
        {mistakes.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400">
                  <th scope="col" className="py-2 pr-3">Game</th>
                  <th scope="col" className="pr-3">Ply</th>
                  <th scope="col" className="pr-3">Move</th>
                  <th scope="col" className="pr-3">Classification</th>
                  <th scope="col" className="pr-3">Eval drop</th>
                  <th scope="col" className="pr-3">Phase</th>
                  <th scope="col" className="pr-3">Theme</th>
                </tr>
              </thead>
              <tbody>
                {mistakes.map((m) => (
                  <tr key={m.id} className="border-b border-slate-800/60 text-slate-300">
                    <td className="py-2 pr-3 text-xs text-slate-400 max-w-xs truncate" title={m.pgnText}>
                      #{m.gameId}
                    </td>
                    <td className="pr-3">{m.ply}</td>
                    <td className="pr-3 font-medium">{m.san}</td>
                    <td className="pr-3">{m.classification}</td>
                    <td className="pr-3">{m.evalDropCp} cp</td>
                    <td className="pr-3">{m.phase}</td>
                    <td className="pr-3">{m.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
