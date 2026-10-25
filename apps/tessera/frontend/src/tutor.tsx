/** The AI tutor: grounded retrieval, and a streamed conversation.
 *
 * Two things are deliberately separate here:
 *
 * 1. Grounded search (`/api/tutor/search`). It needs no API key, returns
 *    curriculum passages with citations, and says plainly that no model wrote
 *    anything. It works on every deployment.
 * 2. The conversation (`/api/tutor/chat`). It only renders when the backend
 *    reports a model. Without one the panel is not mounted at all — an empty
 *    chat box that cannot answer would be a fake integration.
 *
 * The conversation is our own: a POST of one turn, answered with Server-Sent
 * Events and read with `fetch`. There is no vendor chat SDK, no iframe and no
 * third-party script — earlier versions used OpenAI's ChatKit for this, and the
 * parts worth keeping (threads, streaming, citations, retryable errors) are
 * reimplemented here in about a hundred lines.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  api,
  ApiError,
  streamTutorChat,
  type TutorMessage,
  type TutorPassage,
  type TutorStatus,
  type TutorThread,
} from './api';
import { Badge, Card, ErrorNote, Loading, SectionTitle } from './ui';

const muted = 'text-[color:var(--muted)]';

export function TutorPage() {
  const [status, setStatus] = useState<TutorStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .tutorStatus()
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : 'The tutor status could not be read.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorNote message={error} />;
  if (!status) {
    return (
      <Card>
        <Loading label="Checking whether the tutor is configured" />
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="The tutor answers from this curriculum only. It cannot see anything outside it, and it will say so rather than improvise.">
          AI tutor
        </SectionTitle>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={status.configured ? 'good' : 'warn'}>
            {status.configured ? 'conversation enabled' : 'conversation not configured'}
          </Badge>
          <Badge>grounded search always available</Badge>
          {status.configured ? (
            <span className={`text-xs ${muted}`}>
              {status.provider === 'openai' ? 'OpenAI' : status.provider} · {status.model}
              {status.key_source ? ` · key from ${status.key_source}` : ' · no key needed'}
            </span>
          ) : null}
        </div>
        <p className={`mt-2 text-sm ${muted}`}>{status.reason}</p>
        {!status.configured ? (
          <p className={`mt-2 text-sm ${muted}`}>
            Grounded search below runs with no model at all: it returns the passages the curriculum actually contains,
            each with its citation and licence. Nothing is generated, and nothing is simulated.
          </p>
        ) : null}
      </Card>

      <GroundedSearch />

      {status.configured ? <TutorConversation /> : <NotConfigured missing={status.missing} />}
    </div>
  );
}

const FREE_OPTIONS = [
  {
    name: 'Hugging Face Inference Providers',
    detail: 'One token, many open-weight models. The same weights can be served locally later.',
    base: 'https://router.huggingface.co/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
  },
  {
    name: 'Groq',
    detail: 'Free tier, no card. Very fast.',
    base: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-20b',
  },
  {
    name: 'OpenRouter',
    detail: 'Models whose id ends in :free cost nothing; modest daily cap.',
    base: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat-v3:free',
  },
  {
    name: 'Ollama, on this machine',
    detail: 'No account, no quota, nothing leaves the machine. Needs the model downloaded.',
    base: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:3b',
  },
];

function NotConfigured({ missing }: { missing: string[] }) {
  return (
    <Card>
      <SectionTitle>Conversation is switched off on this deployment</SectionTitle>
      <p className={`text-sm ${muted}`}>
        The service is missing {missing.length > 0 ? missing.join(', ') : 'a model key'}. An operator sets it in the
        environment; it never reaches the browser or this repository. Until then the chat panel is not rendered
        rather than shown broken.
      </p>
      <p className={`mt-3 text-sm ${muted}`}>
        The tutor is not tied to any one vendor. Anything that speaks the OpenAI chat-completions format works, and
        several options are free. Set these three variables and restart the backend:
      </p>
      <ul className="mt-3 grid gap-2">
        {FREE_OPTIONS.map((option) => (
          <li key={option.name} className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
            <p className="font-medium">{option.name}</p>
            <p className={`text-xs ${muted}`}>{option.detail}</p>
            <p className={`mt-1 font-mono text-xs ${muted}`}>TESSERA_TUTOR_BASE_URL={option.base}</p>
            <p className={`font-mono text-xs ${muted}`}>TESSERA_TUTOR_MODEL={option.model}</p>
            <p className={`font-mono text-xs ${muted}`}>TESSERA_TUTOR_API_KEY=&lt;that provider's token&gt;</p>
          </li>
        ))}
      </ul>
      <p className={`mt-3 text-xs ${muted}`}>
        This environment cannot reach any model provider, so the panel stays switched off here whatever key is
        entered. Run the app locally or deploy it where outbound HTTPS is allowed.
      </p>
    </Card>
  );
}

function GroundedSearch() {
  const [question, setQuestion] = useState('');
  const [passages, setPassages] = useState<TutorPassage[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    setError(null);
    try {
      const response = await api.tutorSearch(question);
      setPassages(response.passages);
      setMessage(
        response.passages.length === 0 ? (response.message ?? 'Nothing in the curriculum covers that yet.') : null,
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Search failed.');
      setPassages(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <SectionTitle hint="Retrieval, not generation. The ranking is a token-overlap score over curriculum text, which is explainable but not semantic search.">
        Grounded search
      </SectionTitle>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim().length >= 3) void run();
        }}
      >
        <label className="grid gap-1 text-sm" htmlFor="tutor-question">
          <span className="font-medium">Ask about a topic</span>
          <input
            id="tutor-question"
            className="input w-80"
            value={question}
            minLength={3}
            maxLength={500}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="why is a bare except risky"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={pending || question.trim().length < 3}>
          {pending ? 'Searching…' : 'Search the curriculum'}
        </button>
      </form>

      {error ? (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      ) : null}

      <div className="mt-3" aria-live="polite">
        {passages === null ? null : passages.length === 0 ? (
          <p className={`text-sm ${muted}`}>{message}</p>
        ) : (
          <>
            <p className={`text-xs ${muted}`}>
              {passages.length} passage{passages.length === 1 ? '' : 's'} quoted from the curriculum. Not generated.
            </p>
            <ul className="mt-2 grid gap-2">
              {passages.map((passage) => (
                <li key={`${passage.concept_id}-${passage.text.slice(0, 24)}`}>
                  <div className="rounded-md border p-3" style={{ borderColor: 'var(--line)' }}>
                    <p className="text-sm">{passage.text}</p>
                    <p className={`mt-2 text-xs ${muted}`}>{passage.citation}</p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      {passage.license_name || 'licence not recorded'} ·{' '}
                      <a className="underline" href={passage.source_url} target="_blank" rel="noopener noreferrer">
                        source
                      </a>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

type Turn = TutorMessage & { pending?: boolean };

function TutorConversation() {
  const [threads, setThreads] = useState<TutorThread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const refreshThreads = useCallback(async () => {
    try {
      const data = await api.tutorThreads();
      setThreads(data.threads);
    } catch {
      // The list is a convenience; a failure here must not block the chat.
    }
  }, []);

  useEffect(() => {
    void refreshThreads();
    return () => abortRef.current?.abort();
  }, [refreshThreads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [turns]);

  async function openThread(id: string) {
    abortRef.current?.abort();
    setError(null);
    try {
      const data = await api.tutorThread(id);
      setThreadId(id);
      setTurns(data.messages.map((message) => ({ ...message })));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'That conversation could not be opened.');
    }
  }

  function startNew() {
    abortRef.current?.abort();
    setThreadId(null);
    setTurns([]);
    setError(null);
    setStreaming(false);
  }

  async function send() {
    const text = draft.trim();
    if (!text || streaming) return;

    setError(null);
    setDraft('');
    setStreaming(true);
    const stamp = new Date().toISOString();
    setTurns((current) => [
      ...current,
      { id: `local-${stamp}`, role: 'user', text, created_at: stamp, citations: [] },
      { id: `pending-${stamp}`, role: 'assistant', text: '', created_at: stamp, citations: [], pending: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    const updateAssistant = (update: (turn: Turn) => Turn) => {
      setTurns((current) => {
        const next = [...current];
        for (let index = next.length - 1; index >= 0; index -= 1) {
          const turn = next[index];
          if (turn && turn.pending) {
            next[index] = update(turn);
            break;
          }
        }
        return next;
      });
    };

    try {
      await streamTutorChat(
        { message: text, threadId },
        {
          onDelta: (chunk) => updateAssistant((turn) => ({ ...turn, text: turn.text + chunk })),
          onCitations: (citations) => updateAssistant((turn) => ({ ...turn, citations })),
          onError: (message, retryable) => {
            setError(
              retryable ? `${message} Try again when the provider is reachable.` : message,
            );
            updateAssistant((turn) => ({ ...turn, pending: false }));
          },
          onDone: (id) => {
            updateAssistant((turn) => ({ ...turn, pending: false }));
            setThreadId(id);
            void refreshThreads();
          },
        },
        controller.signal,
      );
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
        setError('The connection dropped before the answer finished.');
      }
      updateAssistant((turn) => ({ ...turn, pending: false }));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  async function removeThread(id: string) {
    try {
      await api.deleteTutorThread(id);
      if (id === threadId) startNew();
      await refreshThreads();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'That conversation could not be deleted.');
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <Card className="h-fit">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Conversations</h3>
          <button type="button" className="btn" onClick={startNew}>
            New
          </button>
        </div>
        {threads.length === 0 ? (
          <p className={`mt-2 text-xs ${muted}`}>Nothing yet. Your first question starts a conversation.</p>
        ) : (
          <ul className="mt-2 grid gap-1">
            {threads.map((thread) => (
              <li key={thread.id} className="flex items-start gap-1">
                <button
                  type="button"
                  className={`flex-1 rounded px-2 py-1 text-left text-xs ${thread.id === threadId ? 'font-semibold' : ''}`}
                  style={thread.id === threadId ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
                  onClick={() => void openThread(thread.id)}
                >
                  {thread.title || 'Conversation'}
                  <span className={`block text-[10px] ${muted}`}>
                    {thread.message_count} message{thread.message_count === 1 ? '' : 's'}
                  </span>
                </button>
                <button
                  type="button"
                  className={`px-1 text-xs ${muted}`}
                  aria-label={`Delete conversation ${thread.title || ''}`}
                  onClick={() => void removeThread(thread.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle hint="Answers are drawn from your curriculum, and the material each one used is listed beneath it.">
          Ask the tutor
        </SectionTitle>

        <div className="grid max-h-[460px] gap-3 overflow-y-auto pr-1" aria-live="polite" aria-relevant="additions text">
          {turns.length === 0 ? (
            <p className={`text-sm ${muted}`}>
              Ask about something in your curriculum — for example, why a bare except is risky, or what to review next.
            </p>
          ) : null}
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`rounded-md p-3 text-sm ${turn.role === 'user' ? 'ml-6' : 'mr-6'}`}
              style={{
                background: turn.role === 'user' ? 'var(--accent-soft)' : 'transparent',
                border: turn.role === 'user' ? 'none' : '1px solid var(--line)',
              }}
            >
              <p className={`mb-1 text-[10px] uppercase tracking-wide ${muted}`}>
                {turn.role === 'user' ? 'You' : 'Tutor'}
              </p>
              <p className="whitespace-pre-wrap">
                {turn.text}
                {turn.pending && !turn.text ? <span className={muted}> thinking…</span> : null}
              </p>
              {turn.citations.length > 0 ? (
                <ul className={`mt-2 grid gap-1 text-xs ${muted}`}>
                  {turn.citations.map((citation) => (
                    <li key={`${citation.title}-${citation.citation}`}>
                      Used: <span className="font-medium">{citation.title}</span> — {citation.license_name ?? 'licence not recorded'}
                      {citation.source_url ? (
                        <>
                          {' · '}
                          <a className="underline" href={citation.source_url} target="_blank" rel="noopener noreferrer">
                            source
                          </a>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error ? (
          <div className="mt-3">
            <ErrorNote
              message={error}
              onRetry={() => {
                setError(null);
              }}
            />
          </div>
        ) : null}

        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label className="grid flex-1 gap-1 text-sm" htmlFor="tutor-message">
            <span className="font-medium">Your message</span>
            <textarea
              id="tutor-message"
              className="input min-h-16"
              value={draft}
              maxLength={4000}
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Ask about your curriculum…"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={streaming || draft.trim().length === 0}>
            {streaming ? 'Streaming…' : 'Send'}
          </button>
          {streaming ? (
            <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
              Stop
            </button>
          ) : null}
        </form>
        <p className={`mt-2 text-xs ${muted}`}>
          The tutor will not invent progress, mastery or exam answers. If the curriculum does not cover a question it
          is expected to say so.
        </p>
      </Card>
    </div>
  );
}
