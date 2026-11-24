import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { AI_DISCLAIMER, conversationToText, modeTone } from './utils';
import { BlurFade } from './decor';
import { Badge, Card, ConfirmButton, EmptyState, ErrorBanner, Field, Loading } from './ui';


/**
 * Flag a reply, with the reason written where the reply is.
 *
 * `window.prompt` for the reason and `alert` for the confirmation meant the
 * evidence a teacher needs arrived in a box that could not be read after it closed.
 * The reason is now part of the message, and the acknowledgement stays beside it.
 */
function FlagButton({ messageId }: { messageId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [error, setError] = useState('');
  const inputId = `flag-reason-${messageId}`;

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)} aria-expanded={false}>
        Flag
      </button>
    );
  }

  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!reason.trim()) return;
        setBusy(true);
        setError('');
        try {
          await api.flag(messageId, reason);
          setDone('Flagged for teacher review. Thank you.');
          setOpen(false);
          setReason('');
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Could not flag this reply.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Why is this explanation confusing or incorrect?
      </label>
      <input
        id={inputId}
        className="input flex-1"
        placeholder="Why is this explanation wrong or confusing?"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <button className="btn-primary" disabled={busy || !reason.trim()} aria-describedby={`${inputId}-hint`}>
        {busy ? 'Sending…' : 'Send flag'}
      </button>
      <button type="button" className="btn-ghost" onClick={() => { setOpen(false); setReason(''); }}>
        Cancel
      </button>
      <span id={`${inputId}-hint`} className="text-xs text-slate-400">
        A reason is required so the teacher can act on it.
      </span>
      {done ? <span className="text-xs text-emerald-300" role="status">{done}</span> : null}
      {error ? <span className="text-xs text-rose-300" role="alert">{error}</span> : null}
    </form>
  );
}

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

