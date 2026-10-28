'use client';

/**
 * The assistant panel, shared by both companies with different content.
 *
 * Behaviour worth knowing:
 * - With no model configured it renders a switched-off notice. A chat box that
 *   cannot answer is worse than an honest sentence.
 * - Each answer carries the trace of the flow that produced it, and the material
 *   it was allowed to use.
 * - "Hand this to a person" creates a support request. It asks for confirmation
 *   first, and the server refuses to create anything without it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AssistantName } from '@/content/assistants';
import { citationsFrom, takeFrames, textField, type Citation } from '@/lib/assistant/sse';

interface TraceStep {
  label: string;
  detail: string;
  ok: boolean;
}

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  citations: Citation[];
  steps: TraceStep[];
  pending?: boolean;
  /** Why the finished answer did not meet what the flow said it would produce. */
  problems?: string[];
}

const FIELD = 'rounded-md border border-line bg-transparent p-2 text-sm';

function parseProblems(payload: Record<string, unknown>): string[] {
  const raw = payload.problems;
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === 'string');
}

function parseSteps(payload: Record<string, unknown>): TraceStep[] {
  const raw = payload.steps;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const label = (entry as { label?: unknown }).label;
    const detail = (entry as { detail?: unknown }).detail;
    const ok = (entry as { ok?: unknown }).ok;
    if (typeof label !== 'string' || typeof detail !== 'string') return [];
    return [{ label, detail, ok: ok !== false }];
  });
}

