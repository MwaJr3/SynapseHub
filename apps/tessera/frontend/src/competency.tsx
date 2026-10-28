/**
 * The competency screen: what the answers show, and what is still unknown.
 *
 * Two numbers sit next to every concept and are never combined: the **evidence**
 * (computed from graded attempts, fading with age) and the **mastery** the
 * scheduler stores. A learner needs both, because they answer different questions
 * — "what have I demonstrated?" and "what does the model currently believe?" — and
 * averaging them would produce a third number that answers neither.
 *
 * Three rules the interface keeps:
 *
 * * an unmeasured concept shows "not measured", never a 0% bar. A bar of nothing
 *   is a claim of weakness, and there is no evidence for it;
 * * every gap states why it is there and what changes it, in the terms the
 *   server computed the verdict from;
 * * opening the observations is the only motion, and it happens because the
 *   learner asked for it. Nothing animates while a request is in flight.
 */
import { useCallback, useState } from 'react';

import type {
  CompetencyDetail,
  CompetencyGap,
  CompetencyOverview,
  CompetencyRow,
  CompetencyVerdict,
} from './api';
import { api, ApiError } from './api';
import { useAsync } from './hooks';
import { Badge, Card, EmptyState, ErrorNote, Loading } from './ui';

const VERDICT_LABEL: Record<CompetencyVerdict, string> = {
  no_evidence: 'Not measured',
  emerging: 'Emerging',
  developing: 'Developing',
  secure: 'Secure',
};

const VERDICT_TONE: Record<CompetencyVerdict, 'neutral' | 'good' | 'warn' | 'bad'> = {
  no_evidence: 'neutral',
  emerging: 'warn',
  developing: 'warn',
  secure: 'good',
};

const GAP_LABEL: Record<string, string> = {
  no_evidence: 'Nothing practised',
  thin_evidence: 'Too little evidence',
  weak: 'Weak answers',
  self_graded_only: 'Self-graded only',
  stale: 'Evidence is old',
  optimistic_mastery: 'Model is optimistic',
  unmeasured_axes: 'Baseline not scored',
  stale_report: 'Baseline is dated',
};

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'The request failed.';
}

