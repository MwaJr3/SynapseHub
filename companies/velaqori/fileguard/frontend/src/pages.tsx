import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Finding, type User, type Workspace } from './api';
import { formatBytes, formatTimestamp, kindTone, shortHash } from './utils';
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

function WorkspacePicker({
  workspaces,
  value,
  onChange,
}: {
  workspaces: Workspace[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <Field label="Workspace">
      <select className="input" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))}>
        <option value="" disabled>
          Select a workspace…
        </option>
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </Field>
  );
}

function useWorkspaceSelection(): [Workspace[] | null, string, () => void, number | null, (id: number) => void] {
  const [workspaces, error, reload] = useAsync(() => api.workspaces(), []);
  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const selected = workspaceId ?? workspaces?.[0]?.id ?? null;
  return [workspaces, error, reload, selected, setWorkspaceId];
}

/* ------------------------------ Overview ------------------------------ */

export function OverviewPage() {
  const [workspaces, error] = useWorkspaceSelection();
  const [findings, findingsError] = useAsync(
    async () => {
      if (!workspaces) return [];
      const all: Finding[] = [];
      for (const ws of workspaces) {
        all.push(...(await api.workspaceFindings(ws.id)));
      }
      return all;
    },
    [workspaces],
  );

  if (error || findingsError) return <ErrorBanner message={error || findingsError || ''} />;
  if (!workspaces) return <Loading />;
  if (workspaces.length === 0) {
    return <EmptyState title="No workspaces yet" hint="Create a monitoring workspace to register files." />;
  }

  const totals = workspaces.reduce(
    (acc, w) => ({
      files: acc.files + w.file_count,
      scans: acc.scans + w.scan_count,
      baselines: acc.baselines + w.baseline_count,
    }),
    { files: 0, scans: 0, baselines: 0 },
  );
  const byKind = { changed: 0, missing: 0, new: 0 };
  for (const f of findings ?? []) byKind[f.kind] += 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Registered files" value={totals.files} />
        <StatCard label="Integrity scans" value={totals.scans} />
        <StatCard label="Baselines" value={totals.baselines} />
        <StatCard label="Open findings" value={(findings ?? []).filter((f) => !f.reviewed).length} tone="text-rose-300" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Changed files" value={byKind.changed} tone="text-rose-300" />
        <StatCard label="Missing files" value={byKind.missing} tone="text-amber-300" />
        <StatCard label="New files" value={byKind.new} tone="text-sky-300" />
      </div>
      <Card title="Recent findings">
        {(findings ?? []).length === 0 ? (
          <EmptyState title="No findings" hint="Run a scan against a baseline to compare file states." />
        ) : (
          <ul className="space-y-2">
            {(findings ?? []).slice(0, 6).map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 p-3">
                <Badge tone={kindTone(f.kind)}>{f.kind}</Badge>
                <span className="text-sm">{f.display_name}</span>
                <span className="text-xs text-slate-400">{f.explanation.slice(0, 90)}…</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-slate-400">
        A hash match proves byte-identity with the baseline only — never that a file is safe. Baselines are trusted only
        when their integrity and origin are protected.
      </p>
    </div>
  );
}

/* ----------------------------- Workspaces ----------------------------- */

export function WorkspacesPage() {
  const [workspaces, error, reload] = useAsync(() => api.workspaces(), []);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Monitoring workspaces</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <Card title="Create a workspace">
        <form
          className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.createWorkspace(name, description);
              setName('');
              setDescription('');
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
          <button className="btn-primary self-end">Create</button>
        </form>
      </Card>
      {!workspaces ? (
        <Loading />
      ) : workspaces.length === 0 ? (
        <EmptyState title="No workspaces" hint="Create your first monitoring workspace above." />
      ) : (
        <div className="space-y-3">
          {workspaces.map((w) => (
            <Card key={w.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{w.name}</div>
                  <p className="text-sm text-slate-400">{w.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {w.file_count} files · {w.baseline_count} baselines · {w.scan_count} scans · created{' '}
                    {formatTimestamp(w.created_at)}
                  </p>
                </div>
                <ConfirmButton
                  label="Delete"
                  confirmMessage={`Delete workspace "${w.name}" and its registered files?`}
                  onConfirm={async () => {
                    await api.deleteWorkspace(w.id);
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

/* -------------------------------- Files -------------------------------- */

export function FilesPage() {
  const [workspaces, wsError, reloadWs, selected, setSelected] = useWorkspaceSelection();
  const [files, error, reload] = useAsync(
    () => (selected ? api.files(selected) : Promise.resolve([])),
    [selected],
  );
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Registered files</h1>
      {wsError || error || actionError ? <ErrorBanner message={wsError || error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        {workspaces ? <WorkspacePicker workspaces={workspaces} value={selected} onChange={setSelected} /> : <Loading />}
        <Card title="Register a file (uploaded into this workspace only)">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file || !selected) return;
              try {
                await api.uploadFile(selected, file);
                setMessage(`Registered ${file.name} (SHA-256 recorded).`);
                setFile(null);
                reload();
                reloadWs();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Upload failed.');
              }
            }}
          >
            <input
              className="input flex-1"
              type="file"
              accept="*/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button className="btn-primary" disabled={!file || !selected}>
              Upload
            </button>
          </form>
          <p className="mt-2 text-xs text-slate-400">Never executed. Type and size limits are enforced server-side.</p>
        </Card>
      </div>
      {!files ? (
        <Loading />
      ) : files.length === 0 ? (
        <EmptyState title="No registered files" hint="Upload files to include them in integrity monitoring." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Name</th>
                <th scope="col" className="th">Size</th>
                <th scope="col" className="th">Type</th>
                <th scope="col" className="th">SHA-256</th>
                <th scope="col" className="th">Uploaded</th>
                <th scope="col" className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t border-slate-800">
                  <td className="td font-medium">{f.display_name}</td>
                  <td className="td">{formatBytes(f.size_bytes)}</td>
                  <td className="td">{f.file_type}</td>
                  <td className="td font-mono text-xs">{shortHash(f.sha256)}</td>
                  <td className="td text-slate-400">{formatTimestamp(f.uploaded_at)}</td>
                  <td className="td space-x-2 whitespace-nowrap">
                    <a className="btn-ghost" href={`/api/files/${f.id}/download`}>
                      Download
                    </a>
                    <ConfirmButton
                      label="Delete"
                      confirmMessage={`Delete "${f.display_name}"?`}
                      onConfirm={async () => {
                        await api.deleteFile(f.id);
                        reload();
                        reloadWs();
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

/* ------------------------------ Baselines ------------------------------ */

export function BaselinesPage() {
  const [workspaces, wsError, reloadWs, selected, setSelected] = useWorkspaceSelection();
  const [baselines, error, reload] = useAsync(
    () => (selected ? api.baselines(selected) : Promise.resolve([])),
    [selected],
  );
  const [name, setName] = useState('Baseline');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Baselines</h1>
      {wsError || error || actionError ? <ErrorBanner message={wsError || error || actionError} /> : null}
      <div className="grid gap-3 md:grid-cols-[1fr_2fr]">
        {workspaces ? <WorkspacePicker workspaces={workspaces} value={selected} onChange={setSelected} /> : <Loading />}
        <Card title="Create a baseline from currently registered files">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selected) return;
              try {
                await api.createBaseline(selected, name);
                reload();
                reloadWs();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Baseline creation failed.');
              }
            }}
          >
            <Field label="Baseline name">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <button className="btn-primary">Create baseline</button>
          </form>
          <p className="mt-2 text-xs text-slate-400">
            A baseline is a versioned hash manifest. Its value depends on protecting its integrity and origin.
          </p>
        </Card>
      </div>
      {!baselines ? (
        <Loading />
      ) : baselines.length === 0 ? (
        <EmptyState title="No baselines" hint="Create a baseline to compare future states against." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Name</th>
                <th scope="col" className="th">Version</th>
                <th scope="col" className="th text-right">Files</th>
                <th scope="col" className="th">Created</th>
                <th scope="col" className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {baselines.map((b) => (
                <tr key={b.id} className="border-t border-slate-800">
                  <td className="td font-medium">{b.name}</td>
                  <td className="td">v{b.version}</td>
                  <td className="td text-right tabular-nums">{b.entry_count}</td>
                  <td className="td text-slate-400">{formatTimestamp(b.created_at)}</td>
                  <td className="td space-x-2 whitespace-nowrap">
                    <a className="btn-ghost" href={`/api/baselines/${b.id}/manifest.json`}>
                      Manifest
                    </a>
                    <ConfirmButton
                      label="Delete"
                      confirmMessage={`Delete baseline "${b.name}" v${b.version}?`}
                      onConfirm={async () => {
                        await api.deleteBaseline(b.id);
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
  const [workspaces, wsError, reloadWs, selected, setSelected] = useWorkspaceSelection();
  const [scans, error, reload] = useAsync(() => (selected ? api.scans(selected) : Promise.resolve([])), [selected]);
  const [baselines] = useAsync(() => (selected ? api.baselines(selected) : Promise.resolve([])), [selected]);
  const [openScan, setOpenScan] = useState<number | null>(null);
  const [findings] = useAsync(
    () => (openScan ? api.scanFindings(openScan) : Promise.resolve([])),
    [openScan],
  );
  const [actionError, setActionError] = useState('');
  const [blocked, setBlocked] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Scan history</h1>
      {wsError || error || actionError ? <ErrorBanner message={wsError || error || actionError} /> : null}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-64">
          {workspaces ? <WorkspacePicker workspaces={workspaces} value={selected} onChange={setSelected} /> : <Loading />}
        </div>
        <button
          className="btn-primary"
          onClick={async () => {
            if (!selected) {
              setBlocked('Choose a workspace first — a scan is scoped to one workspace.');
              return;
            }
            if (!baselines || baselines.length === 0) {
              // Explain instead of disabling: a disabled button is skipped by the
              // keyboard and by screen readers, so the blocker would be invisible.
              setBlocked('This workspace has no baseline yet. Record a baseline before scanning for changes.');
              return;
            }
            setBlocked('');
            try {
              const latest = baselines[baselines.length - 1];
              if (!latest) return;
              await api.runScan(latest.id);
              reload();
              reloadWs();
            } catch (err) {
              setActionError(err instanceof ApiError ? err.message : 'Scan failed.');
            }
          }}
        >
          Run scan vs latest baseline
        </button>
        {blocked ? (
          <p role="status" className="text-xs text-amber-300">
            {blocked}
          </p>
        ) : null}
      </div>
      {!scans ? (
        <Loading />
      ) : scans.length === 0 ? (
        <EmptyState title="No scans yet" hint="Run a scan to compare the current file state with a baseline." />
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <Card key={s.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">
                    Scan #{s.id} · baseline #{s.baseline_id}
                  </div>
                  <p className="text-xs text-slate-400">{formatTimestamp(s.created_at)}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-sm">
                    <Badge tone={kindTone('matched')}>{s.summary.matched} matched</Badge>
                    <Badge tone={kindTone('changed')}>{s.summary.changed} changed</Badge>
                    <Badge tone={kindTone('missing')}>{s.summary.missing} missing</Badge>
                    <Badge tone={kindTone('new')}>{s.summary.new} new</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => setOpenScan(openScan === s.id ? null : s.id)}>
                    {openScan === s.id ? 'Hide findings' : 'Show findings'}
                  </button>
                  <a className="btn-ghost" href={`/api/scans/${s.id}/report.json`}>
                    JSON
                  </a>
                  <a className="btn-ghost" href={`/api/scans/${s.id}/report.csv`}>
                    CSV
                  </a>
                </div>
              </div>
              {openScan === s.id ? (
                <div className="mt-3 space-y-2">
                  {(findings ?? []).length === 0 ? (
                    <p className="text-sm text-slate-400">No findings — all compared files matched.</p>
                  ) : (
                    (findings ?? []).map((f) => (
                      <div key={f.id} className="rounded-lg border border-slate-800 p-2 text-sm">
                        <Badge tone={kindTone(f.kind)}>{f.kind}</Badge>{' '}
                        <span className="font-medium">{f.display_name}</span>
                        <p className="mt-1 text-xs text-slate-400">{f.explanation}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Findings ------------------------------ */

export function FindingsPage() {
  const [workspaces, wsError, , selected, setSelected] = useWorkspaceSelection();
  const [findings, error, reload] = useAsync(
    () => (selected ? api.workspaceFindings(selected) : Promise.resolve([])),
    [selected],
  );
  const [actionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Integrity findings</h1>
      {wsError || error || actionError ? <ErrorBanner message={wsError || error || actionError} /> : null}
      <div className="w-64">
        {workspaces ? <WorkspacePicker workspaces={workspaces} value={selected} onChange={setSelected} /> : <Loading />}
      </div>
      {!findings ? (
        <Loading />
      ) : findings.length === 0 ? (
        <EmptyState title="No findings" hint="Findings appear when a scan detects changes, missing or new files." />
      ) : (
        <div className="space-y-3">
          {findings.map((f) => (
            <Card key={f.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={kindTone(f.kind)}>{f.kind}</Badge>
                    <Badge tone={f.reviewed ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'}>
                      {f.reviewed ? 'reviewed' : 'new'}
                    </Badge>
                    <span className="font-medium">{f.display_name}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">{f.explanation}</p>
                  {f.expected_sha256 ? (
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      expected {shortHash(f.expected_sha256)} → observed {shortHash(f.observed_sha256)}
                    </p>
                  ) : null}
                  <input
                    className="input mt-2 max-w-lg"
                    aria-label="Investigation notes"
                    placeholder="Investigation notes…"
                    defaultValue={f.notes}
                    onBlur={async (e) => {
                      await api.updateFinding(f.id, f.reviewed, e.target.value, f.severity);
                      reload();
                    }}
                  />
                </div>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    await api.updateFinding(f.id, !f.reviewed, f.notes, f.severity);
                    reload();
                  }}
                >
                  Mark {f.reviewed ? 'unreviewed' : 'reviewed'}
                </button>
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
  const [workspaces, wsError, , selected, setSelected] = useWorkspaceSelection();
  const [scans, error] = useAsync(() => (selected ? api.scans(selected) : Promise.resolve([])), [selected]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      {wsError || error ? <ErrorBanner message={wsError || error} /> : null}
      <div className="w-64">
        {workspaces ? <WorkspacePicker workspaces={workspaces} value={selected} onChange={setSelected} /> : <Loading />}
      </div>
      <Card title="Integrity reports">
        {!scans ? (
          <Loading />
        ) : scans.length === 0 ? (
          <EmptyState title="No scans to report" hint="Run a scan first, then export its report here." />
        ) : (
          <ul className="space-y-2">
            {scans.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 p-3">
                <span className="text-sm">
                  Scan #{s.id} · {formatTimestamp(s.created_at)} · {s.summary.changed} changed / {s.summary.missing}{' '}
                  missing / {s.summary.new} new
                </span>
                <span className="flex gap-2">
                  <a className="btn-ghost" href={`/api/scans/${s.id}/report.json`}>
                    Export JSON
                  </a>
                  <a className="btn-ghost" href={`/api/scans/${s.id}/report.csv`}>
                    Export CSV
                  </a>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-slate-400">
        Reports state exactly which comparison produced each finding. A matching hash proves byte-identity with the
        baseline record only — it does not prove a file is safe or free of malware.
      </p>
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
          scrypt password hashing, httpOnly cookie sessions, and per-user workspaces enforced server-side.
        </p>
      </Card>
      <Card title="What this application does and does not do">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Compares SHA-256 hashes of files explicitly uploaded into this workspace.</li>
          <li>Cannot inspect your computer's filesystem — by design.</li>
          <li>A baseline is trusted only if its integrity and origin are protected.</li>
          <li>A matching hash proves byte-identity, not safety or freedom from malware.</li>
          <li>Uploaded files are stored under generated names and never executed.</li>
        </ul>
      </Card>
    </div>
  );
}
