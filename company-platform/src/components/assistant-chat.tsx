'use client';

/**
 * The assistant panel, shared by both companies with different content.
 *
 * It renders nothing but a switched-off notice when the deployment has no model:
 * a chat box that cannot answer is worse than an honest sentence. When a model is
 * configured the answer streams in, and the material it was allowed to use is
 * listed underneath it.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AssistantName } from '@/content/assistants';
import { citationsFrom, takeFrames, textField, type Citation } from '@/lib/assistant/sse';

interface Turn {
  role: 'user' | 'assistant';
  text: string;
  citations: Citation[];
  pending?: boolean;
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
        { role: 'user', text: message, citations: [] },
        { role: 'assistant', text: '', citations: [], pending: true },
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
            if (event.name === 'delta') {
              const chunk = textField(event.data, 'text');
              patchLast((turn) => ({ ...turn, text: turn.text + chunk }));
            } else if (event.name === 'citations') {
              const citations = citationsFrom(event.data);
              patchLast((turn) => ({ ...turn, citations }));
            } else if (event.name === 'error') {
              setError(textField(event.data, 'message'));
              patchLast((turn) => ({ ...turn, pending: false }));
            } else if (event.name === 'done') {
              patchLast((turn) => ({ ...turn, pending: false }));
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
          <code className="text-xs">ASSISTANT_MODEL</code> and <code className="text-xs">ASSISTANT_API_KEY</code>;
          a Hugging Face token or a local model both work. The rest of the site is unaffected.
        </p>
      </div>
    );
  }

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
              <button key={starter} type="button" className="btn btn-secondary text-left text-xs" onClick={() => void send(starter)}>
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
            className="min-h-16 rounded-md border border-line bg-transparent p-2"
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
    </section>
  );
}
