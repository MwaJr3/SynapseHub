import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { HONESTY_NOTICE, severityTone, statusTone } from './utils';
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

function DemoBanner({ demo }: { demo: boolean }) {
  if (!demo) return null;
  return (
    <div className="rounded-lg border border-amber-800 bg-amber-950/60 px-3 py-2 text-sm text-amber-200">
      Simulated demonstration data — fictional events and people. Not real security telemetry.
    </div>
  );
}

/* ------------------------------- Dashboard ------------------------------- */

export function DashboardPage({ user }: { user: User }) {
  const [dash, error] = useAsync(() => api.dashboard(), []);
  if (error) return <ErrorBanner message={error} />;
  if (!dash) return <Loading />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Security operations dashboard</h1>
      <DemoBanner demo={dash.demo_data} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Events" value={dash.events} />
        <StatCard label="Open alerts" value={dash.alerts_open} tone="text-amber-300" />
        <StatCard label="Active incidents" value={(dash.incidents_by_status.new ?? 0) + (dash.incidents_by_status.triaged ?? 0) + (dash.incidents_by_status.contained ?? 0)} tone="text-rose-300" />
        <StatCard label="Your role" value={user.role} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Incidents by workflow status">
          <ul className="space-y-1">
            {Object.entries(dash.incidents_by_status).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                <Badge tone={statusTone(status)}>{status}</Badge>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Incidents by severity">
          <ul className="space-y-1">
            {Object.entries(dash.incidents_by_severity).map(([severity, count]) => (
              <li key={severity} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                <Badge tone={severityTone(severity)}>{severity}</Badge>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card title="Workflow & honesty">
        <p className="text-sm text-slate-300">{dash.workflow_note}</p>
        <p className="mt-2 text-xs text-slate-500">{HONESTY_NOTICE}</p>
      </Card>
    </div>
  );
}

/* --------------------------------- Events -------------------------------- */

export function EventsPage({ user }: { user: User }) {
  const [q, setQ] = useState('');
  const [events, error, reload] = useAsync(() => api.events(q), [q]);
  const [actionError, setActionError] = useState('');
  const canWrite = user.role === 'admin' || user.role === 'analyst';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Security events</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <div className="flex flex-wrap gap-2">
        <input className="input max-w-xs" aria-label="Search summaries" placeholder="Search summaries…" value={q} onChange={(e) => setQ(e.target.value)} />
        {canWrite ? (
          <button
            className="btn-primary"
            onClick={async () => {
              try {
                await api.createEvent({
                  occurred_at: new Date().toISOString(),
                  category: 'generic',
                  summary: 'Manual event entry (review text)',
                  severity: 'low',
                });
                reload();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Create failed.');
              }
            }}
          >
            + Manual event
          </button>
        ) : null}
      </div>
      {!events ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState title="No events" hint="Events appear here once ingested." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="th">Occurred</th>
                <th className="th">Source</th>
                <th className="th">Category</th>
                <th className="th">Summary</th>
                <th className="th">Severity</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-slate-800">
                  <td className="td whitespace-nowrap text-slate-400">{e.occurred_at}</td>
                  <td className="td font-mono text-xs">{e.source_ip || '—'}</td>
                  <td className="td">{e.category}</td>
                  <td className="td">{e.summary}</td>
                  <td className="td">
                    <Badge tone={severityTone(e.severity)}>{e.severity}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-500">{HONESTY_NOTICE}</p>
    </div>
  );
}

/* --------------------------------- Alerts -------------------------------- */

export function AlertsPage({ user }: { user: User }) {
  const [alerts, error, reload] = useAsync(() => api.alerts(), []);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const canWrite = user.role === 'admin' || user.role === 'analyst';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Rule alerts</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      {!alerts ? (
        <Loading />
      ) : alerts.length === 0 ? (
        <EmptyState title="No alerts" hint="Run rule evaluation from the Administration page." />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(a.rule_severity)}>{a.rule_severity}</Badge>
                    <Badge tone={statusTone(a.status === 'open' ? 'new' : a.status === 'converted' ? 'resolved' : 'closed')}>
                      {a.status}
                    </Badge>
                    <span className="font-medium">{a.rule_name}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">{a.event.summary}</div>
                  <div className="mt-1 text-xs text-slate-500">{a.note}</div>
                </div>
                {canWrite && a.status === 'open' ? (
                  <div className="flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        await api.convertAlert(a.id);
                        setMessage('Alert converted into a new incident (status: new).');
                        reload();
                      }}
                    >
                      Convert to incident
                    </button>
                    <ConfirmButton
                      label="Dismiss"
                      confirmMessage="Dismiss this alert?"
                      onConfirm={async () => {
                        await api.updateAlert(a.id, 'dismiss');
                        reload();
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500">{HONESTY_NOTICE}</p>
    </div>
  );
}

/* -------------------------------- Incidents ------------------------------- */

export function IncidentsPage({ user }: { user: User }) {
  const [incidents, error, reload] = useAsync(() => api.incidents(), []);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<import('./api').IncidentDetail | null>(null);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [users] = useAsync(() => api.users(), []);
  const [actionError, setActionError] = useState('');
  const canWrite = user.role === 'admin' || user.role === 'analyst';

  const open = async (id: number) => {
    setOpenId(id);
    setDetail(await api.incident(id));
    setTarget('');
    setNote('');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Incidents</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {!incidents ? (
        <Loading />
      ) : incidents.length === 0 ? (
        <EmptyState title="No incidents" hint="Convert an alert or create an incident." />
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <div key={inc.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={severityTone(inc.severity)}>{inc.severity}</Badge>
                    <Badge tone={statusTone(inc.status)}>{inc.status}</Badge>
                    <span className="font-medium">{inc.title}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    assignee: {inc.assignee_name || 'unassigned'}
                    {inc.resolution_note ? ` · resolution: ${inc.resolution_note}` : ''}
                  </div>
                </div>
                <button className="btn-ghost" onClick={() => void open(inc.id)}>
                  {openId === inc.id ? 'Close panel' : 'Open'}
                </button>
              </div>
              {openId === inc.id && detail ? (
                <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
                  <p className="text-sm text-slate-300">{detail.description}</p>
                  <p className="text-xs text-slate-500">{detail.workflow_note}</p>
                  {detail.events.length > 0 ? (
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-slate-300">Related events</h3>
                      <ul className="space-y-1">
                        {detail.events.map((e) => (
                          <li key={e.id} className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400">
                            {e.occurred_at} · {e.summary}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {canWrite ? (
                    <div className="grid gap-2 md:grid-cols-4">
                      <select className="input" aria-label="Transition status" value={target} onChange={(e) => setTarget(e.target.value)}>
                        <option value="">Transition to…</option>
                        {detail.allowed_transitions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <input
                        className="input md:col-span-2"
                        aria-label="Note"
                        placeholder={target === 'resolved' ? 'Resolution note (required)' : 'Note (optional)'}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <button
                        className="btn-primary"
                        disabled={!target}
                        onClick={async () => {
                          try {
                            await api.transition(detail.id, target, note);
                            await open(detail.id);
                            reload();
                          } catch (err) {
                            setActionError(err instanceof ApiError ? err.message : 'Transition failed.');
                          }
                        }}
                      >
                        Apply
                      </button>
                      <select className="input md:col-span-2" aria-label="Assignee" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                        <option value="">Assign to…</option>
                        {(users ?? []).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name} ({u.role})
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn-ghost"
                        disabled={!assigneeId}
                        onClick={async () => {
                          await api.patchIncident(detail.id, { assignee_id: Number(assigneeId) });
                          await open(detail.id);
                          reload();
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Your role is read-only for incidents.</p>
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Reports -------------------------------- */

export function ReportsPage() {
  const [incidents, error] = useAsync(() => api.incidents(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <Card title="Portfolio incident export">
        <a className="btn-ghost" href="/api/reports/incidents.csv">
          Download incidents CSV
        </a>
        <p className="mt-2 text-xs text-slate-500">
          Reports record workflow state and related events. {HONESTY_NOTICE}
        </p>
      </Card>
      <Card title="Per-incident JSON reports">
        {!incidents ? (
          <Loading />
        ) : incidents.length === 0 ? (
          <EmptyState title="No incidents" hint="Reports appear once incidents exist." />
        ) : (
          <ul className="space-y-1">
            {incidents.map((inc) => (
              <li key={inc.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                <span>{inc.title}</span>
                <a className="btn-ghost" href={`/api/incidents/${inc.id}/report.json`}>
                  JSON
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ---------------------------------- Admin --------------------------------- */

export function AdminPage() {
  const [rules, error, reloadRules] = useAsync(() => api.rules(), []);
  const [users, usersError, reloadUsers] = useAsync(() => api.users(), []);
  const [auditRows, auditError] = useAsync(() => api.audit(), []);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contains, setContains] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Administration</h1>
      {error || usersError || auditError || actionError ? (
        <ErrorBanner message={error || usersError || auditError || actionError} />
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <Card title="Detection rules">
        <form
          className="grid gap-3 md:grid-cols-5"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.createRule({ name, category_match: category, summary_contains: contains, severity });
              setName('');
              setCategory('');
              setContains('');
              reloadRules();
            } catch (err) {
              setActionError(err instanceof ApiError ? err.message : 'Create failed.');
            }
          }}
        >
          <Field label="Name">
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Category match">
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Summary contains">
            <input className="input" value={contains} onChange={(e) => setContains(e.target.value)} />
          </Field>
          <Field label="Severity">
            <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option>low</option>
              <option>medium</option>
              <option>high</option>
              <option>critical</option>
            </select>
          </Field>
          <button className="btn-primary self-end">Add rule</button>
        </form>
        <ul className="mt-3 space-y-1">
          {(rules ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
              <span>
                {r.name} · {r.category_match || '*'} · “{r.summary_contains || '*'}”
              </span>
              <ConfirmButton
                label="Delete"
                confirmMessage={`Delete rule "${r.name}"?`}
                onConfirm={async () => {
                  await api.deleteRule(r.id);
                  reloadRules();
                }}
              />
            </li>
          ))}
        </ul>
        <button
          className="btn-primary mt-3"
          onClick={async () => {
            const result = await api.evaluateRules();
            setMessage(`Rule evaluation complete: ${result.created} new alert(s). ${result.note}`);
          }}
        >
          Run rule evaluation
        </button>
      </Card>
      <Card title="Users & roles">
        <ul className="space-y-1">
          {(users ?? []).map((u) => (
            <li key={u.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
              <span>
                {u.display_name} · {u.email}
              </span>
              <select
                className="input w-32"
                aria-label="User role"
                value={u.role}
                onChange={async (e) => {
                  await api.setRole(u.id, e.target.value);
                  reloadUsers();
                }}
              >
                <option value="viewer">viewer</option>
                <option value="analyst">analyst</option>
                <option value="admin">admin</option>
              </select>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Audit log (latest 200)">
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th className="th">Time</th>
                <th className="th">Action</th>
                <th className="th">Target</th>
                <th className="th">Detail</th>
              </tr>
            </thead>
            <tbody>
              {(auditRows ?? []).map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="td whitespace-nowrap text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                  <td className="td font-mono text-xs">{row.action}</td>
                  <td className="td font-mono text-xs">{row.target}</td>
                  <td className="td text-xs text-slate-400">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* --------------------------------- Settings -------------------------------- */

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">
          {user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}
        </p>
      </Card>
      <Card title="Roles & honesty rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Roles: admin (full control), analyst (events, alerts, incidents), viewer (read-only). Enforced server-side.</li>
          <li>{HONESTY_NOTICE}</li>
          <li>Rule matches are triage suggestions; converting one into an incident records the reasoning.</li>
          <li>Every administrative action is written to the audit log.</li>
          <li>Demo data is simulated and fictional.</li>
        </ul>
      </Card>
    </div>
  );
}
