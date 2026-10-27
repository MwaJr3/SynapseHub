import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { SIMULATOR_NOTICE, channelTone, jobTone } from './utils';
import { Badge, Card, EmptyState, ErrorBanner, Loading } from './ui';

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

export function StudioPage() {
  const [lessons, error, reload] = useAsync(() => api.lessons(), []);
  const [channel, setChannel] = useState('sms');
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [preview, setPreview] = useState<import('./api').Preview | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Content studio & channel previews</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <Card title="Create a micro-lesson">
        <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
          e.preventDefault();
          setActionError('');
          try {
            const response = await fetch('/api/lessons', {
              method: 'POST', credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, body, question: 'Practice question?', options: ['A', 'B'], answer_index: 0 }),
            });
            if (!response.ok) throw new Error('Create failed (educators only).');
            setTitle(''); setBody('');
            reload();
          } catch (err) { setActionError(err instanceof Error ? err.message : 'Create failed.'); }
        }}>
          <input className="input" aria-label="Lesson title" placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="input flex-1" aria-label="Short body" placeholder="Short body (text-first)" value={body} onChange={(e) => setBody(e.target.value)} />
          <button className="btn-primary">Create</button>
        </form>
      </Card>
      <div className="flex gap-2">
        <select className="input max-w-xs" aria-label="Preview channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="sms">SMS preview</option>
          <option value="ussd">USSD menu preview</option>
          <option value="ivr">IVR script preview</option>
          <option value="web">Web preview</option>
        </select>
        <Badge tone={channelTone(channel)}>{channel.toUpperCase()}</Badge>
      </div>
      {!lessons ? <Loading /> : lessons.length === 0 ? (
        <EmptyState title="No lessons" hint="Create a micro-lesson above." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {lessons.map((lesson) => (
            <Card key={lesson.id}>
              <div className="font-medium">{lesson.title} <span className="text-xs text-slate-500">#{lesson.sequence} · {lesson.topic}</span></div>
              <p className="mt-1 text-sm text-slate-300">{lesson.body}</p>
              <button className="btn-ghost mt-2" onClick={async () => {
                setPreviewId(lesson.id);
                setPreview(await api.preview(lesson.id, channel));
              }}>Preview as {channel.toUpperCase()}</button>
              {previewId === lesson.id && preview ? (
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
                  {preview.segments ? `segments: ${preview.segments} (${preview.charset})\n\n` : ''}
                  {preview.menu ?? preview.script ?? preview.body ?? ''}
                  {preview.parts ? `\n\nparts:\n${preview.parts.join('\n---\n')}` : ''}
                </pre>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function DeliveryPage() {
  const [jobs, error, reload] = useAsync(() => api.jobs(), []);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Delivery queue</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <div className="rounded-lg border border-amber-800 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">{SIMULATOR_NOTICE}</div>
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      <button className="btn-primary" onClick={async () => {
        setActionError('');
        try {
          const result = await api.createJob({ channel: 'sms', kind: 'nudge', body: 'Time for today\'s practice! (simulated)', local_hour: 12 });
          setMessage(result.blocked_reason ? `Blocked: ${result.blocked_reason}` : `Job ${result.state}. ${result.provider_note ?? ''}`);
          reload();
        } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Send failed.'); }
      }}>Queue a simulated nudge</button>
      {!jobs ? <Loading /> : jobs.length === 0 ? (
        <EmptyState title="Queue is empty" hint="Queued sends appear here with their states." />
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="card flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone={jobTone(job.state)}>{job.state}</Badge>
                  <Badge tone={channelTone(job.channel)}>{job.channel}</Badge>
                  <span className="text-xs text-slate-500">{job.kind}</span>
                  {job.simulator ? <Badge tone="bg-amber-950 text-amber-300 border border-amber-800">simulator</Badge> : null}
                </div>
                <div className="mt-1 text-sm text-slate-300">{job.body}</div>
              </div>
              <span className="font-mono text-xs text-slate-500">{job.provider_uid}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  const [provider] = useAsync(() => api.provider(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">{user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}</p>
      </Card>
      <Card title="Provider & consent rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Current provider: {provider ? `${provider.provider} — ${provider.message}` : '…'}</li>
          <li>Non-essential messages require recorded consent; STOP unsubscribes immediately.</li>
          <li>Quiet hours and daily frequency caps are enforced per subscription.</li>
          <li>Provider callbacks are validated and idempotent (retries never double-count).</li>
          <li>Phone numbers are protected and redacted where feasible.</li>
          <li>Demo data is simulated; no messages reach real recipients.</li>
        </ul>
      </Card>
    </div>
  );
}
