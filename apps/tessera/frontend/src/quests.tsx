/**
 * Quests, the XP ledger, and the two limits that keep practice from becoming a compulsion.
 *
 * The screen is built around three refusals that are deliberate:
 *
 * **A quest cannot be completed by a click.** "Mark complete" stays disabled until
 * the server says the evidence exists, and the reason is on screen rather than in a
 * tooltip. The button is disabled *and* described, so the reason is announced by a
 * screen reader instead of being a colour a mouse user has to notice.
 *
 * **There is no streak.** Nothing here counts consecutive days, because a number
 * that can be broken punishes a learner for being absent. `absence_penalty` is
 * printed as a fact rather than left implicit.
 *
 * **The claim is idempotent.** The button mints one key and keeps it while the
 * request is in flight, so a timeout followed by "try again" returns the award that
 * already happened instead of a second one.
 */
import { useCallback, useRef, useState } from 'react';

import type { Guardrails, Quest, QuestEvidence, QuestState, XpEntry } from './api';
import { api, ApiError } from './api';
import { useAsync } from './hooks';
import { Badge, Card, EmptyState, ErrorNote, Loading, SectionTitle } from './ui';

interface PageData {
  quests: Quest[];
  season: { id: string; name: string; theme: string; ends_at: string };
  total: number;
  seasonXp: number;
  guardrails: Guardrails;
  ledger: XpEntry[];
}

const STATE_LABEL: Record<QuestState, string> = {
  available: 'Not started',
  accepted: 'In progress',
  completed: 'Ready to claim',
  claimed: 'Claimed',
  abandoned: 'Set aside',
};

const STATE_TONE: Record<QuestState, 'neutral' | 'good' | 'warn' | 'bad'> = {
  available: 'neutral',
  accepted: 'warn',
  completed: 'good',
  claimed: 'good',
  abandoned: 'neutral',
};

const KIND_LABEL: Record<string, string> = {
  retrieval: 'Recall',
  practice: 'Practice',
  application: 'Apply it',
  reflection: 'Reflection',
};

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'The request failed.';
}

