import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { auth } from './auth';
import { SynapseClient } from '../../../packages/synapse-client';
import type { Answer, CloudDocument } from '../../../packages/synapse-client';
import { decodeWorkspace, STORAGE_KEY } from './workspace';
import type { Workspace } from './workspace';

interface Props {
  session: Session | null;
  workspace: Workspace;
  onLoad: (w: Workspace) => void;
  recovery: boolean;
  onRecovered: () => void;
}
export function CloudPanel({
  session,
  workspace,
  onLoad,
  recovery,
  onRecovered,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState<number | null>(null);
  const [docs, setDocs] = useState<CloudDocument[]>([]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [consent, setConsent] = useState(false);
  const [pdf, setPdf] = useState<string>('');
  const objectUrl = useRef<string>('');
  const requestLock = useRef(false);
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  // No account data is loaded automatically; local content is never silently uploaded.
  const api = useMemo(
    () =>
      new SynapseClient(import.meta.env.VITE_API_ORIGIN ?? '', async () => {
        const result = await auth?.auth.getSession();
        return result?.data.session?.access_token ?? '';
      }),
    [],
  );
  async function run(work: () => Promise<void>) {
    if (requestLock.current) return;
    requestLock.current = true;
    setBusy(true);
    setMessage('Working…');
    try {
      await work();
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : 'Operation failed. Your local workspace was not discarded.',
      );
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }
  async function signIn(mode: 'signin' | 'signup' | 'reset') {
    if (!auth) return;
    const result =
      mode === 'signup'
        ? await auth.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/synapsehub`,
            },
          })
        : mode === 'reset'
          ? await auth.auth.resetPasswordForEmail(email, {
              redirectTo: `${window.location.origin}/synapsehub`,
            })
          : await auth.auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    setPassword('');
    setMessage(
      mode === 'signup'
        ? 'Check your email to confirm your account, then sign in. Configure the allowed redirect URL for this deployment.'
        : mode === 'reset'
          ? 'If the account exists, a recovery email has been requested.'
          : 'Signed in.',
    );
  }
  async function refreshDocs() {
    setDocs(await api.documents());
  }
  async function viewPdf(id: string, page = 1) {
    const blob = await api.pdf(id);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(blob);
    setPdf(`${objectUrl.current}#page=${page}`);
    setMessage('PDF loaded from your private cloud library.');
  }
  if (!auth)
    return (
      <section className="sh-panel sh-cloud">
        <h2>Cloud & research</h2>
        <p>
          Local mode is active. Configure the public Supabase URL/key and API
          service to enable sign-in, PDF ingestion, sync and AI. No content is
          sent until you choose a cloud action.
        </p>
      </section>
    );
  return (
    <section className="sh-panel sh-cloud" aria-label="Cloud and research">
      <h2>
        {session ? 'Cloud & research workspace' : 'Connect your workspace'}
      </h2>
      <p>
        {session
          ? `Signed in as ${session.user.email ?? 'account'}. Account-scoped local cache; synchronization is explicit.`
          : 'Sign in to sync across devices and use your private PDF library. Guest data stays separate.'}
      </p>
      <div role="status" aria-live="polite">
        {message}
      </div>
      {!session ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => signIn('signin'));
          }}
          className="sh-auth-form"
        >
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="sh-cloud-actions">
            <button className="sh-primary" disabled={busy}>
              Sign in
            </button>
            <button
              disabled={busy || !email || password.length < 8}
              type="button"
              onClick={() => void run(() => signIn('signup'))}
            >
              Create account
            </button>
            <button
              disabled={busy || !email}
              type="button"
              onClick={() => void run(() => signIn('reset'))}
            >
              Request password reset
            </button>
          </div>
        </form>
      ) : (
        <>
          {recovery && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  const result = await auth!.auth.updateUser({ password });
                  if (result.error) throw result.error;
                  setPassword('');
                  onRecovered();
                  setMessage('Password updated.');
                });
              }}
            >
              <label>
                New password
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button disabled={busy}>Update password</button>
            </form>
          )}
          <div className="sh-cloud-actions">
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const remote = await api.workspace();
                  setRevision(remote.revision);
                  setMessage(
                    `Cloud revision ${remote.revision}. ${remote.workspace.items.length} items. Review before pushing or pulling.`,
                  );
                })
              }
            >
              Check cloud version
            </button>
            <button
              disabled={busy || revision === null}
              onClick={() => {
                if (
                  window.confirm(
                    'Upload this account’s current local workspace to cloud storage? This replaces the cloud snapshot only if its version is unchanged.',
                  )
                )
                  void run(async () => {
                    const saved = await api.saveWorkspace(workspace, revision!);
                    setRevision(saved.revision);
                    setMessage(`Uploaded cloud revision ${saved.revision}.`);
                  });
              }}
            >
              Push local copy
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Replace this account’s local copy with the latest cloud snapshot? Export local changes first.',
                  )
                )
                  void run(async () => {
                    const remote = await api.workspace();
                    onLoad(decodeWorkspace(JSON.stringify(remote.workspace)));
                    setRevision(remote.revision);
                    setMessage(`Downloaded cloud revision ${remote.revision}.`);
                  });
              }}
            >
              Pull cloud copy
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    'Copy guest items into this account’s local workspace? This replaces the account’s local copy only, not cloud data. Export first.',
                  )
                )
                  void run(async () => {
                    onLoad(decodeWorkspace(localStorage.getItem(STORAGE_KEY)));
                    setMessage(
                      'Guest snapshot copied locally. Choose Push to explicitly upload it.',
                    );
                  });
              }}
            >
              Import guest copy locally
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await auth!.auth.signOut();
                  if (result.error) throw result.error;
                })
              }
            >
              Sign out
            </button>
          </div>
          <p className="sh-disclaimer">
            Push/pull are snapshot synchronization, not automatic merging.
            Conflicts return an error without overwriting cloud data. Export
            first. Account caches remain on this browser after sign-out; avoid
            shared devices.
          </p>
          <h3>Private PDF library</h3>
          <p>
            Text PDFs only · 4 MiB · 100 pages · no OCR. Originals and extracted
            page passages are stored in your authenticated cloud library.
          </p>
          <label>
            Upload PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (file.size > 4 * 1024 * 1024) {
                  setMessage('PDF exceeds 4 MiB.');
                  return;
                }
                if (
                  !window.confirm(
                    'Upload this PDF and extracted text to your private cloud library?',
                  )
                )
                  return;
                const form = new FormData();
                form.append('file', file);
                void run(async () => {
                  const result = await api.upload(form);
                  await refreshDocs();
                  setMessage(
                    `PDF ${result.status}: ${result.pages} pages.${result.empty_pages.length ? ' Some pages have no text; OCR is needed.' : ''}`,
                  );
                });
              }}
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await refreshDocs();
                setMessage('Library refreshed.');
              })
            }
          >
            Refresh library
          </button>
          {docs.map((doc) => (
            <div className="sh-cloud-document" key={doc.id}>
              <label>
                <input
                  type="checkbox"
                  checked={chosen.includes(doc.id)}
                  disabled={busy}
                  onChange={(e) => {
                    setChosen(
                      e.target.checked
                        ? [...chosen, doc.id]
                        : chosen.filter((id) => id !== doc.id),
                    );
                    setAnswer(null);
                  }}
                />{' '}
                {doc.title} · {doc.pages} pages
              </label>
              <button
                disabled={busy}
                onClick={() => void run(() => viewPdf(doc.id))}
              >
                Read PDF
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${doc.title}, its original file and retrieval passages?`,
                    )
                  )
                    void run(async () => {
                      await api.deleteDocument(doc.id);
                      setChosen(chosen.filter((id) => id !== doc.id));
                      setAnswer(null);
                      setPdf('');
                      await refreshDocs();
                      setMessage('Document and its index deleted.');
                    });
                }}
              >
                Delete PDF
              </button>
            </div>
          ))}
          {pdf && (
            <div>
              <a href={pdf} target="_blank" rel="noreferrer">
                Open loaded PDF in viewer ↗
              </a>
              <iframe
                title="Private PDF reader"
                src={pdf}
                sandbox="allow-same-origin"
                width="100%"
                height="480"
              />
              <button
                onClick={() => {
                  setPdf('');
                  if (objectUrl.current) {
                    URL.revokeObjectURL(objectUrl.current);
                    objectUrl.current = '';
                  }
                }}
              >
                Close reader
              </button>
            </div>
          )}
          <h3>Ask selected sources</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setAnswer(null);
              void run(async () => {
                setAnswer(await api.ask(question, chosen, false, false));
                setMessage('Retrieved selected-source evidence.');
              });
            }}
          >
            <label>
              Research question
              <input
                required
                maxLength={2000}
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setAnswer(null);
                }}
              />
            </label>
            <p>
              {chosen.length} selected sources. Deselected sources are excluded
              by the server.
            </p>
            <label>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />{' '}
              Allow sending this question and retrieved excerpts to the
              operator-configured inference service for this request. It may run
              on a different machine.
            </label>
            <div className="sh-cloud-actions">
              <button disabled={busy || !chosen.length}>Find evidence</button>
              <button
                type="button"
                disabled={
                  busy || !chosen.length || !question.trim() || !consent
                }
                onClick={() => {
                  setAnswer(null);
                  void run(async () => {
                    setAnswer(await api.ask(question, chosen, true, consent));
                    setMessage(
                      'AI response received. Review every claim against its quote.',
                    );
                  });
                }}
              >
                Generate cited answer
              </button>
            </div>
          </form>
          {answer && (
            <div className="sh-answer">
              <p>{answer.message}</p>
              {answer.claims.map((claim, i) => (
                <article key={i}>
                  <h3>AI claim / interpretation</h3>
                  <p>{claim.text}</p>
                  <blockquote>{claim.quote}</blockquote>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(() => viewPdf(claim.document_id, claim.page))
                    }
                  >
                    Inspect page {claim.page}
                  </button>
                </article>
              ))}
              {answer.evidence.map((passage) => (
                <article key={passage.id}>
                  <h3>
                    {passage.title} · page {passage.page} · Original source
                    passage
                  </h3>
                  <blockquote>{passage.text}</blockquote>
                  <button
                    disabled={busy}
                    onClick={() =>
                      void run(() => viewPdf(passage.document_id, passage.page))
                    }
                  >
                    Open supporting page
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