/** Percent, or an em dash — the em dash is the point. */
function pct(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${Math.round(value * 100)}%`;
}

function days(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'never';
  const elapsed = Math.max(0, Date.now() - then) / 86_400_000;
  if (elapsed < 1) return 'today';
  if (elapsed < 2) return 'yesterday';
  return `${Math.round(elapsed)} days ago`;
}

export function CompetencyPage({ onOpenConcept }: { onOpenConcept?: (id: string) => void }) {
  const { data, error, loading, reload } = useAsync<CompetencyOverview>(() => api.competency());

  if (loading) return <Loading label="Reading the evidence" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  const { counts, verdicts, calibration, thresholds } = data;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Competency
        </p>
        <h1 className="mt-1 text-2xl font-semibold">What you have shown, and what is unknown</h1>
        <p className="mt-2 max-w-prose text-sm text-[color:var(--muted)]">
          A verdict here comes only from graded answers. Mastery is the scheduler&apos;s stored estimate and is
          shown beside it, separately — the two are never averaged into one score.
        </p>
      </header>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Evidence coverage</h2>
          <Badge tone={counts.without_evidence > 0 ? 'warn' : 'good'}>
            {counts.with_evidence} of {counts.concepts} measured
          </Badge>
        </div>
        <p className="mt-2 text-sm text-[color:var(--muted)]" data-testid="coverage-note">
          {data.coverage_note}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ['Observations', counts.observations],
              ['Server-graded', counts.server_graded],
              ['Self-graded', counts.self_graded],
              ['Unmeasured', counts.without_evidence],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[color:var(--muted)]">{label}</dt>
              <dd className="text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-[color:var(--muted)]">
          An unmeasured concept is not scored zero. There is nothing to average, so nothing is averaged.
        </p>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Verdicts</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(VERDICT_LABEL) as CompetencyVerdict[]).map((verdict) => (
            <span
              key={verdict}
              className="rounded-md border px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--line)' }}
            >
              <span className="font-semibold tabular-nums">{verdicts[verdict]}</span>{' '}
              <span className="text-[color:var(--muted)]">{VERDICT_LABEL[verdict]}</span>
            </span>
          ))}
        </div>
      </Card>

      <CalibrationCard calibration={calibration} />

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Gaps that can be closed</h2>
          <span className="text-xs text-[color:var(--muted)]">
            showing {data.gaps.length} of {data.gaps_total}
          </span>
        </div>
        {data.gaps.length === 0 ? (
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            Nothing is missing: every visible concept has enough server-checked evidence and every baseline axis
            has a score.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {data.gaps.map((gap, index) => (
              <GapRow key={`${gap.kind}-${gap.concept_id ?? gap.name ?? index}`} gap={gap} index={index} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">Every concept</h2>
        {data.concepts.length === 0 ? (
          <EmptyState title="No concepts yet" body="Add a concept in the library and practise it to start measuring." />
        ) : (
          <ul className="mt-3 divide-y" style={{ borderColor: 'var(--line)' }}>
            {data.concepts.map((row) => (
              <ConceptRow key={row.concept_id} row={row} onOpenConcept={onOpenConcept} />
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold">How the verdict is computed</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{data.policy}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[color:var(--muted)]">
          <li>
            <strong>Secure</strong> needs {thresholds.secure_min_effective} weighted observations at{' '}
            {pct(thresholds.secure_min_score)} or better, including at least one the server graded.
          </li>
          <li>
            <strong>Developing</strong> needs {thresholds.developing_min_effective} weighted observations at{' '}
            {pct(thresholds.developing_min_score)} or better.
          </li>
          <li>
            A stored mastery more than {pct(thresholds.disagreement_gap)} away from the evidence is reported as a
            disagreement, with its size — not smoothed away.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function CalibrationCard({ calibration }: { calibration: CompetencyOverview['calibration'] }) {
  if (calibration.answered === 0 || calibration.accuracy === null) {
    return (
      <Card>
        <h2 className="text-sm font-semibold">Calibration</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{calibration.reason}</p>
      </Card>
    );
  }

  const over = calibration.overconfidence ?? 0;
  return (
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Calibration</h2>
        <Badge tone={over > 0.15 ? 'warn' : 'good'}>
          {over > 0.15 ? 'More sure than right' : over < -0.15 ? 'Under-confident' : 'Well calibrated'}
        </Badge>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Accuracy</dt>
          <dd className="text-lg font-semibold tabular-nums">{pct(calibration.accuracy)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Mean confidence</dt>
          <dd className="text-lg font-semibold tabular-nums">{pct(calibration.mean_confidence)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Gap</dt>
          <dd className="text-lg font-semibold tabular-nums">
            {over > 0 ? '+' : ''}
            {Math.round(over * 100)}
          </dd>
        </div>
      </dl>
      <table className="mt-4 w-full text-left text-sm">
        <caption className="sr-only">Accuracy per confidence level</caption>
        <thead className="text-xs text-[color:var(--muted)]">
          <tr>
            <th scope="col" className="py-1">
              Confidence
            </th>
            <th scope="col" className="py-1">
              Answers
            </th>
            <th scope="col" className="py-1">
              Accuracy
            </th>
          </tr>
        </thead>
        <tbody>
          {calibration.buckets.map((bucket) => (
            <tr key={bucket.confidence} className="border-t" style={{ borderColor: 'var(--line)' }}>
              <td className="py-1 tabular-nums">{bucket.confidence} / 5</td>
              <td className="py-1 tabular-nums">{bucket.answered}</td>
              <td className="py-1 tabular-nums">{pct(bucket.accuracy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[color:var(--muted)]">{calibration.reason}</p>
    </Card>
  );
}

function GapRow({ gap, index }: { gap: CompetencyGap; index: number }) {
  return (
    <li className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--line)' }} data-testid={`gap-${index}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{gap.label ?? gap.kind}</span>
        <Badge tone={gap.severity >= 0.45 ? 'warn' : 'neutral'}>
          {GAP_LABEL[gap.kind] ?? gap.kind}
        </Badge>
      </div>
      <p className="mt-1 text-[color:var(--muted)]">{gap.reason}</p>
      <p className="mt-1 text-xs">
        <span className="text-[color:var(--muted)]">Next step: </span>
        {gap.action}
      </p>
      {gap.axes && gap.axes.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1 text-xs" aria-label="Axes without a score">
          {gap.axes.map((axis) => (
            <li
              key={axis.name}
              className="rounded border px-2 py-0.5"
              style={{ borderColor: 'var(--line)' }}
              title={axis.instrument ?? undefined}
            >
              {axis.label}
              {axis.instrument ? <span className="text-[color:var(--muted)]"> · {axis.instrument}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ConceptRow({ row, onOpenConcept }: { row: CompetencyRow; onOpenConcept?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<CompetencyDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (detail || loading) return;
    setLoading(true);
    setDetailError(null);
    try {
      setDetail(await api.competencyDetail(row.concept_id));
    } catch (cause) {
      setDetailError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [detail, loading, open, row.concept_id]);

  const panelId = `why-${row.concept_id}`;

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{row.title}</span>
            <Badge tone={VERDICT_TONE[row.verdict]}>{VERDICT_LABEL[row.verdict]}</Badge>
            <span className="text-xs text-[color:var(--muted)]">{row.subject}</span>
          </div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">{row.verdict_reason}</p>
        </div>
        <button
          type="button"
          className="btn text-xs"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => void toggle()}
        >
          {open ? 'Hide the numbers' : 'Why?'}
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Weighted score</dt>
          <dd className="font-semibold tabular-nums">{pct(row.evidence.score)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Observations</dt>
          <dd className="tabular-nums">
            {row.evidence.observations}
            <span className="text-xs text-[color:var(--muted)]">
              {' '}
              ({row.evidence.auto} server / {row.evidence.self} self)
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Stored mastery</dt>
          <dd className="tabular-nums">{row.mastery ? pct(row.mastery.value) : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-[color:var(--muted)]">Last observed</dt>
          <dd className="tabular-nums">{days(row.evidence.last_observed_at)}</dd>
        </div>
      </dl>

      {row.disagreement ? (
        <p
          className="mt-2 rounded border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--line)', color: 'var(--warn)' }}
          data-testid={`disagreement-${row.concept_id}`}
        >
          {row.disagreement.reason}
        </p>
      ) : null}

      {open ? (
        <div id={panelId} role="region" aria-label={`Evidence for ${row.title}`} className="rise mt-3 rounded-md border p-3" style={{ borderColor: 'var(--line)' }}>
          {loading ? <Loading label="Reading the observations" /> : null}
          {detailError ? <ErrorNote message={detailError} /> : null}
          {detail ? (
            <>
              {detail.observation_log.length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">
                  No observation exists yet, so there is nothing to list and nothing to average.
                </p>
              ) : (
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Observations that produced this verdict</caption>
                  <thead className="text-[color:var(--muted)]">
                    <tr>
                      <th scope="col" className="py-1">
                        When
                      </th>
                      <th scope="col" className="py-1">
                        Format
                      </th>
                      <th scope="col" className="py-1">
                        Score
                      </th>
                      <th scope="col" className="py-1">
                        Weight
                      </th>
                      <th scope="col" className="py-1">
                        Graded by
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.observation_log.map((item) => (
                      <tr key={item.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
                        <td className="py-1">{days(item.at)}</td>
                        <td className="py-1">{item.format.replace(/_/g, ' ')}</td>
                        <td className="py-1 tabular-nums">{pct(item.score)}</td>
                        <td className="py-1 tabular-nums">{item.weight}</td>
                        <td className="py-1">{item.graded_by === 'auto' ? 'server' : 'you'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {detail.what_would_change_it.length > 0 ? (
                <p className="mt-2 text-xs text-[color:var(--muted)]">
                  What would change it: {detail.what_would_change_it.join(' ')}
                </p>
              ) : null}
              {onOpenConcept ? (
                <button type="button" className="btn mt-2 text-xs" onClick={() => onOpenConcept(row.concept_id)}>
                  Open the concept
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
