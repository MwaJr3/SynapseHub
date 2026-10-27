import { Fragment, useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Finding, type Project, type User } from './api';
import { formatTimestamp, remediationTone, scanStatusTone } from './utils';
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

function ProjectPicker({
  projects,
  value,
  onChange,
}: {
  projects: Project[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <Field label="Project">
      <select className="input" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
        <option value="" disabled>
          Select a project…
        </option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function useProjectSelection(): [Project[] | null, string, () => void, number | null, (id: number) => void] {
  const [projects, error, reload] = useAsync(() => api.projects(), []);
  const [projectId, setProjectId] = useState<number | null>(null);
  const selected = projectId ?? projects?.[0]?.id ?? null;
  return [projects, error, reload, selected, setProjectId];
}

/* ------------------------------ Overview ------------------------------ */

export function OverviewPage() {
  const [projects, error] = useProjectSelection();
  const [findings, findingsError] = useAsync(
    async () => {
      if (!projects) return [];
      const all: Finding[] = [];
      for (const p of projects) all.push(...(await api.projectFindings(p.id)));
      return all;
    },
    [projects],
  );

  if (error || findingsError) return <ErrorBanner message={error || findingsError || ''} />;
  if (!projects) return <Loading />;
  if (projects.length === 0) {
    return <EmptyState title="No projects yet" hint="Create a project and upload a dependency manifest." />;
  }

  const byStatus: Record<string, number> = { Open: 0, 'Under Review': 0, Resolved: 0, 'Accepted Risk': 0 };
  for (const f of findings ?? []) byStatus[f.remediation.status] = (byStatus[f.remediation.status] ?? 0) + 1;
  const affected = new Set((findings ?? []).map((f) => f.package));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Monitored projects" value={projects.length} />
        <StatCard label="Completed scans" value={projects.reduce((s, p) => s + p.scan_count, 0)} />
        <StatCard label="Findings" value={(findings ?? []).length} tone="text-rose-300" />
        <StatCard label="Affected dependencies" value={affected.size} tone="text-amber-300" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open" value={byStatus.Open ?? 0} tone="text-rose-300" />
        <StatCard label="Under review" value={byStatus['Under Review'] ?? 0} tone="text-amber-300" />
        <StatCard label="Resolved" value={byStatus.Resolved ?? 0} tone="text-emerald-300" />
        <StatCard label="Accepted risk" value={byStatus['Accepted Risk'] ?? 0} tone="text-sky-300" />
      </div>
      <Card title="Recent findings">
        {(findings ?? []).length === 0 ? (
          <EmptyState title="No findings" hint="Run a scan on a manifest to populate this list." />
        ) : (
          <ul className="space-y-2">
            {(findings ?? []).slice(0, 6).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 p-3">
                <Badge tone={remediationTone(f.remediation.status)}>{f.remediation.status}</Badge>
                <span className="font-mono text-sm">
                  {f.package}=={f.version}
                </span>
                <span className="text-xs text-slate-400">{f.advisory_id}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-slate-400">
        Findings are scanner output, not proof of exploitability. No findings does not prove a dependency is safe.
      </p>
    </div>
  );
}

/* ------------------------------ Projects ------------------------------ */

export function ProjectsPage() {
  const [projects, error, reload] = useAsync(() => api.projects(), []);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [repoRef, setRepoRef] = useState('');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Projects</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <Card title="Create a project">
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.createProject(name, description, repoRef);
              setName('');
              setDescription('');
              setRepoRef('');
              reload();
            } catch (err) {
              setActionError(err instanceof ApiError ? err.message : 'Create failed.');
            }
          }}
        >
          <Field label="Name">
            <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label="Repository reference (optional)">
            <input className="input" value={repoRef} onChange={(e) => setRepoRef(e.target.value)} />
          </Field>
          <button className="btn-primary md:col-span-3 justify-center">Create</button>
        </form>
      </Card>
      {!projects ? (
        <Loading />
      ) : projects.length === 0 ? (
        <EmptyState title="No projects" hint="Create your first project above." />
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <p className="text-sm text-slate-400">{p.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {p.manifest_count} manifests · {p.scan_count} scans · {p.finding_count} findings
                    {p.repository_ref ? ` · ${p.repository_ref}` : ''}
                  </p>
                </div>
                <ConfirmButton
                  label="Delete"
                  confirmMessage={`Delete project "${p.name}" with its scans and findings?`}
                  onConfirm={async () => {
                    await api.deleteProject(p.id);
                    reload();
                  }}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Manifests ----------------------------- */

export function ManifestsPage() {
  const [projects, wsError, reloadProjects, selected, setSelected] = useProjectSelection();
  const [manifests, error, reload] = useAsync(
    () => (selected ? api.manifests(selected) : Promise.resolve([])),
    [selected],
  );
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dependency manifests</h1>
      {wsError || error || actionError ? <ErrorBanner message={wsError || error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        {projects ? <ProjectPicker projects={projects} value={selected} onChange={setSelected} /> : <Loading />}
        <Card title="Upload requirements.txt or pyproject.toml">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file || !selected) return;
              try {
                const result = await api.uploadManifest(selected, file);
                setMessage(`Parsed ${result.package_count} packages from ${file.name}.`);
                setFile(null);
                reload();
                reloadProjects();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Upload failed.');
              }
            }}
          >
            <input className="input flex-1" type="file" accept=".txt,.toml" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <button className="btn-primary" disabled={!file || !selected}>
              Upload
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            Manifests are read as text only — uploaded projects are never installed and no code is executed.
          </p>
        </Card>
      </div>
      {!manifests ? (
        <Loading />
      ) : manifests.length === 0 ? (
        <EmptyState title="No manifests" hint="Upload a dependency manifest for a project." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">File</th>
                <th scope="col" className="th">Kind</th>
                <th scope="col" className="th">Packages</th>
                <th scope="col" className="th">Parse notes</th>
                <th scope="col" className="th">Uploaded</th>
                <th scope="col" className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {manifests.map((m) => (
                <tr key={m.id} className="border-t border-slate-800">
                  <td className="td font-medium">
                    {m.filename}{' '}
                    {m.selected ? <Badge tone="bg-violet-950 text-violet-300 border border-violet-800">selected</Badge> : null}
                  </td>
                  <td className="td">{m.kind}</td>
                  <td className="td-num">{m.package_count}</td>
                  <td className="td text-right tabular-nums text-xs text-slate-400">{m.errors.length} note(s)</td>
                  <td className="td text-slate-400">{formatTimestamp(m.uploaded_at)}</td>
                  <td className="td space-x-2 whitespace-nowrap">
                    <button
                      className="btn-ghost"
                      onClick={async () => {
                        await api.selectManifest(m.id);
                        reload();
                      }}
                    >
                      Select
                    </button>
                    <ConfirmButton
                      label="Delete"
                      confirmMessage={`Delete manifest "${m.filename}"?`}
                      onConfirm={async () => {
                        await api.deleteManifest(m.id);
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

/* -------------------------------- Scans -------------------------------- */

export function ScansPage() {
  const [projects, wsError, reloadProjects, selected] = useProjectSelection();
  const [manifests] = useAsync(() => (selected ? api.manifests(selected) : Promise.resolve([])), [selected]);
  const [scans, error, reload] = useAsync(() => (selected ? api.scans(selected) : Promise.resolve([])), [selected]);
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Scan history</h1>
      {wsError || error || actionError ? <ErrorBanner message={wsError || error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <Card title="Run an audit scan">
        <p id="scan-hint" className="mb-2 text-xs text-slate-400">
          A scan needs at least one uploaded manifest; the button unlocks when one exists.
        </p>
        <button
          className="btn-primary"
          aria-describedby="scan-hint"
          disabled={!manifests || manifests.length === 0}
          onClick={async () => {
            const chosen = manifests?.find((m) => m.selected) ?? manifests?.[0];
            if (!chosen) return;
            try {
              const result = await api.runScan(chosen.id);
              setMessage(
                result.status === 'failed'
                  ? `Scan failed: ${result.error}`
                  : `Scan ${result.status}: ${result.findings} finding(s).`,
              );
              reload();
              reloadProjects();
            } catch (err) {
              setActionError(err instanceof ApiError ? err.message : 'Scan failed.');
            }
          }}
        >
          Run scan (selected manifest)
        </button>
        <p className="mt-2 text-xs text-slate-400">
          The auditor runs in a sandboxed subprocess with a hard timeout and --no-deps. A failed scan is reported as a
          failure — never as zero findings.
        </p>
      </Card>
      {!scans ? (
        <Loading />
      ) : scans.length === 0 ? (
        <EmptyState title="No scans" hint="Run the first scan for this project." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Scan</th>
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th">Tool</th>
                <th scope="col" className="th">Findings</th>
                <th scope="col" className="th">Started</th>
                <th scope="col" className="th">Error</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="td">#{s.id}</td>
                  <td className="td">
                    <Badge tone={scanStatusTone(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="td">{s.tool}</td>
                  <td className="td-num">{s.finding_count}</td>
                  <td className="td text-slate-400">{formatTimestamp(s.started_at)}</td>
                  <td className="td max-w-sm truncate text-xs text-rose-300">{s.error || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Findings/remediation --------------------- */

function RemediationForm({ finding, onSaved }: { finding: Finding; onSaved: () => void }) {
  const [status, setStatus] = useState(finding.remediation.status);
  const [assignee, setAssignee] = useState(finding.remediation.assignee);
  const [notes, setNotes] = useState(finding.remediation.notes);
  const [exceptionReason, setExceptionReason] = useState(finding.remediation.exception_reason);
  const [error, setError] = useState('');

  return (
    <form
      className="mt-2 grid gap-2 md:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        try {
          await api.setRemediation(finding.id, status, assignee, notes, exceptionReason);
          onSaved();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Save failed.');
        }
      }}
    >
      <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option>Open</option>
        <option>Under Review</option>
        <option>Resolved</option>
        <option>Accepted Risk</option>
      </select>
      <input className="input" aria-label="Responsible person" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
      <input className="input md:col-span-2" aria-label="Notes" placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {status === 'Accepted Risk' ? (
        <input
          className="input md:col-span-3"
          aria-label="Exception reason"
          placeholder="Exception reason (required for Accepted Risk)"
          value={exceptionReason}
          onChange={(e) => setExceptionReason(e.target.value)}
        />
      ) : null}
      <button className="btn-primary">Save</button>
      {error ? <div className="md:col-span-4"><ErrorBanner message={error} /></div> : null}
    </form>
  );
}

export function FindingsPage() {
  const [projects, wsError, , selected, setSelected] = useProjectSelection();
  const [findings, error, reload] = useAsync(
    () => (selected ? api.projectFindings(selected) : Promise.resolve([])),
    [selected],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Vulnerability findings & remediation</h1>
      {wsError || error ? <ErrorBanner message={wsError || error} /> : null}
      <div className="w-64">
        {projects ? <ProjectPicker projects={projects} value={selected} onChange={setSelected} /> : <Loading />}
      </div>
      <p className="text-xs text-slate-400">
        The scanner's original finding (advisory, package, version, description) is immutable. Remediation status,
        assignee, notes and risk-exception reasons are stored separately.
      </p>
      {!findings ? (
        <Loading />
      ) : findings.length === 0 ? (
        <EmptyState title="No findings" hint="Run a scan first." />
      ) : (
        <div className="space-y-3">
          {findings.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={remediationTone(f.remediation.status)}>{f.remediation.status}</Badge>
                <span className="font-mono text-sm font-medium">
                  {f.package}=={f.version}
                </span>
                <span className="text-sm text-slate-300">{f.advisory_id}</span>
                {f.aliases.length > 0 ? <span className="text-xs text-slate-400">({f.aliases.join(', ')})</span> : null}
                {f.fix_versions.length > 0 ? (
                  <Badge tone="bg-emerald-950 text-emerald-300 border border-emerald-800">
                    fix: {f.fix_versions.join(', ')}
                  </Badge>
                ) : null}
                <Badge tone="bg-slate-800 text-slate-300 border border-slate-700">{f.source}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-300">{f.description || 'No description supplied by the scanner.'}</p>
              <RemediationForm finding={f} onSaved={reload} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Reports ------------------------------- */

export function ReportsPage() {
  const [projects, wsError, , selected, setSelected] = useProjectSelection();
  const [scans, error] = useAsync(() => (selected ? api.scans(selected) : Promise.resolve([])), [selected]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      {wsError || error ? <ErrorBanner message={wsError || error} /> : null}
      <div className="w-64">
        {projects ? <ProjectPicker projects={projects} value={selected} onChange={setSelected} /> : <Loading />}
      </div>
      {!scans ? (
        <Loading />
      ) : scans.length === 0 ? (
        <EmptyState title="No scans to report" hint="Run a scan first." />
      ) : (
        <div className="space-y-2">
          {scans.map((s) => (
            <div key={s.id} className="card flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm">
                Scan #{s.id} · <Badge tone={scanStatusTone(s.status)}>{s.status}</Badge> · {s.finding_count} findings ·{' '}
                {formatTimestamp(s.started_at)}
              </span>
              <span className="flex gap-2">
                <a className="btn-ghost" href={`/api/scans/${s.id}/report.json`}>
                  Export JSON
                </a>
                <a className="btn-ghost" href={`/api/scans/${s.id}/report.csv`}>
                  Export CSV
                </a>
              </span>
            </div>
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
      </Card>
      <Card title="Scanner limitations (documented, not hidden)">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Auditing uses pip-audit's vulnerability sources; results depend on their availability and coverage.</li>
          <li>Scans run with --no-deps and a hard timeout; conflicting pins can make a manifest unresolvable — that is a failed scan, not "zero findings".</li>
          <li>No findings does not prove a dependency is safe; findings are not proof of exploitability.</li>
          <li>Uploaded manifests are read as text and never executed or installed.</li>
          <li>Secrets live in environment configuration, never in source code.</li>
        </ul>
      </Card>
    </div>
  );
}