function newIdempotencyKey(): string {
  const generated = globalThis.crypto?.randomUUID?.();
  if (generated) return generated;
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function shortDate(iso: string | null): string {
  if (!iso) return '';
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return '';
  return when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function evidenceLabel(evidence: QuestEvidence): string {
  const noun = evidence.need === 1 ? 'piece of evidence' : 'pieces of evidence';
  return `${evidence.have} of ${evidence.need} ${noun} recorded`;
}

function GuardrailStrip({ guardrails }: { guardrails: Guardrails }) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Today</h2>
        <p className="text-sm text-[color:var(--muted)]">
          {guardrails.xp_today} of {guardrails.xp_cap} XP · {guardrails.minutes_today} of{' '}
          {guardrails.minutes_limit} minutes
        </p>
      </div>
      {guardrails.message ? (
        <p className="mt-2 text-sm" role="status">
          {guardrails.message}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        The day has limits so a good habit does not become a compulsion. Nothing is deducted for a day you do not
        study, and there is no streak to break.
      </p>
    </Card>
  );
}

function QuestCard({
  quest,
  guardrails,
  busy,
  onAccept,
  onComplete,
  onClaim,
}: {
  quest: Quest;
  guardrails: Guardrails;
  busy: boolean;
  onAccept: (quest: Quest) => void;
  onComplete: (quest: Quest) => void;
  onClaim: (quest: Quest) => void;
}) {
  const id = `quest-${quest.slug}`;
  const reasonId = `${id}-reason`;
  const needsEvidence = quest.state === 'accepted' && quest.evidence.have < quest.evidence.need;
  const paused = guardrails.paused;

  const completeReason = needsEvidence
    ? `Keep going: ${evidenceLabel(quest.evidence)}. The quest can be completed once all ${quest.evidence.need} are in.`
    : '';
  const claimReason = paused ? guardrails.message : '';

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{quest.title}</h3>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{quest.summary}</p>
        </div>
        <Badge tone={STATE_TONE[quest.state]}>{STATE_LABEL[quest.state]}</Badge>
      </div>

      <p className="mt-2 text-xs text-[color:var(--muted)]">
        {KIND_LABEL[quest.kind] ?? quest.kind} · difficulty {quest.difficulty} of 5 · base {quest.base_xp} XP
      </p>

      <div className="mt-3">
        <div
          className="bar"
          role="progressbar"
          aria-label={`Evidence for ${quest.title}`}
          aria-valuemin={0}
          aria-valuemax={quest.evidence.need}
          aria-valuenow={Math.min(quest.evidence.have, quest.evidence.need)}
          aria-valuetext={evidenceLabel(quest.evidence)}
        >
          <span
            style={{
              width: `${Math.min(100, Math.round((quest.evidence.have / Math.max(1, quest.evidence.need)) * 100))}%`,
              background: 'var(--accent)',
            }}
          />
        </div>
        <p className="mt-1 text-xs text-[color:var(--muted)]">{evidenceLabel(quest.evidence)}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {quest.state === 'available' ? (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => onAccept(quest)}
            aria-label={`Take the quest ${quest.title}`}
          >
            {busy ? 'Saving…' : 'Take this quest'}
          </button>
        ) : null}

        {quest.state === 'accepted' ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={busy || needsEvidence}
              aria-describedby={completeReason ? reasonId : undefined}
              onClick={() => onComplete(quest)}
              aria-label={`Mark ${quest.title} complete`}
            >
              {busy ? 'Checking…' : 'Mark complete'}
            </button>
            {completeReason ? (
              <p id={reasonId} className="text-xs text-[color:var(--muted)]">
                {completeReason}
              </p>
            ) : null}
          </>
        ) : null}

        {quest.state === 'completed' ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={busy || paused}
              aria-describedby={claimReason ? reasonId : undefined}
              onClick={() => onClaim(quest)}
              aria-label={`Claim XP for ${quest.title}`}
            >
              {busy ? 'Claiming…' : 'Claim XP'}
            </button>
            {claimReason ? (
              <p id={reasonId} className="text-xs text-[color:var(--muted)]">
                {claimReason}
              </p>
            ) : null}
          </>
        ) : null}

        {quest.state === 'claimed' ? (
          <p className="text-sm text-[color:var(--muted)]">
            Claimed{quest.claimed_at ? ` on ${shortDate(quest.claimed_at)}` : ''}. This quest comes back next season.
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function QuestsPage() {
  const load = useCallback(async (): Promise<PageData> => {
    const [board, summary, ledger] = await Promise.all([api.quests(), api.xp(), api.xpLedger(8)]);
    return {
      quests: board.quests,
      season: board.season,
      total: summary.total,
      seasonXp: summary.season_xp,
      guardrails: summary.today,
      ledger: ledger.entries,
    };
  }, []);

  const { data, error, loading, reload } = useAsync<PageData>(load);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [award, setAward] = useState<{ xp: number; reason: string; created: boolean } | null>(null);
  // One key per claim attempt, kept until the server answers. A retry after a
  // timeout reuses it; a success clears it.
  const keys = useRef(new Map<string, string>());

  const run = async (quest: Quest, action: () => Promise<void>) => {
    setBusySlug(quest.slug);
    setRefusal(null);
    try {
      await action();
      reload();
    } catch (cause) {
      setRefusal(errorMessage(cause));
    } finally {
      setBusySlug(null);
    }
  };

  const accept = (quest: Quest) =>
    run(quest, async () => {
      await api.acceptQuest(quest.slug);
    });

  const complete = (quest: Quest) =>
    run(quest, async () => {
      await api.completeQuest(quest.slug);
    });

  const claim = (quest: Quest) =>
    run(quest, async () => {
      const key = keys.current.get(quest.slug) ?? newIdempotencyKey();
      keys.current.set(quest.slug, key);
      const result = await api.claimQuest(quest.slug, key);
      if (result.created) keys.current.delete(quest.slug);
      setAward({
        xp: result.entry.xp,
        reason: result.entry.reason,
        created: result.created,
      });
    });

  if (loading) {
    return (
      <section aria-labelledby="quests-heading">
        <h1 id="quests-heading" className="text-xl font-semibold">Quests</h1>
        <Loading label="Loading quests" />
      </section>
    );
  }

  if (error) {
    return (
      <section aria-labelledby="quests-heading">
        <h1 id="quests-heading" className="text-xl font-semibold">Quests</h1>
        <ErrorNote message={error} onRetry={reload} />
      </section>
    );
  }

  if (!data) return null;

  const awarded = award;

  return (
    <section aria-labelledby="quests-heading">
      <div className="mb-4">
        <h1 id="quests-heading" className="text-xl font-semibold">Quests</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {data.season.name} · {data.season.theme} · ends {shortDate(data.season.ends_at)}
        </p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {data.total} XP in total, {data.seasonXp} of it this season.
        </p>
      </div>

      <GuardrailStrip guardrails={data.guardrails} />

      <div className="mt-4" role="status" aria-live="polite">
        {awarded ? (
          <Card className="p-3">
            <p className="text-sm font-medium">
              {awarded.created ? `+${awarded.xp} XP` : `Already awarded ${awarded.xp} XP`}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">Why: {awarded.reason}</p>
          </Card>
        ) : null}
      </div>

      {refusal ? (
        <div
          className="mt-3 rounded-md border p-3 text-sm"
          role="alert"
          style={{ borderColor: 'var(--bad)' }}
        >
          <strong className="block">That did not go through</strong>
          <p className="mt-1 text-[color:var(--muted)]">{refusal}</p>
        </div>
      ) : null}

      {data.quests.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No quests are published yet"
            body="Quests appear here when the catalogue is seeded. Nothing is missing from your record because of it."
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.quests.map((quest) => (
            <QuestCard
              key={quest.slug}
              quest={quest}
              guardrails={data.guardrails}
              busy={busySlug === quest.slug}
              onAccept={accept}
              onComplete={complete}
              onClaim={claim}
            />
          ))}
        </ul>
      )}

      <div className="mt-8">
        <SectionTitle hint="Every award keeps the numbers that produced it, so the ledger can explain itself.">
          Recent awards
        </SectionTitle>
        {data.ledger.length === 0 ? (
          <EmptyState
            title="Nothing claimed yet"
            body="XP is recorded when you claim a quest you have already finished. It never appears for merely opening a page."
          />
        ) : (
          <ul className="space-y-2">
            {data.ledger.map((entry) => (
              <li key={entry.id} className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">
                    {entry.xp > 0 ? `+${entry.xp} XP` : '0 XP (cap reached)'}
                  </span>
                  <span className="text-xs text-[color:var(--muted)]">{shortDate(entry.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-[color:var(--muted)]">{entry.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