export function ChatPage({ user: _user }: { user: User }) {
  const [config] = useAsync(() => api.config(), []);
  const [mode, setMode] = useState('Explain');
  const [topic, setTopic] = useState('');
  const [question, setQuestion] = useState(() => { try { return localStorage.getItem('tutorspring.questionDraft') ?? ''; } catch { return ''; } });
  useEffect(() => {
    try { if (question) localStorage.setItem('tutorspring.questionDraft', question); else localStorage.removeItem('tutorspring.questionDraft'); } catch { /* storage unavailable */ }
  }, [question]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [thread, setThread] = useState<{ id: number; role: string; text: string; sources: { source_id: number; title: string; topic: string }[]; demo_response: boolean }[]>([]);
  const [actionError, setActionError] = useState('');
  const [history, , reloadHistory] = useAsync(() => api.conversations(), []);

  const send = async () => {
    setActionError('');
    try {
      const reply = await api.chat(mode, question, topic, conversationId);
      setConversationId(reply.conversation_id);
      setThread((prev) => [
        ...prev,
        { id: 0, role: 'user', text: question, sources: [], demo_response: false },
        { id: reply.message_id, role: 'assistant', text: reply.text, sources: reply.sources, demo_response: reply.demo_response },
      ]);
      setQuestion('');
      reloadHistory();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Chat failed.');
    }
  };

  return (
    <div className="space-y-4">
      <BlurFade><h1 className="text-xl font-semibold">Tutor chat</h1></BlurFade>
      {actionError ? <ErrorBanner message={actionError} /> : null}
      {config ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
          Provider: <strong>{config.provider}</strong> {config.demo_mode ? '· DEMO MODE active' : '· live provider'} — {config.note}
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Ask the tutor">
          <div className="space-y-3">
            <Field label="Mode">
              <select className="input" value={mode} onChange={(e) => setMode(e.target.value)}>
                {(config?.modes ?? ['Explain']).map((m) => <option key={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Topic (optional)">
              <input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. fractions" />
            </Field>
            <Field label="Your question">
              <textarea className="input h-24" value={question} onChange={(e) => setQuestion(e.target.value)} />
            </Field>
            <button
              className="btn-primary w-full justify-center"
              disabled={!question.trim()}
              aria-describedby="ask-hint"
              onClick={() => void send()}
            >
              Send
            </button>
            <p id="ask-hint" className="text-xs text-slate-400">
              Type a question to enable Send.{question ? ' Your draft is kept on this device until you send it.' : ''}
            </p>
            <button className="btn-ghost w-full justify-center" onClick={() => { setThread([]); setConversationId(null); }}>New conversation</button>
          </div>
        </Card>
        <Card title="Conversation">
          {thread.length === 0 ? (
            <EmptyState title="No messages yet" hint="Ask about a topic covered by the approved material." />
          ) : (
            <div className="space-y-3">
              {thread.map((m, i) => (
                <div key={i} className={`rounded-lg border p-3 text-sm ${m.role === 'user' ? 'border-slate-700 bg-slate-900' : 'border-slate-800'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-xs uppercase text-slate-400">{m.role}</strong>
                    {m.role === 'assistant' ? <Badge tone={modeTone(m.demo_response)}>{m.demo_response ? 'demo response' : 'live model'}</Badge> : null}
                    {m.role === 'assistant' && m.id > 0 ? <FlagButton messageId={m.id} /> : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-slate-300">{m.text}</p>
                  {m.sources.length > 0 ? (
                    <div className="mt-2 text-xs text-slate-400">
                      Sources: {m.sources.map((s) => `${s.title} (${s.topic})`).join(' · ')}
                    </div>
                  ) : null}
                </div>
              ))}
              <p className="text-xs text-slate-400">{AI_DISCLAIMER}</p>
              <button type="button" className="btn-ghost" onClick={() => {
                const url = URL.createObjectURL(new Blob([conversationToText(thread)], { type: 'text/plain' }));
                const a = document.createElement('a'); a.href = url; a.download = 'tutor-conversation.txt'; a.click(); URL.revokeObjectURL(url);
              }}>Download conversation (.txt)</button>
            </div>
          )}
        </Card>
        <Card title="My conversations">
          <ul className="space-y-1">
            {(history ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-xs">
                <button className="text-left" onClick={async () => {
                  const detail = await api.conversation(c.id);
                  setConversationId(c.id);
                  setThread(detail.messages);
                }}>
                  {c.topic || 'untitled'} · {c.mode}
                </button>
                <ConfirmButton label="Delete" confirmMessage="Delete this conversation and its history?"
                  onConfirm={async () => { await api.deleteConversation(c.id); reloadHistory(); }} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

export function SourcesPage({ user }: { user: User }) {
  const [sources, error, reload] = useAsync(() => api.sources(), []);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [body, setBody] = useState('');
  const [actionError, setActionError] = useState('');
  const canEdit = user.role === 'teacher' || user.role === 'admin';
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Approved learning material</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {canEdit ? (
        <Card title="Add approved source">
          <form className="grid gap-3 md:grid-cols-3" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.createSource(title, topic, body);
              setTitle(''); setTopic(''); setBody('');
              reload();
            } catch (err) {
              setActionError(err instanceof Error ? err.message : 'Create failed.');
            }
          }}>
            <Field label="Title"><input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Topic"><input className="input" required value={topic} onChange={(e) => setTopic(e.target.value)} /></Field>
            <Field label="Body"><textarea className="input h-20" required value={body} onChange={(e) => setBody(e.target.value)} /></Field>
            <button className="btn-primary md:col-span-3 justify-center">Add source</button>
          </form>
        </Card>
      ) : null}
      {!sources ? <Loading /> : sources.length === 0 ? (
        <EmptyState title="No approved sources" hint="Teachers can add curriculum passages." />
      ) : (
        <div className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="card">
              <div className="font-medium">{s.title} <span className="text-xs text-slate-400">· {s.topic} · {s.grade}</span></div>
              <p className="mt-1 text-sm text-slate-300">{s.body_preview}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReviewPage() {
  const [queue, error, reload] = useAsync(async () => {
    const response = await fetch('/api/review-queue', { credentials: 'same-origin' });
    return (await response.json()) as { id: number; text: string; flag_reason: string; review_status: string }[];
  }, []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Flagged explanations — review queue</h1>
      {error ? <ErrorBanner message={error} /> : null}
      {!queue ? <Loading /> : queue.length === 0 ? (
        <EmptyState title="Queue is empty" hint="Learner-flagged explanations appear here." />
      ) : (
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="card">
              <div className="text-xs text-slate-400">Reason: {item.flag_reason} · status: {item.review_status || 'pending'}</div>
              <p className="mt-1 text-sm text-slate-300">{item.text.slice(0, 400)}</p>
              <div className="mt-2 flex gap-2">
                <button className="btn-primary" onClick={async () => {
                  await fetch(`/api/messages/${item.id}/review`, {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ decision: 'approved', note: 'reviewed' }),
                  });
                  reload();
                }}>Approve</button>
                <button className="btn-ghost" onClick={async () => {
                  await fetch(`/api/messages/${item.id}/review`, {
                    method: 'POST', credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ decision: 'hidden', note: 'hidden after review' }),
                  });
                  reload();
                }}>Hide</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  const [config] = useAsync(() => api.config(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">{user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}</p>
      </Card>
      <Card title="Provider & honesty rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Current provider: {config ? `${config.provider} (${config.demo_mode ? 'demo mode — prepared responses, labelled as such' : 'live model'})` : '…'}</li>
          <li>Answers are grounded in approved sources with visible citations; unsupported questions get an explicit refusal to guess.</li>
          <li>{AI_DISCLAIMER}</li>
          <li>Flagged explanations go to a private teacher review queue.</li>
          <li>Conversations can be deleted by their owner; teacher summaries are aggregate-only.</li>
        </ul>
      </Card>
    </div>
  );
}
