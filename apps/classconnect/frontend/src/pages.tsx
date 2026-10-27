import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { NO_FAKE_VIDEO, localTime, sessionTone } from './utils';
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

export function SchedulePage({ user }: { user: User }) {
  const [provider] = useAsync(() => api.provider(), []);
  const [classes, error, reload] = useAsync(() => api.classes(), []);
  const [sessions, , reloadSessions] = useAsync(() => api.sessions(), []);
  const [className, setClassName] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionStart, setSessionStart] = useState('');
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const canTeach = user.role === 'teacher' || user.role === 'admin';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Classes & schedule</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {message ? (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-200">{message}</div>
      ) : null}
      {provider ? (
        <div className={`rounded-lg border px-3 py-2 text-xs ${provider.available ? 'border-emerald-800 text-emerald-200' : 'border-amber-800 text-amber-200'}`}>
          <strong>Live audio/video:</strong> {provider.message}
          <div className="mt-1 text-slate-400">Low-bandwidth policy: {provider.low_bandwidth.video}</div>
        </div>
      ) : null}
      {canTeach ? (
        <Card title="Create class & session">
          <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
            e.preventDefault();
            setActionError('');
            try {
              if (className) {
                const cls = await api.createClass(className, '');
                setSelectedClass(cls.id);
                setClassName('');
              }
              const classId = selectedClass ?? classes?.[0]?.id;
              if (sessionTitle && sessionStart && classId) {
                await api.createSession(classId, sessionTitle, new Date(sessionStart).toISOString());
                setSessionTitle('');
                setSessionStart('');
                reloadSessions();
              }
            } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Create failed.'); }
          }}>
            <input className="input" aria-label="New class name" value={className} onChange={(e) => setClassName(e.target.value)} />
            <input className="input" aria-label="Session title" value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} />
            <input className="input" type="datetime-local" aria-label="Session start" value={sessionStart} onChange={(e) => setSessionStart(e.target.value)} />
            <button className="btn-primary">Create</button>
          </form>
          <p className="mt-2 text-xs text-slate-400">Times are stored in UTC and displayed in your local timezone. Overlapping sessions are rejected as conflicts.</p>
        </Card>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Classes">
          {!classes ? <Loading /> : classes.length === 0 ? (
            <EmptyState title="No classes" hint="Join a class or create one." />
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-slate-400">{c.subject || 'no subject'}</div>
                  </div>
                  {c.member ? <Badge tone="bg-emerald-950 text-emerald-300 border border-emerald-800">member</Badge> : (
                    <button className="btn-ghost" onClick={async () => { await api.joinClass(c.id); reload(); }}>Join</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Sessions">
          {!sessions ? <Loading /> : sessions.length === 0 ? (
            <EmptyState title="No sessions" hint="Sessions appear for classes you belong to." />
          ) : (
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Badge tone={sessionTone(s.status)}>{s.status}</Badge>{' '}
                      <span className="font-medium">{s.title}</span>
                      <div className="text-xs text-slate-400">{localTime(s.start_at)} · recording: {s.recording_consent === 'yes' ? 'consented' : 'off'}</div>
                    </div>
                    {canTeach ? (
                      <div className="flex flex-wrap gap-1">
                        {['starting', 'live', 'ended', 'cancelled'].filter((t) => t !== s.status).map((t) => (
                          <button key={t} className="btn-ghost" onClick={async () => {
                            setActionError('');
                            try {
                              await api.transition(s.id, t, t === 'ended' ? 'Session summary recorded by teacher.' : '');
                              reloadSessions();
                            } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Transition failed.'); }
                          }}>{t}</button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button className="btn-ghost mt-2" onClick={async () => {
                    setActionError('');
                    try {
                      const result = await api.roomToken(s.id);
                      setMessage(`Room token issued (expires in ${result.expires_in_seconds}s). ${result.provider.message}`);
                    } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Token failed.'); }
                  }}>Request room token</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export function RoomPage({ user }: { user: User }) {
  const [sessions] = useAsync(() => api.sessions(), []);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, error, reload] = useAsync(() => (sessionId ? api.messages(sessionId) : Promise.resolve([])), [sessionId]);
  const [attendance] = useAsync(() => (sessionId ? api.attendance(sessionId) : Promise.resolve({ counts: {} as Record<string, number>, total: 0 })), [sessionId]);
  const [text, setText] = useState('');
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Session room (async & chat)</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <select className="input max-w-md" value={sessionId ?? ''} onChange={(e) => setSessionId(Number(e.target.value))}>
        <option value="">Select a session…</option>
        {(sessions ?? []).map((s) => <option key={s.id} value={s.id}>{s.title} ({s.status})</option>)}
      </select>
      {sessionId ? (
        <div className="grid gap-3 lg:grid-cols-3">
          <Card title="Chat & question queue">
            <ul className="space-y-1">
              {(messages ?? []).map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs">
                  <Badge tone={m.kind === 'question' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300 border border-slate-700'}>{m.kind}</Badge>{' '}
                  {m.body}
                  {(user.role === 'teacher' || user.role === 'admin') ? (
                    <button className="btn-ghost ml-2" onClick={async () => { await api.moderate(m.id, 'hide'); reload(); }}>Hide</button>
                  ) : null}
                </li>
              ))}
            </ul>
            <form className="mt-2 flex gap-2" onSubmit={async (e) => {
              e.preventDefault();
              await api.postMessage(sessionId, 'chat', text);
              setText('');
              reload();
            }}>
              <input className="input flex-1" aria-label="Message or question" placeholder="Message or question…" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn-primary">Send</button>
            </form>
            <button className="btn-ghost mt-2" onClick={async () => {
              const q = window.prompt('Your question:');
              if (q) { await api.postMessage(sessionId, 'question', q); reload(); }
            }}>Raise a question</button>
          </Card>
          <Card title="Attendance">
            <StatCard label="Total records" value={attendance?.total ?? 0} />
            <ul className="mt-2 space-y-1">
              {Object.entries(attendance?.counts ?? ({} as Record<string, number>)).map(([state, count]) => (
                <li key={state} className="flex justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-xs">
                  <span>{state}</span><span>{String(count)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Follow-up assignments">
            <FollowUp sessionId={sessionId} />
          </Card>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One assignment with its answer inline.
 *
 * The previous version asked for the answer in `window.prompt` and confirmed it in
 * `alert`. A prompt cannot be labelled, sized, or cancelled without losing the
 * typing, and neither of the two can be read by a screen reader in context. The
 * answer box now sits under the question it answers, and the result is announced
 * next to the button that produced it.
 */
type Assignment = { id: number; title: string; body: string };

function FollowUpItem({ assignment, onSubmitted }: { assignment: Assignment; onSubmitted: () => void }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inputId = `answer-${assignment.id}`;

  return (
    <li className="rounded-lg border border-slate-800 px-3 py-2 text-xs">
      <strong>{assignment.title}</strong> — {assignment.body}
      <form
        className="mt-2 flex flex-wrap items-start gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!body.trim()) return;
          setBusy(true);
          setError('');
          setMessage('');
          try {
            await api.submit(assignment.id, body);
            setBody('');
            setMessage('Submitted for review.');
            onSubmitted();
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not submit your answer.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Your answer to {assignment.title}
        </label>
        <textarea
          id={inputId}
          className="input min-h-[2.25rem] flex-1"
          rows={1}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Your answer"
        />
        <button className="btn-primary" disabled={busy || !body.trim()} aria-describedby={`${inputId}-hint`}>
          {busy ? 'Submitting…' : 'Submit'}
        </button>
        <span id={`${inputId}-hint`} className="self-center text-slate-400">
          {body.trim() ? 'Send this to the class owner.' : 'Write an answer to enable Submit.'}
        </span>
      </form>
      {message ? <p className="mt-1 text-emerald-300" role="status">{message}</p> : null}
      {error ? <p className="mt-1 text-rose-300" role="alert">{error}</p> : null}
    </li>
  );
}

function FollowUp({ sessionId }: { sessionId: number }) {
  const [assignments, error, reload] = useAsync(() => api.assignments(sessionId), [sessionId]);
  return (
    <div>
      {error ? <ErrorBanner message={error} /> : null}
      <ul className="space-y-1">
        {(assignments ?? []).map((a) => (
          <FollowUpItem key={a.id} assignment={a} onSubmitted={reload} />
        ))}
        {(assignments ?? []).length === 0 ? <li className="text-xs text-slate-400">No follow-up assignments yet.</li> : null}
      </ul>
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
      <Card title="Integration & safeguarding rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>{NO_FAKE_VIDEO}</li>
          <li>Recording is off by default and requires explicit consent per session.</li>
          <li>Room tokens are short-lived, signed by the backend and grant join permission only.</li>
          <li>Teachers moderate chat by hiding content (history preserved).</li>
          <li>Demo data is simulated and fictional.</li>
        </ul>
        {provider && !provider.available ? <p className="mt-2 text-xs text-amber-300">{provider.message}</p> : null}
      </Card>
    </div>
  );
}
