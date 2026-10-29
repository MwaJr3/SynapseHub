import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, type User } from './api';
import { FAIRNESS_NOTE, flagTone } from './utils';
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

export function DashboardPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dash, error] = useAsync(() => api.dashboard(from, to), [from, to]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Learning analytics dashboard</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="flex flex-wrap gap-2">
        <input className="input" type="date" aria-label="Start date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input className="input" type="date" aria-label="End date" value={to} onChange={(e) => setTo(e.target.value)} />
        <a className="btn-ghost" href={`/api/reports/export.json?date_from=${from}&date_to=${to}`}>Export report JSON</a>
      </div>
      {!dash ? <Loading /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Events" value={dash.summary.events} />
            <StatCard label="Learners" value={dash.summary.learners} />
            <StatCard label="Lesson completions" value={dash.summary.lesson_completions} />
            <StatCard label="Quiz average" value={dash.summary.quiz_avg ?? '—'} tone="text-emerald-300" />
            <StatCard label="Assignments submitted" value={dash.summary.assignments_submitted} />
            <StatCard label="Assignments missing" value={dash.summary.assignments_missing} tone="text-amber-300" />
            <StatCard label="Help requests" value={dash.summary.help_requests} />
            <StatCard label="Quiz attempts" value={dash.summary.quiz_attempts} />
          </div>
          <Card title="Events by topic">
            {Object.keys(dash.summary.by_topic).length === 0 ? (
              <EmptyState title="No events in range" hint="Import data or widen the date range." />
            ) : (
              <ul className="space-y-1">
                {Object.entries(dash.summary.by_topic).map(([topic, count]) => (
                  <li key={topic} className="flex justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                    <span>{topic}</span><span className="text-slate-400">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <p className="text-xs text-slate-400">{dash.note}</p>
        </>
      )}
    </div>
  );
}

export function ImportPage() {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<{ rows_ok: number; rows_rejected: number; rejected: { line: number; reason: string }[] } | null>(null);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState('');
  const csvField = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Data import</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <Card title="Import learning events (CSV)">
        <p className="mb-2 text-xs text-slate-400">
          Required columns: uid, occurred_at, kind, learner_ref. Optional: course, class_name, topic, assessment, value.
          Re-importing the same file is idempotent — duplicate rows are rejected with reasons, not double-counted.
        </p>
        <textarea ref={csvField} className="input h-48 font-mono text-xs" aria-label="Bulk learner CSV data" placeholder="uid,occurred_at,kind,learner_ref,…"
          value={csv} onChange={(e) => { setCsv(e.target.value); setBlocked(''); }} />
        <button className="btn-primary mt-2" onClick={async () => {
          if (!csv.trim()) {
            // The import runs on what is in the box; an empty box is a missing input,
            // so say which one instead of disabling the button and saying nothing.
            setBlocked('Paste the CSV rows to import, then press Import.');
            csvField.current?.focus();
            return;
          }
          setBlocked('');
          setError('');
          try {
            setResult(await api.importCsv('upload.csv', csv));
          } catch (err) { setError(err instanceof ApiError ? err.message : 'Import failed.'); }
        }}>Import</button>
        {blocked ? <p role="status" className="mt-2 text-xs text-amber-300">{blocked}</p> : null}
        {result ? (
          <div className="mt-3 rounded-lg border border-slate-700 p-3 text-sm">
            <div>Accepted: <strong>{result.rows_ok}</strong> · Rejected: <strong>{result.rows_rejected}</strong></div>
            <ul className="mt-2 space-y-1">
              {result.rejected.map((r, i) => (
                <li key={i} className="text-xs text-rose-300">line {r.line}: {r.reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export function FlagsPage() {
  const [flags, error, reload] = useAsync(() => api.flags(), []);
  const [message, setMessage] = useState('');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Support flags</h1>
      {error ? <ErrorBanner message={error} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <button className="btn-primary" onClick={async () => {
        const result = await api.evaluateFlags();
        setMessage(`${result.created} new flag(s). ${result.note}`);
        reload();
      }}>Run flag rules</button>
      <p className="text-xs text-slate-400">{FAIRNESS_NOTE}</p>
      {!flags ? <Loading /> : flags.length === 0 ? (
        <EmptyState title="No flags" hint="Run the rules after importing events." />
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <div key={f.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone={flagTone(f.status)}>{f.status}</Badge>
                    <span className="font-medium">{f.rule_key}</span>
                    <span className="text-xs text-slate-400">learner: {f.learner_ref}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{f.evidence.rule}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Evidence: {f.evidence.count ? `${f.evidence.count} events` : ''} {f.evidence.topic ? `· topic ${f.evidence.topic}` : ''} · ids: {(f.evidence.event_uids ?? []).join(', ')}
                  </p>
                </div>
                {f.status === 'open' ? (
                  <div className="flex gap-2">
                    <button className="btn-ghost" onClick={async () => {
                      await api.updateFlag(f.id, 'dismissed', 'Reviewed — no action needed.');
                      reload();
                    }}>Dismiss</button>
                    <button className="btn-primary" onClick={async () => {
                      await api.updateFlag(f.id, 'actioned', 'Supportive follow-up recorded.');
                      reload();
                    }}>Mark actioned</button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
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
      <Card title="Fairness & privacy rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>{FAIRNESS_NOTE}</li>
          <li>Small cohorts (under 3 learners) are suppressed in comparisons to protect individuals.</li>
          <li>Metric definitions and data-quality notes ship with every export.</li>
          <li>Correlation in the data is never presented as causation.</li>
          <li>All demo data is synthetic.</li>
        </ul>
      </Card>
    </div>
  );
}
