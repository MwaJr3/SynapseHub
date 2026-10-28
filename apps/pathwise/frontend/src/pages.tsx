import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { MODEL_NOTE, confidenceTone, statusTone } from './utils';
import { Badge, Card, EmptyState, ErrorBanner, Loading, StatCard } from './ui';

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): [T | null, string, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    loader().then((r) => { if (alive) setData(r); })
      .catch((err: unknown) => { if (alive) setError(err instanceof ApiError ? err.message : 'Loading failed.'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return [data, error, reload];
}

export function MapPage({ user }: { user: User }) {
  const [map, error, reload] = useAsync(() => api.map(), []);
  const [recs, recsError] = useAsync(() => api.recommendations(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Skill map & recommended next steps</h1>
      {error || recsError ? <ErrorBanner message={error || recsError} /> : null}
      <p className="text-xs text-slate-400">{MODEL_NOTE}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Concepts">
          {!map ? <Loading /> : (
            <ul className="space-y-2">
              {map.map((row) => (
                <li key={row.skill_id} className="rounded-lg border border-slate-800 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
                    <Badge tone={confidenceTone(row.confidence)}>{row.confidence} confidence</Badge>
                    <span className="font-medium">{row.name}</span>
                    {row.score !== null ? <span className="text-xs text-slate-400">{row.score}% · {row.evidence_count} evidence</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{row.explanation}</p>
                  {row.next_review ? <p className="mt-1 text-xs text-sky-300">Review scheduled: {new Date(row.next_review).toLocaleDateString()}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="What to do next">
          {!recs ? <Loading /> : recs.length === 0 ? (
            <EmptyState title="No recommendations" hint="Take an assessment to generate evidence." />
          ) : (
            <ul className="space-y-2">
              {recs.map((rec) => (
                <li key={rec.id} className="rounded-lg border border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">{rec.rationale}</span>
                    {user.role !== 'learner' ? (
                      <button className="btn-ghost" onClick={async () => {
                        await api.override(rec.id, 'overridden', 'Teacher reviewed and redirected the plan.');
                        reload();
                      }}>Override</button>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Evidence: {JSON.stringify(rec.evidence)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export function AssessmentsPage() {
  const [list, error, reload] = useAsync(() => api.assessments(), []);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<import('./api').AssessmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<import('./api').AttemptResult | null>(null);
  const [actionError, setActionError] = useState('');

  const open = async (id: number) => {
    setOpenId(id);
    setResult(null);
    setAnswers({});
    setDetail(await api.assessment(id));
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Assessments</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {!list ? <Loading /> : list.length === 0 ? (
        <EmptyState title="No assessments" hint="Teachers can create diagnostics, practice sets and post-tests." />
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <div key={a.id} className="card flex items-center justify-between">
              <div>
                <div className="font-medium">{a.title} <span className="text-xs text-slate-400">v{a.version}</span></div>
                <div className="text-xs text-slate-400">{a.kind} · {a.question_count} questions</div>
              </div>
              <button className="btn-ghost" onClick={() => void open(a.id)}>{openId === a.id ? 'Hide' : 'Open'}</button>
            </div>
          ))}
        </div>
      )}
      {detail ? (
        <Card title={detail.title}>
          <div className="space-y-3">
            {detail.questions.map((question) => (
              <div key={question.id} className="rounded-lg border border-slate-800 p-3">
                <div className="text-sm">{question.prompt}</div>
                {question.kind === 'short' ? (
                  <input className="input mt-2" aria-label={question.prompt} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} />
                ) : question.kind === 'tf' ? (
                  <div className="mt-2 flex gap-2">
                    {[true, false].map((v) => (
                      <button key={String(v)} type="button" className="btn-ghost" onClick={() => setAnswers({ ...answers, [question.id]: v })}>
                        {v ? 'True' : 'False'}
                      </button>
                    ))}
                  </div>
                ) : question.choices.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {question.choices.map((choice, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <input type={question.kind === 'multi' ? 'checkbox' : 'radio'} name={`q${question.id}`}
                          onChange={(e) => {
                            if (question.kind === 'multi') {
                              const prev = Array.isArray(answers[question.id]) ? (answers[question.id] as number[]) : [];
                              setAnswers({ ...answers, [question.id]: (e.target as HTMLInputElement).checked ? [...prev, idx] : prev.filter((i) => i !== idx) });
                            } else {
                              setAnswers({ ...answers, [question.id]: idx });
                            }
                          }} />
                        {choice}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input className="input mt-2" type="number" step="any" aria-label={question.prompt} onChange={(e) => setAnswers({ ...answers, [question.id]: Number(e.target.value) })} />
                )}
              </div>
            ))}
            <button className="btn-primary" onClick={async () => {
              setActionError('');
              try {
                setResult(await api.submit(detail.id, answers));
                reload();
              } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Submit failed.'); }
            }}>Submit attempt</button>
            {result ? (
              <div className="rounded-lg border border-slate-700 p-3 text-sm">
                <div>Score: <strong>{result.score}%</strong></div>
                <p className="mt-1 text-xs text-slate-400">{result.note}</p>
                <ul className="mt-2 space-y-1">
                  {result.per_question.map((row) => (
                    <li key={row.question_id} className={row.credit >= 1 ? 'text-emerald-300' : row.credit > 0 ? 'text-amber-300' : 'text-rose-300'}>
                      Question {row.question_id}: {(row.credit * 100).toFixed(0)}% credit{row.rubric ? ` — ${row.rubric}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

export function ReportPage({ user }: { user: User }) {
  const [report, error] = useAsync(() => api.prePost(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Progress & review</h1>
      {error ? <ErrorBanner message={error} /> : null}
      {!report ? <Loading /> : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Skills compared" value={report.matched_skills} />
            <StatCard label="Average change" value={report.average_delta === null ? '—' : `${report.average_delta} pts`} tone="text-teal-300" />
            <StatCard label="Role" value={user.role} />
          </div>
          <Card title="Pre-test vs post-test (evidence-based)">
            {report.rows.length === 0 ? (
              <EmptyState title="Not enough evidence yet" hint="Complete a diagnostic and a post-test to compare outcomes." />
            ) : (
              <table className="min-w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="th">Skill</th>
                    <th className="th">Pre</th>
                    <th className="th">Post</th>
                    <th className="th">Change</th>
                    <th className="th">Meets threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.skill_id} className="border-t border-slate-800">
                      <td className="td">Skill {row.skill_id}</td>
                      <td className="td">{row.pre ?? '—'}</td>
                      <td className="td">{row.post ?? '—'}</td>
                      <td className="td">{row.delta ?? '—'}</td>
                      <td className="td">{row.meets_threshold_now ? 'yes' : 'not yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="mt-2 text-xs text-slate-400">{report.note}</p>
          </Card>
        </>
      )}
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">{user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}</p>
      </Card>
      <Card title="How the model works (limitations documented)">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>{MODEL_NOTE}</li>
          <li>Scores are evidence about specific skills at specific times — never fixed judgements of ability.</li>
          <li>Teacher overrides require a recorded reason.</li>
          <li>Demo data is simulated and fictional.</li>
        </ul>
      </Card>
    </div>
  );
}