export function AssistantChat({
  name,
  title,
  intro,
  scope,
  starters,
}: {
  name: AssistantName;
  title: string;
  intro: string;
  scope: string;
  starters: string[];
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (message.length < 2 || streaming) return;

      setError(null);
      setDraft('');
      setStreaming(true);
      const history = turns.map((turn) => ({ role: turn.role, text: turn.text }));
      setTurns((current) => [
        ...current,
        { role: 'user', text: message, citations: [], steps: [] },
        { role: 'assistant', text: '', citations: [], steps: [], pending: true },
      ]);

      const patchLast = (update: (turn: Turn) => Turn) =>
        setTurns((current) => {
          const next = [...current];
          for (let index = next.length - 1; index >= 0; index -= 1) {
            const turn = next[index];
            if (turn?.pending) {
              next[index] = update(turn);
              break;
            }
          }
          return next;
        });

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(`/api/assistant/${name}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
          body: JSON.stringify({ message, history }),
          signal: controller.signal,
        });

        if (response.status === 503) {
          const payload = (await response.json()) as { reason?: unknown };
          setConfigured(false);
          setReason(typeof payload.reason === 'string' ? payload.reason : 'This assistant is not configured.');
          patchLast((turn) => ({ ...turn, pending: false, text: '' }));
          return;
        }

        if (!response.ok || !response.body) {
          setError(`The assistant is unavailable (${response.status}).`);
          patchLast((turn) => ({ ...turn, pending: false }));
          return;
        }

        setConfigured(true);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = takeFrames(buffer);
          buffer = parsed.rest;

          for (const event of parsed.events) {
            if (event.name === 'step') {
              const steps = parseSteps(event.data);
              patchLast((turn) => ({ ...turn, steps }));
            } else if (event.name === 'delta') {
              const chunk = textField(event.data, 'text');
              patchLast((turn) => ({ ...turn, text: turn.text + chunk }));
            } else if (event.name === 'citations') {
              const citations = citationsFrom(event.data);
              patchLast((turn) => ({ ...turn, citations }));
            } else if (event.name === 'error') {
              setError(textField(event.data, 'message'));
              patchLast((turn) => ({ ...turn, pending: false }));
            } else if (event.name === 'done') {
              const problems = parseProblems(event.data);
              patchLast((turn) => ({ ...turn, pending: false, problems }));
            }
          }
        }
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
          setError('The connection dropped before the answer finished.');
        }
        patchLast((turn) => ({ ...turn, pending: false }));
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [name, streaming, turns],
  );

  if (configured === false) {
    return (
      <div className="card mt-6">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{reason}</p>
        <p className="mt-2 text-sm text-muted">
          This deployment has no model configured, so the assistant is switched off rather than shown as a chat box
          that cannot answer. An operator sets <code className="text-xs">ASSISTANT_BASE_URL</code>,{' '}
          <code className="text-xs">ASSISTANT_MODEL</code> and <code className="text-xs">ASSISTANT_API_KEY</code>; a
          Hugging Face token or a local model both work. The rest of the site is unaffected.
        </p>
      </div>
    );
  }

  const canHandOff = turns.some((turn) => turn.role === 'assistant' && turn.text.trim().length > 0);

  return (
    <section className="card mt-6" aria-labelledby={`${name}-heading`}>
      <h2 id={`${name}-heading`} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted">{intro}</p>
      <p className="mt-1 text-xs text-muted">{scope}</p>

      <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1" aria-live="polite">
        {turns.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {starters.map((starter) => (
              <button
                key={starter}
                type="button"
                className="btn btn-secondary text-left text-xs"
                onClick={() => void send(starter)}
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}

        {turns.map((turn, index) => (
          <div
            key={`${turn.role}-${index}`}
            className={`rounded-md p-3 text-sm ${turn.role === 'user' ? 'accent-soft ml-6' : 'border border-line mr-6'}`}
          >
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted">
              {turn.role === 'user' ? 'You' : 'Assistant'}
            </p>
            <p className="whitespace-pre-wrap">
              {turn.text}
              {turn.pending && !turn.text ? <span className="text-muted"> working…</span> : null}
            </p>

            {turn.role === 'assistant' && turn.steps.length > 0 ? (
              <details className="mt-2 text-xs text-muted">
                <summary className="cursor-pointer">How this was produced</summary>
                <ol className="mt-1 grid gap-1 pl-4" style={{ listStyle: 'decimal' }}>
                  {turn.steps.map((step) => (
                    <li key={step.label} className={step.ok ? '' : 'text-danger'}>
                      {step.label} — {step.detail}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}

            {turn.problems && turn.problems.length > 0 ? (
              <div className="mt-2 rounded border p-2 text-xs" style={{ borderColor: 'var(--danger)' }}>
                <p className="font-semibold text-danger">This answer is incomplete</p>
                <ul className="mt-1 list-disc pl-4 text-muted">
                  {turn.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
                <p className="mt-1 text-muted">
                  It did not meet the shape this assistant promises, so it is shown as unfinished rather than
                  presented as a complete answer.
                </p>
              </div>
            ) : null}

            {turn.citations.length > 0 ? (
              <ul className="mt-2 grid gap-1 text-xs text-muted">
                {turn.citations.map((citation) => (
                  <li key={citation.id}>Used: {citation.title}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-md border border-line p-3 text-sm">
          {error}
        </p>
      ) : null}

      <form
        className="mt-3 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <label className="grid flex-1 gap-1 text-sm" htmlFor={`${name}-message`}>
          <span className="font-medium">Your message</span>
          <textarea
            id={`${name}-message`}
            className={`min-h-16 ${FIELD}`}
            rows={2}
            maxLength={4000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
            placeholder="Describe the problem or what you are studying…"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={streaming || draft.trim().length < 2}>
          {streaming ? 'Streaming…' : 'Send'}
        </button>
        {streaming ? (
          <button type="button" className="btn btn-secondary" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : null}
      </form>

      <p className="mt-2 text-xs text-muted">
        Answers come from this site’s own pages. Never paste passwords, keys or personal data into this box.
      </p>

      {canHandOff ? <Handoff name={name} turns={turns} /> : null}
    </section>
  );
}

function Handoff({ name, turns }: { name: AssistantName; turns: Turn[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ reference: string; companyName: string } | null>(null);

  if (created) {
    return (
      <div className="mt-4 rounded-md border border-line p-3 text-sm" role="status">
        <p className="font-medium">Sent to {created.companyName}. Reference {created.reference}</p>
        <p className="mt-1 text-xs text-muted">
          Quote that reference if you follow up. It is stored for the team to read; this page cannot promise how
          quickly anyone will reply.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-4 border-t border-line pt-3">
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
          Hand this to a person
        </button>
        <span className="ml-2 text-xs text-muted">Sends the conversation so far, and where to reply.</span>
      </div>
    );
  }

  return (
    <form
      className="mt-4 grid gap-2 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        void (async () => {
          setSubmitting(true);
          setErrors({});
          try {
            const response = await fetch(`/api/assistant/${name}/handoff`, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                confirmed,
                name: form.name,
                email: form.email,
                message: form.message,
                transcript: turns.map((turn) => ({ role: turn.role, text: turn.text })).filter((turn) => turn.text),
              }),
            });
            const payload = (await response.json()) as {
              reference?: string;
              companyName?: string;
              fieldErrors?: Record<string, string>;
            };
            if (response.status === 201 && payload.reference) {
              setCreated({ reference: payload.reference, companyName: payload.companyName ?? '' });
              return;
            }
            setErrors(payload.fieldErrors ?? { message: 'That could not be sent. Please try again.' });
          } catch {
            setErrors({ message: 'That could not be sent. Please try again.' });
          } finally {
            setSubmitting(false);
          }
        })();
      }}
    >
      <h3 className="text-sm font-semibold">Send this to a person</h3>
      <p className="text-xs text-muted">
        Nothing is created until you confirm below. The conversation above is included so nobody has to repeat it.
      </p>

      <label className="grid gap-1 text-sm" htmlFor={`${name}-handoff-name`}>
        <span>Name</span>
        <input
          id={`${name}-handoff-name`}
          className={FIELD}
          value={form.name}
          maxLength={120}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
        />
        {errors.name ? <span className="text-xs text-danger">{errors.name}</span> : null}
      </label>

      <label className="grid gap-1 text-sm" htmlFor={`${name}-handoff-email`}>
        <span>Reply address</span>
        <input
          id={`${name}-handoff-email`}
          type="email"
          className={FIELD}
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        {errors.email ? <span className="text-xs text-danger">{errors.email}</span> : null}
      </label>

      <label className="grid gap-1 text-sm" htmlFor={`${name}-handoff-message`}>
        <span>What should a person look at?</span>
        <textarea
          id={`${name}-handoff-message`}
          className={FIELD}
          rows={3}
          maxLength={4000}
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
        />
        {errors.message ? <span className="text-xs text-danger">{errors.message}</span> : null}
      </label>

      <label className="flex items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5"
        />
        <span>Send these details and the conversation to the team. I understand nothing is emailed to me.</span>
      </label>
      {errors.confirmed ? <span className="text-xs text-danger">{errors.confirmed}</span> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send to the team'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
