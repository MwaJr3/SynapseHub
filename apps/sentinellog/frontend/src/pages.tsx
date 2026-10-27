import { Fragment, useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, ApiError, type Dataset, type Finding, type Report, type Rule, type User } from './api';
import { eventTypeTone, formatBytes, formatTimestamp, severityTone } from './utils';
import { Badge, Card, ConfirmButton, EmptyState, ErrorBanner, Field, Loading, StatCard } from './ui';

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): [T | null, string, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    loader()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof ApiError ? err.message : 'Loading failed.');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return [data, error, reload];
}

function DatasetPicker({
  datasets,
  value,
  onChange,
}: {
  datasets: Dataset[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <Field label="Dataset">
      <select
        className="input"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="" disabled>
          Select a dataset…
        </option>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.record_count} events)
          </option>
        ))}
      </select>
    </Field>
  );
}

/* ------------------------------ Overview ------------------------------ */

export function OverviewPage() {
  const [datasets, error, reload] = useAsync(() => api.datasets(), []);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const selected = datasetId ?? datasets?.[0]?.id ?? null;
  const [findings, findingsError] = useAsync(
    () => (selected ? api.findings(selected) : Promise.resolve([])),
    [selected],
  );
  const [timeline, timelineError] = useAsync(
    () => (selected ? api.timeline(selected) : Promise.resolve([])),
    [selected],
  );

  if (error) return <ErrorBanner message={error} />;
  if (!datasets) return <Loading />;
  if (datasets.length === 0) {
    return (
      <EmptyState
        title="No datasets yet"
        hint="Import a .log, .txt or .csv file on the Datasets page to see analysis results here."
      />
    );
  }

  const counts = {
    total: datasets.reduce((sum, d) => sum + d.record_count, 0),
    errors: datasets.reduce((sum, d) => sum + d.error_count, 0),
    patterns: (findings ?? []).length,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Overview</h1>
        <div className="w-64">
          <DatasetPicker datasets={datasets} value={selected} onChange={setDatasetId} />
        </div>
      </div>
      {findingsError || timelineError ? <ErrorBanner message={findingsError || timelineError || ''} /> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total events analyzed" value={counts.total} />
        <StatCard label="Datasets imported" value={datasets.length} />
        <StatCard label="Parsing errors" value={counts.errors} tone="text-amber-300" />
        <StatCard label="Suspicious patterns" value={counts.patterns} tone="text-rose-300" />
      </div>
      <Card title="Authentication activity over time">
        {(timeline ?? []).length === 0 ? (
          <EmptyState title="No timeline data" hint="Events with timestamps appear here." />
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="bucket" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Area type="monotone" dataKey="auth_failure" stackId="1" stroke="#f43f5e" fill="#881337" name="Failures" />
                <Area type="monotone" dataKey="auth_success" stackId="1" stroke="#10b981" fill="#064e3b" name="Successes" />
                <Area type="monotone" dataKey="error" stackId="1" stroke="#f59e0b" fill="#78350f" name="Errors" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      <Card title="Recent detections">
        {(findings ?? []).length === 0 ? (
          <EmptyState title="No detections yet" hint="Run analysis from the Datasets page to apply your rules." />
        ) : (
          <ul className="space-y-2">
            {(findings ?? []).slice(0, 6).map((f) => (
              <li key={f.id} className="rounded-lg border border-slate-800 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={severityTone(f.severity)}>{f.severity}</Badge>
                  <Badge tone="bg-slate-800 text-slate-300 border border-slate-700">{f.classification}</Badge>
                  <span className="text-sm font-medium">{f.title}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{f.rule_name}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-slate-400">
        Detections are suspicious patterns produced by configurable rules — not proof of an attack.{' '}
        <button className="underline" onClick={reload}>
          Refresh
        </button>
      </p>
    </div>
  );
}

/* ------------------------------ Datasets ------------------------------ */

export function DatasetsPage() {
  const [datasets, error, reload] = useAsync(() => api.datasets(), []);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setUploadError('');
    setMessage('');
    try {
      const result = await api.uploadDataset(file, name);
      setMessage(`Imported ${result.record_count} events (${result.error_count} parsing errors).`);
      setFile(null);
      setName('');
      reload();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const analyze = async (id: number) => {
    try {
      const result = await api.analyze(id);
      setMessage(`Analysis complete: ${result.findings_created} new detection(s).`);
      reload();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Analysis failed.');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Imported datasets</h1>
      {error || uploadError ? <ErrorBanner message={error || uploadError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">
          {message}
        </div>
      ) : null}
      <Card title="Import a log file (.log, .txt, .csv — max 5 MB)">
        <form onSubmit={upload} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field label="File">
            <input
              className="input"
              type="file"
              accept=".log,.txt,.csv"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field label="Dataset name (optional)">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. auth.log week 42" />
          </Field>
          <button className="btn-primary self-end" disabled={busy || !file}>
            {busy ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </Card>
      {!datasets ? (
        <Loading />
      ) : datasets.length === 0 ? (
        <EmptyState title="Nothing imported yet" hint="Upload a log file to create your first dataset." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Name</th>
                <th scope="col" className="th">File</th>
                <th scope="col" className="th">Format</th>
                <th scope="col" className="th">Events</th>
                <th scope="col" className="th">Parse errors</th>
                <th scope="col" className="th">Uploaded</th>
                <th scope="col" className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="border-t border-slate-800">
                  <td className="td font-medium">{d.name}</td>
                  <td className="td text-slate-400">
                    {d.original_filename} · {formatBytes(d.size_bytes)}
                  </td>
                  <td className="td">{d.file_format}</td>
                  <td className="td-num">{d.record_count}</td>
                  <td className="td-num">
                    {d.error_count > 0 ? (
                      <Badge tone="bg-amber-950 text-amber-300 border border-amber-800">{d.error_count}</Badge>
                    ) : (
                      '0'
                    )}
                  </td>
                  <td className="td text-slate-400">{formatTimestamp(d.uploaded_at)}</td>
                  <td className="td space-x-2 whitespace-nowrap">
                    <button className="btn-primary" onClick={() => analyze(d.id)}>
                      Analyze
                    </button>
                    <ConfirmButton
                      label="Delete"
                      confirmMessage={`Delete dataset "${d.name}" and all of its events?`}
                      onConfirm={async () => {
                        await api.deleteDataset(d.id);
                        reload();
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Events ------------------------------- */

/**
 * The event log's page number, kept in the hash so the view can be refreshed,
 * shared or reached with the back button.
 *
 * This app routes with `window.location.hash` rather than a router, so the query
 * lives after the route: `#/events?page=3`. The hash is the single source of truth;
 * the state below only mirrors it so a change re-renders.
 */
function useHashPage(): [number, (next: number) => void] {
  const read = () => {
    const match = /[?&]page=(\d+)/.exec(window.location.hash);
    const value = Number(match?.[1] ?? '1');
    return Number.isFinite(value) && value > 0 ? value : 1;
  };
  const [page, setPageState] = useState(read);
  useEffect(() => {
    const onHash = () => setPageState(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const setPage = useCallback((next: number) => {
    const target = Math.max(next, 1);
    const base = window.location.hash.replace(/\?.*$/, '') || '#/events';
    window.location.hash = `${base}?page=${target}`;
    setPageState(target);
  }, []);
  return [page, setPage];
}

export function EventsPage() {
  const [datasets, datasetsError] = useAsync(() => api.datasets(), []);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const selected = datasetId ?? datasets?.[0]?.id ?? null;
  const [query, setQuery] = useState('');
  const [eventType, setEventType] = useState('');
  const [page, setPage] = useHashPage();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [result, error, reload] = useAsync(
    () =>
      selected
        ? api.events(selected, { q: query, event_type: eventType, page, page_size: 25 })
        : Promise.resolve({ total: 0, page: 1, page_size: 25, events: [] }),
    [selected, query, eventType, page],
  );

  if (datasetsError) return <ErrorBanner message={datasetsError} />;
  if (!datasets) return <Loading />;
  if (datasets.length === 0) return <EmptyState title="No datasets" hint="Import a dataset first." />;

  const pages = Math.max(1, Math.ceil((result?.total ?? 0) / 25));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Security events</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-3 md:grid-cols-3">
        <DatasetPicker
          datasets={datasets}
          value={selected}
          onChange={(id) => {
            setDatasetId(id);
            setPage(1);
          }}
        />
        <Field label="Search messages">
          <input
            className="input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. Failed password"
          />
        </Field>
        <Field label="Event type">
          <select
            className="input"
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="auth_success">Success logins</option>
            <option value="auth_failure">Failed logins</option>
            <option value="error">Errors</option>
            <option value="info">Info</option>
          </select>
        </Field>
      </div>
      {!result ? (
        <Loading />
      ) : result.events.length === 0 ? (
        <EmptyState title="No matching events" hint="Adjust the filters or pick another dataset." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Time</th>
                <th scope="col" className="th">Type</th>
                <th scope="col" className="th">User</th>
                <th scope="col" className="th">Source IP</th>
                <th scope="col" className="th">Message</th>
              </tr>
            </thead>
            <tbody>
              {result.events.map((e) => (
                <Fragment key={e.id}>
                  <tr
                    className="cursor-pointer border-t border-slate-800 hover:bg-slate-900/60"
                    onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  >
                    <td className="td whitespace-nowrap text-slate-400">{formatTimestamp(e.timestamp)}</td>
                    <td className="td">
                      <Badge tone={eventTypeTone(e.event_type)}>{e.event_type}</Badge>
                    </td>
                    <td className="td">{e.username || '—'}</td>
                    <td className="td font-mono text-xs">{e.source_ip || '—'}</td>
                    <td className="td truncate max-w-md">{e.message}</td>
                  </tr>
                  {expanded === e.id ? (
                    <tr className="border-t border-slate-800 bg-slate-950">
                      <td className="td" colSpan={5}>
                        <div className="text-xs text-slate-400">
                          Line {e.line_no} · system {e.source_system || 'unknown'}
                        </div>
                        <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-300">{e.raw}</pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2 text-sm text-slate-400">
            <span>
              {result.total} events · page {result.page} of {pages}
            </span>
            <span className="space-x-2">
              <button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <button className="btn-ghost" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Next
              </button>
              <button className="btn-ghost" onClick={reload}>
                Refresh
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Rules -------------------------------- */

const RULE_TYPES = ['repeated_failures', 'multi_account_spray', 'success_after_failures', 'error_spike'];

function RuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Rule | null;
  onSave: (draft: {
    name: string;
    rule_type: string;
    threshold: number;
    window_minutes: number;
    severity: string;
    enabled: boolean;
    description: string;
    runbook: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    name: initial?.name ?? '',
    rule_type: initial?.rule_type ?? 'repeated_failures',
    threshold: initial?.threshold ?? 5,
    window_minutes: initial?.window_minutes ?? 15,
    severity: initial?.severity ?? 'medium',
    enabled: initial?.enabled ?? true,
    description: initial?.description ?? '',
    runbook: initial?.runbook ?? '',
  });
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        await onSave(draft);
      }}
    >
      <Field label="Name">
        <input className="input" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
      </Field>
      <Field label="Rule type">
        <select className="input" value={draft.rule_type} onChange={(e) => setDraft({ ...draft, rule_type: e.target.value })}>
          {RULE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Threshold">
        <input
          className="input"
          type="number"
          min={1}
          value={draft.threshold}
          onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
        />
      </Field>
      <Field label="Time window (minutes)">
        <input
          className="input"
          type="number"
          min={1}
          value={draft.window_minutes}
          onChange={(e) => setDraft({ ...draft, window_minutes: Number(e.target.value) })}
        />
      </Field>
      <Field label="Severity">
        <select className="input" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
      </Field>
      <Field label="Enabled">
        <select
          className="input"
          value={draft.enabled ? 'yes' : 'no'}
          onChange={(e) => setDraft({ ...draft, enabled: e.target.value === 'yes' })}
        >
          <option value="yes">Enabled</option>
          <option value="no">Disabled</option>
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Description">
          <textarea className="input" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </Field>
      </div>
      <div className="md:col-span-2">
        <Field label="Recommended investigation steps">
          <textarea className="input" rows={2} value={draft.runbook} onChange={(e) => setDraft({ ...draft, runbook: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button className="btn-primary">{initial ? 'Save changes' : 'Create rule'}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function RulesPage() {
  const [rules, error, reload] = useAsync(() => api.rules(), []);
  const [datasets] = useAsync(() => api.datasets(), []);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);
  const [testResults, setTestResults] = useState<string>('');
  const [actionError, setActionError] = useState('');

  const save = async (draft: Parameters<Parameters<typeof RuleForm>[0]['onSave']>[0]) => {
    try {
      if (editing) await api.updateRule(editing.id, draft);
      else await api.createRule(draft);
      setEditing(null);
      setCreating(false);
      reload();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Save failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Detection rules</h1>
        <button className="btn-primary" onClick={() => setCreating(true)}>
          New rule
        </button>
      </div>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {creating || editing ? (
        <Card title={editing ? `Edit: ${editing.name}` : 'Create a detection rule'}>
          <RuleForm initial={editing} onSave={save} onCancel={() => { setCreating(false); setEditing(null); }} />
        </Card>
      ) : null}
      {!rules ? (
        <Loading />
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    <Badge tone={severityTone(rule.severity)}>{rule.severity}</Badge>
                    <Badge tone={rule.enabled ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400 border border-slate-700'}>
                      {rule.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                    <Badge tone="bg-slate-800 text-slate-300 border border-slate-700">{rule.rule_type}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{rule.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Threshold {rule.threshold} within {rule.window_minutes} minutes
                  </p>
                  {rule.runbook ? <p className="mt-2 text-xs text-slate-400">Investigation: {rule.runbook}</p> : null}
                  {testResults && editing?.id === rule.id ? (
                    <pre className="mt-2 max-h-48 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-300">{testResults}</pre>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost" onClick={() => { setEditing(rule); setCreating(false); }}>
                    Edit
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={async () => {
                      const datasetId = datasets?.[0]?.id;
                      if (!datasetId) {
                        setActionError('Import a dataset before testing rules.');
                        return;
                      }
                      const results = await api.testRule(rule.id, datasetId);
                      setEditing(rule);
                      setTestResults(
                        results.length === 0
                          ? 'No findings from a dry-run against the first dataset.'
                          : results.map((r) => `${r.severity} — ${r.title}`).join('\n'),
                      );
                    }}
                  >
                    Test on dataset
                  </button>
                  <ConfirmButton
                    label="Delete"
                    confirmMessage={`Delete rule "${rule.name}"?`}
                    onConfirm={async () => {
                      await api.deleteRule(rule.id);
                      reload();
                    }}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Reports ------------------------------- */

export function ReportsPage() {
  const [reports, error, reload] = useAsync(() => api.reports(), []);
  const [datasets] = useAsync(() => api.datasets(), []);
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Investigation reports</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <Card title="Generate a report">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-64">
            {datasets && datasets.length > 0 ? (
              <DatasetPicker datasets={datasets} value={datasetId ?? datasets[0]?.id ?? null} onChange={setDatasetId} />
            ) : (
              <p className="text-sm text-slate-400">Import a dataset first.</p>
            )}
          </div>
          <p id="report-hint" className="text-xs text-slate-400">
            A report needs at least one dataset; upload one to enable this button.
          </p>
          <button
            className="btn-primary"
            aria-describedby="report-hint"
            disabled={!datasets || datasets.length === 0}
            onClick={async () => {
              try {
                const id = datasetId ?? datasets?.[0]?.id;
                if (!id) return;
                await api.generateReport(id);
                reload();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Report generation failed.');
              }
            }}
          >
            Generate
          </button>
        </div>
      </Card>
      {!reports ? (
        <Loading />
      ) : reports.length === 0 ? (
        <EmptyState title="No reports yet" hint="Generate a report for an analyzed dataset." />
      ) : (
        <div className="space-y-3">
          {reports.map((report: Report) => (
            <Card key={report.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">
                    Report #{report.id} — dataset #{report.dataset_id}
                  </div>
                  <p className="text-xs text-slate-400">Generated {formatTimestamp(report.generated_at)}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-300 sm:grid-cols-4">
                    <span>Events: {report.summary.counts.total_events}</span>
                    <span className="text-emerald-300">Successes: {report.summary.counts.successful_logins}</span>
                    <span className="text-rose-300">Failures: {report.summary.counts.failed_logins}</span>
                    <span className="text-amber-300">Patterns: {report.summary.counts.suspicious_patterns}</span>
                  </div>
                  <p className="mt-2 max-w-2xl text-xs text-slate-400">{report.summary.disclaimer}</p>
                </div>
                <div className="flex gap-2">
                  <a className="btn-ghost" href={`/api/reports/${report.id}/export.json`}>
                    Export JSON
                  </a>
                  <a className="btn-ghost" href={`/api/reports/${report.id}/export.csv`}>
                    Export CSV
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Settings ------------------------------ */

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">
          {user.display_name} · <span className="text-slate-400">{user.email}</span>
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Passwords are hashed with scrypt server-side. Sessions use httpOnly cookies. All datasets, rules, findings and
          reports are private to this account and enforced server-side.
        </p>
      </Card>
      <Card title="Import limits">
        <ul className="list-inside list-disc text-sm text-slate-300">
          <li>Allowed file types: .log, .txt, .csv</li>
          <li>Maximum file size: 5 MB (configurable via SENTINELLOG_MAX_UPLOAD_BYTES)</li>
          <li>Uploaded content is parsed as data only and never executed.</li>
        </ul>
      </Card>
      <Card title="Detection rule types">
        <ul className="space-y-2 text-sm text-slate-300">
          <li><b>repeated_failures</b> — failed logins for one account/source within a window.</li>
          <li><b>multi_account_spray</b> — one source failing across several accounts.</li>
          <li><b>success_after_failures</b> — success following repeated failures for an account.</li>
          <li><b>error_spike</b> — a concentration of error events in a window.</li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Every match is reported as a suspicious pattern. See docs/DETECTION_LOGIC.md for the exact comparisons and
          their limitations.
        </p>
      </Card>
    </div>
  );
}
