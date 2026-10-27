'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

/**
 * The boundary between the planner and Tessera, as the learner sees it.
 *
 * The planner works without this. When the connection is missing, expired or the
 * service is down, this panel says which of those it is and leaves the rest of the
 * page alone — it never renders an empty progress grid that could be mistaken for
 * "you have done nothing".
 */

interface SummaryEntry {
  concept_id: string;
  title: string;
  mastery: number;
  due_at: string | null;
  overdue_days: number;
}

interface Summary {
  learning_objectives: { id: string; title: string; concept_count: number }[];
  progress: {
    concepts_tracked: number;
    concepts_reviewed: number;
    average_mastery: number | null;
    retrieval_attempts: number;
    last_activity_at: string | null;
  };
  outstanding_activities: SummaryEntry[];
  strengths: SummaryEntry[];
  needs_attention: SummaryEntry[];
  updated_at: string | null;
}

type State =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'unconfigured' }
  | { kind: 'disconnected' }
  | { kind: 'expired' }
  | { kind: 'unavailable'; message: string | null }
  | { kind: 'connected'; summary: Summary; fetchedAt: string };

function when(value: string | null): string {
  if (!value) return 'no activity recorded yet';
  return new Date(value).toLocaleString();
}

export function TesseraConnection() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const response = await fetch('/api/tessera/summary', { cache: 'no-store' });
      const body = (await response.json()) as {
        connected?: boolean;
        reason?: string;
        message?: string | null;
        summary?: Summary;
        fetchedAt?: string;
      };
      if (response.ok && body.connected && body.summary && body.fetchedAt) {
        setState({ kind: 'connected', summary: body.summary, fetchedAt: body.fetchedAt });
        return;
      }
      if (body.reason === 'signed-out') setState({ kind: 'signed-out' });
      else if (body.reason === 'unconfigured') setState({ kind: 'unconfigured' });
      else if (body.reason === 'expired') setState({ kind: 'expired' });
      else if (body.reason === 'not-connected') setState({ kind: 'disconnected' });
      else setState({ kind: 'unavailable', message: body.message ?? null });
    } catch {
      setState({ kind: 'unavailable', message: null });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch('/api/tessera/disconnect', { method: 'POST' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" aria-labelledby="tessera-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="tessera-heading" className="text-sm font-semibold">
            Your Tessera progress
          </h2>
          <p className="mt-1 text-xs text-muted">
            Optional. The planner builds a week from published study principles either way; with a
            connection it can also account for what you are actually working on.
          </p>
        </div>
        {state.kind === 'connected' ? (
          <button type="button" className="btn btn-secondary" onClick={() => void disconnect()} disabled={busy}>
            {busy ? 'Disconnecting…' : 'Disconnect'}
          </button>
        ) : null}
      </div>

      {state.kind === 'loading' && <p className="mt-3 text-sm text-muted">Checking the connection…</p>}

      {state.kind === 'signed-out' && (
        <p className="mt-3 text-sm text-muted">
          <Link className="underline" href="/member/sign-in?next=/study-plan">
            Sign in
          </Link>{' '}
          to connect a Tessera account. Planning works without one.
        </p>
      )}

      {state.kind === 'unconfigured' && (
        <p className="mt-3 text-sm text-muted">
          Tessera is not connected in this deployment, so the planner works without progress data.
          No placeholder data is shown in its place.
        </p>
      )}

      {state.kind === 'disconnected' && (
        <div className="mt-3">
          <p className="text-sm text-muted">
            Not connected. Tessera shares nothing until you approve it on Tessera&apos;s own consent
            screen, and you can disconnect from either side.
          </p>
          <a className="btn mt-3 inline-block" href="/api/tessera/connect">
            Connect Tessera
          </a>
        </div>
      )}

      {state.kind === 'expired' && (
        <div className="mt-3">
          <p className="text-sm text-muted">
            The connection has expired or was disconnected in Tessera. Nothing is being fetched.
          </p>
          <a className="btn mt-3 inline-block" href="/api/tessera/connect">
            Reconnect Tessera
          </a>
        </div>
      )}

      {state.kind === 'unavailable' && (
        <p className="mt-3 text-sm text-muted" role="status">
          Tessera could not be reached just now{state.message ? ` (${state.message})` : ''}. Planning
          continues without progress data; nothing has been changed in either product.
        </p>
      )}

      {state.kind === 'connected' && (
        <div className="mt-3 grid gap-4">
          <p className="text-xs text-muted">
            Read-only · last refreshed {when(state.fetchedAt)} · Tessera updated{' '}
            {when(state.summary.updated_at)}
          </p>

          <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted">Concepts tracked</dt>
              <dd className="font-semibold">{state.summary.progress.concepts_tracked}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Reviewed at least once</dt>
              <dd className="font-semibold">{state.summary.progress.concepts_reviewed}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Average mastery</dt>
              <dd className="font-semibold">
                {state.summary.progress.average_mastery === null
                  ? 'not measured yet'
                  : `${Math.round(state.summary.progress.average_mastery * 100)}%`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Due for review</dt>
              <dd className="font-semibold">{state.summary.outstanding_activities.length}</dd>
            </div>
          </dl>

          {state.summary.learning_objectives.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Objectives</h3>
              <ul className="mt-1 grid gap-1 text-sm">
                {state.summary.learning_objectives.map((objective) => (
                  <li key={objective.id}>
                    {objective.title}
                    <span className="text-muted"> · {objective.concept_count} concepts</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.summary.outstanding_activities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Due now</h3>
              <ul className="mt-1 grid gap-1 text-sm">
                {state.summary.outstanding_activities.slice(0, 5).map((entry) => (
                  <li key={entry.concept_id}>
                    {entry.title}
                    <span className="text-muted">
                      {entry.overdue_days > 0 ? ` · ${entry.overdue_days} day(s) overdue` : ' · due today'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {state.summary.progress.concepts_reviewed === 0 && (
            <p className="text-sm text-muted">
              No evidence has been recorded yet, so strengths and gaps are left blank rather than
              guessed.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
