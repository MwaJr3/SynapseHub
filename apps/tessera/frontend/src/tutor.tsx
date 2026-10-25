/** The AI tutor, built on OpenAI ChatKit against a self-hosted backend.
 *
 * Two things are deliberately separate here:
 *
 * 1. Grounded search (`/api/tutor/search`). It needs no API key, returns
 *    curriculum passages with citations, and says plainly that no model wrote
 *    anything. It works on every deployment.
 * 2. The conversation (`/api/tutor/chatkit`). It only renders when the backend
 *    reports an API key. Without a key the widget is not mounted at all — an
 *    empty chat box that cannot answer would be a fake integration.
 *
 * ChatKit renders its UI in an iframe served by OpenAI, so the script comes
 * from OpenAI's CDN and the browser talks to it directly. That is a real
 * third-party dependency and is recorded in the README rather than hidden.
 */
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useEffect, useState } from 'react';

import { api, ApiError, type TutorPassage, type TutorStatus } from './api';
import { Badge, Card, ErrorNote, Loading, SectionTitle } from './ui';

const muted = 'text-[color:var(--muted)]';

/** Where the ChatKit web component is published. Its React package ships types only. */
const CHATKIT_SCRIPT_URL = 'https://cdn.platform.openai.com/deployments/chatkit/chatkit.js';

/** Values are documented by ChatKit for a self-hosted backend; no key is a secret. */
const CHATKIT_DOMAIN_KEY = 'local-dev';

let scriptPromise: Promise<void> | null = null;

function loadChatKitScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.customElements?.get('openai-chatkit')) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-chatkit]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('The ChatKit script failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = CHATKIT_SCRIPT_URL;
    script.async = true;
    script.dataset.chatkit = 'true';
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener('error', () => reject(new Error('The ChatKit script failed to load.')), { once: true });
    document.head.append(script);
  });
  return scriptPromise;
}

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
          {status.configured ? <span className={`text-xs ${muted}`}>model: {status.model}</span> : null}
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

function NotConfigured({ missing }: { missing: string[] }) {
  return (
    <Card>
      <SectionTitle>Conversation is switched off on this deployment</SectionTitle>
      <p className={`text-sm ${muted}`}>
        The service is missing {missing.length > 0 ? missing.join(', ') : 'a model key'}. An operator sets it in the
        environment; it is never held in the browser or in this repository. Until then the chat panel is not rendered
        rather than shown broken.
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
      setMessage(response.passages.length === 0 ? (response.message ?? 'Nothing in the curriculum covers that yet.') : null);
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

      {error ? <div className="mt-3"><ErrorNote message={error} /></div> : null}

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

function TutorConversation() {
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadChatKitScript()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setScriptError('The ChatKit interface could not be loaded from OpenAI. Grounded search above still works.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (scriptError) {
    return (
      <Card>
        <SectionTitle>Conversation unavailable</SectionTitle>
        <p className={`text-sm ${muted}`}>{scriptError}</p>
      </Card>
    );
  }

  if (!ready) {
    return (
      <Card>
        <Loading label="Loading the conversation interface" />
      </Card>
    );
  }

  return <ChatKitFrame />;
}

function ChatKitFrame() {
  const { control } = useChatKit({
    api: {
      // Same origin: the dev server proxies /api to the backend, and cookies
      // carry the session, so no credential ever reaches the browser bundle.
      url: `${window.location.origin}/api/tutor/chatkit`,
      domainKey: CHATKIT_DOMAIN_KEY,
    },
    theme: 'light',
    header: { title: { enabled: true, text: 'Tessera tutor' } },
    startScreen: {
      greeting: 'Ask about something in your curriculum.',
      prompts: [
        { label: 'Explain a concept', prompt: 'Explain exceptions and error handling in simple terms.', icon: 'book-open' },
        { label: 'What do I review next?', prompt: 'What should I review next, and why?', icon: 'sparkle' },
      ],
    },
    composer: { placeholder: 'Ask about your curriculum' },
    disclaimer: {
      text: 'Answers are drawn from Tessera curriculum material and cite their source. Check anything important.',
    },
    onError: (event) => {
      // ChatKit renders its own inline error state; this keeps the console honest.
      console.error('ChatKit error', event.error);
    },
  });

  return (
    <Card>
      <SectionTitle hint="Conversation history is stored per learner on this server. The chat interface itself is served by OpenAI.">
        Ask the tutor
      </SectionTitle>
      <div className="overflow-hidden rounded-md border" style={{ borderColor: 'var(--line)' }}>
        <ChatKit control={control} className="h-[560px] w-full" />
      </div>
      <p className={`mt-2 text-xs ${muted}`}>
        The tutor will not invent progress, mastery or exam answers. If the curriculum does not cover a question it is
        expected to say so.
      </p>
    </Card>
  );
}
