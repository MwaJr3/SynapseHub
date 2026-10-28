/**
 * The study planner connection: the screen where a learner grants, and later
 * withdraws, read-only access to their own learning summary.
 *
 * This page is deliberately on Tessera's origin and behind Tessera's session. The
 * planner only ever sees the result (a code, then a scoped token); it never sees
 * this screen's request, the learner's password, or an administrator identity.
 *
 * Both buttons resolve to a URL the server built from a registered redirect, so
 * declining is as explicit as accepting and nothing is inferred from a missing click.
 */
import { useCallback, useEffect, useState } from 'react';

import { api, ApiError, type Connection, type ConsentPreview, type ConsentRequestParams } from './api';
import { Badge, Card, EmptyState, ErrorNote, Loading, SectionTitle } from './ui';

/** Read the authorization request from the address bar.
 *
 * A plain top-level navigation lands here, so parameters arrive in the query
 * string. `#/connect?…` is accepted too, because the app's other routes use the
 * hash and a link may be written either way.
 */
export function readConsentParams(): ConsentRequestParams | null {
  const search = window.location.search.replace(/^\?/, '');
  const hash = window.location.hash;
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const query = new URLSearchParams(search || hashQuery);
  const clientId = query.get('client_id');
  const redirectUri = query.get('redirect_uri');
  const challenge = query.get('code_challenge');
  if (!clientId || !redirectUri || !challenge) return null;
  return {
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: query.get('scope') ?? 'learning-summary:read',
    state: query.get('state') ?? '',
    code_challenge: challenge,
    code_challenge_method: query.get('code_challenge_method') ?? 'S256',
  };
}

type Phase = 'loading' | 'ready' | 'working' | 'done' | 'error';

export function ConsentPage() {
  const [params] = useState(readConsentParams);
  const [preview, setPreview] = useState<ConsentPreview | null>(null);
  const [phase, setPhase] = useState<Phase>(params ? 'loading' : 'error');
  const [error, setError] = useState(params ? '' : 'This connection request is incomplete: client_id, redirect_uri and code_challenge are required.');

  const load = useCallback(async () => {
    if (!params) return;
    setPhase('loading');
    setError('');
    try {
      setPreview(await api.consentPreview(params));
      setPhase('ready');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not read this connection request.');
      setPhase('error');
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (decision: 'grant' | 'deny') => {
    if (!params) return;
    setPhase('working');
    setError('');
    try {
      const { redirect_url } = await api.decideConsent({ ...params, decision });
      setPhase('done');
      window.location.assign(redirect_url);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The decision could not be recorded.');
      setPhase('ready');
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <SectionTitle hint="Read-only, and yours to withdraw">Connect to the Study Planner</SectionTitle>

      {phase === 'loading' && <Loading label="Reading the connection request" />}
      {phase === 'error' && <ErrorNote message={error} onRetry={params ? () => void load() : undefined} />}

      {preview && phase !== 'loading' && (
        <div className="space-y-4">
          <p className="text-sm">
            Allow <strong>{preview.client.name}</strong> to retrieve a read-only summary of your
            learning progress from Tessera, to help organise your study activities.
          </p>

          <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
            <p className="font-medium">What it will be able to read</p>
            <ul className="mt-1 list-disc pl-5" style={{ color: 'var(--muted)' }}>
              <li>Your learning objectives and how far along each one is.</li>
              <li>Which review activities are due or overdue.</li>
              <li>The concepts with the strongest and weakest evidence so far.</li>
              <li>When the summary was last updated.</li>
            </ul>
            <p className="mt-2 font-medium">What it will not be able to do</p>
            <ul className="mt-1 list-disc pl-5" style={{ color: 'var(--muted)' }}>
              <li>Change, add or delete any Tessera record: the connection has no write access.</li>
              <li>Read your notes, tutor conversations, answers or assessment scores.</li>
              <li>See another learner, or act as you outside this scope.</li>
            </ul>
          </div>

          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            You can disconnect at any time from Profile → Connected apps, and access stops
            immediately. Declining keeps Tessera exactly as it is and does not affect the planner,
            which works without this connection.
          </p>

          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Scope requested: <code>{preview.scopes.join(' ')}</code>
            {preview.already_granted ? ' · previously granted — approving again renews it.' : ''}
          </p>

          {error && <p role="alert" className="text-sm" style={{ color: 'var(--bad)' }}>{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              disabled={phase === 'working'}
              onClick={() => void decide('grant')}
            >
              {phase === 'working' ? 'Connecting…' : 'Connect'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={phase === 'working'}
              onClick={() => void decide('deny')}
            >
              Not now
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Settings: what is connected, since when, and the button that ends it. */
export function ConnectedApps() {
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      setConnections((await api.connections()).connections);
      setError('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load connected apps.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async (clientId: string) => {
    setBusy(clientId);
    try {
      await api.disconnect(clientId);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not disconnect this app.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="mt-6">
      <SectionTitle hint="Read-only summaries you have shared">Connected apps</SectionTitle>
      {error && <ErrorNote message={error} onRetry={() => void load()} />}
      {connections === null && !error && <Loading label="Loading connections" />}
      {connections?.length === 0 && (
        <EmptyState
          title="Nothing is connected"
          body="The study planner can ask to read a summary of your progress. Until you approve it there, nothing is shared."
        />
      )}
      {connections?.map((connection) => (
        <Card key={connection.client_id} className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{connection.client_name}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {connection.scopes.join(' ')} · granted {connection.granted_at ? new Date(connection.granted_at).toLocaleDateString() : 'recently'}
                {connection.last_used_at ? ` · last used ${new Date(connection.last_used_at).toLocaleString()}` : ' · not used yet'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">read-only</Badge>
              <button
                type="button"
                className="btn-ghost"
                disabled={busy === connection.client_id}
                onClick={() => void disconnect(connection.client_id)}
              >
                {busy === connection.client_id ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>{connection.purpose}</p>
        </Card>
      ))}
    </section>
  );
}
