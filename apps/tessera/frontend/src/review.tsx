/**
 * The review screen: what is due, why, and one prompt at a time.
 *
 * Two design decisions are load-bearing here.
 *
 * **The progress bar is the only motion, and it moves because something
 * happened.** It advances when an item is answered; nothing drifts, pulses or
 * wobbles while waiting. Motion on this screen reports progress through today's
 * set, which is the one thing a learner actually wants to know.
 *
 * **A prompt is fetched fresh for each item, and the answer key arrives only after
 * submitting.** The card cannot show the expected answer while the learner is
 * still typing, because the server never sends it before then.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  PracticeFormat,
  PracticePrompt,
  PracticeResult,
  ReviewItem,
  ReviewQueue,
  ReviewStats,
} from './api';
import { api, ApiError } from './api';
import { useAsync } from './hooks';
import { Badge, Card, ErrorNote, Loading, SectionTitle } from './ui';

const FORMAT_LABEL: Record<PracticeFormat, string> = {
  multiple_choice: 'Recognise it',
  cloze: 'Fill the blank',
  cued_recall: 'Answer from a cue',
  free_recall: 'Write it all out',
};

const FORMAT_HINT: Record<PracticeFormat, string> = {
  multiple_choice: 'You pick from options. The server checks it — the strongest evidence.',
  cloze: 'One word is missing from a sentence in your material. The server checks it.',
  cued_recall: 'A cue, then whatever you can produce. You judge it against the source lines.',
  free_recall: 'Everything you remember, then you tick what you produced. Half weight, because you grade it.',
};

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'The request failed.';
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function relativeDue(iso: string | null): string {
  if (!iso) return 'not scheduled';
  const when = new Date(iso).getTime();
  if (Number.isNaN(when)) return 'not scheduled';
  const diff = when - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (Math.abs(days) >= 1) return days > 0 ? `in ${days} day(s)` : `${-days} day(s) overdue`;
  const hours = Math.round(diff / 3_600_000);
  return hours >= 0 ? `in ${hours} hour(s)` : `${-hours} hour(s) overdue`;
}

/* ------------------------------------------------------------------- prompt */

function PromptCard({
  conceptId,
  item,
  format,
  onFinished,
}: {
  conceptId: string;
  item: ReviewItem;
  format: PracticeFormat;
  onFinished: (result: PracticeResult) => void;
}) {
  const [prompt, setPrompt] = useState<PracticePrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const load = useCallback(
    async (reveal: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const next = await api.reviewPrompt(conceptId, format, 0, reveal);
        setPrompt(next);
        startedAt.current = Date.now();
      } catch (cause) {
        setError(errorMessage(cause));
      } finally {
        setLoading(false);
      }
    },
    [conceptId, format],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const submit = async () => {
    if (!prompt) return;
    setBusy(true);
    setError(null);
    try {
      // Only the fields this format uses: a cloze has no choice list, and sending
      // an empty one would invite the server to guess which grading path to take.
      const payload: Parameters<typeof api.submitPractice>[0] = {
        prompt_id: prompt.prompt_id,
        answer,
        latency_ms: Math.max(0, Date.now() - startedAt.current),
      };
      if (prompt.format === 'multiple_choice' && choice !== null) payload.choice_index = choice;
      if (prompt.graded_by === 'self') payload.checked = checked;
      const graded = await api.submitPractice(payload);
      setResult(graded);
      onFinished(graded);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading label="Building a prompt" />;
  if (error) return <ErrorNote message={error} onRetry={() => void load(false)} />;
  if (!prompt) return null;

  if (result) {
    return (
      <div className="rise">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            {result.attempt.correct ? 'Recalled' : 'Not this time'} — score {result.attempt.score.toFixed(2)}
          </p>
          <Badge tone={result.attempt.correct ? 'good' : 'warn'}>
            {result.attempt.graded_by === 'auto' ? 'checked by the server' : 'you graded this'}
          </Badge>
        </div>
        {result.attempt.answer ? (
          <p className="text-sm">
            <span className="text-[color:var(--muted)]">You wrote: </span>
            {result.attempt.answer}
          </p>
        ) : null}
        {result.attempt.expected ? (
          <p className="mt-1 text-sm whitespace-pre-wrap">
            <span className="text-[color:var(--muted)]">The source: </span>
            {result.attempt.expected}
          </p>
        ) : null}
        <p className="mt-2 text-sm">{result.explanation}</p>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Next review {relativeDue(result.model.next_review_at)} · stability{' '}
          {result.model.stability_days.toFixed(1)} day(s) · recall was estimated at{' '}
          {percent(result.model.retrievability_before)} before you answered
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{FORMAT_LABEL[prompt.format]}</p>
        <Badge tone="neutral">{percent(item.predicted_recall)} estimated recall</Badge>
      </div>
      <p className="whitespace-pre-wrap text-base">{prompt.prompt}</p>
      <p className="mt-1 text-xs text-[color:var(--muted)]">{prompt.instructions}</p>

      {prompt.format === 'multiple_choice' ? (
        <fieldset className="mt-3 grid gap-2">
          <legend className="sr-only">Choose one</legend>
          {prompt.choices.map((option, index) => (
            <label key={option} className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                name={`choice-${prompt.prompt_id}`}
                checked={choice === index}
                onChange={() => setChoice(index)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      {prompt.format === 'cloze' ? (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">The missing word</span>
          <input className="field" value={answer} onChange={(event) => setAnswer(event.target.value)} />
        </label>
      ) : null}

      {prompt.format === 'cued_recall' || prompt.format === 'free_recall' ? (
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">From memory</span>
          <textarea
            className="field"
            rows={6}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Write it as you would explain it to someone else."
          />
        </label>
      ) : null}

      {prompt.graded_by === 'self' ? (
        <div className="mt-3 rounded-md border p-3" style={{ borderColor: 'var(--line)' }}>
          {prompt.criteria.length === 0 ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setRevealed(true);
                void load(true);
              }}
            >
              I have finished writing — show me the source lines
            </button>
          ) : (
            <>
              <p className="text-sm font-medium">Which of these did you actually produce?</p>
              <p className="mb-2 text-xs text-[color:var(--muted)]">
                Tick only what you wrote, in your own words. This is the evidence, so an honest tick
                count is worth more than a full one.
              </p>
              <fieldset className="grid gap-2">
                <legend className="sr-only">Criteria you produced</legend>
                {prompt.criteria.map((criterion, index) => (
                  <label key={criterion} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked.includes(index)}
                      onChange={(event) =>
                        setChecked((current) =>
                          event.target.checked
                            ? [...current, index]
                            : current.filter((value) => value !== index),
                        )
                      }
                    />
                    <span>{criterion}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      ) : null}

      <div className="mt-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void submit()}
          disabled={busy || (prompt.format === 'multiple_choice' && choice === null) || (prompt.graded_by === 'self' && !revealed && prompt.criteria.length === 0)}
        >
          {busy ? 'Checking…' : 'Check my answer'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- page */

export function ReviewPage({ onOpenConcept }: { onOpenConcept: (id: string) => void }) {
  const queue = useAsync<ReviewQueue>(() => api.reviewQueue(), []);
  const stats = useAsync<ReviewStats>(() => api.reviewStats(), []);

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<string, PracticeResult>>({});
  const [formatOverride, setFormatOverride] = useState<PracticeFormat | null>(null);

  const today = useMemo(() => queue.data?.today ?? [], [queue.data]);
  const current: ReviewItem | undefined = today[index];

  const advance = useCallback(() => {
    setIndex((value) => Math.min(value + 1, today.length));
    setFormatOverride(null);
  }, [today.length]);

  const progress = today.length > 0 ? Math.min(1, Object.keys(done).length / today.length) : 0;

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Retrieval first: producing an answer from memory, not recognising one. Every item says why it is here.">
          Review
        </SectionTitle>
        {queue.loading ? <Loading label="Loading your queue" /> : null}
        {queue.error ? <ErrorNote message={queue.error} onRetry={queue.reload} /> : null}
      </div>

      {queue.data ? (
        <>
          {/* Progress through today's set. It moves when an answer is recorded —
              the only motion on this screen, and it means something. */}
          <div
            className="review-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={today.length}
            aria-valuenow={Object.keys(done).length}
            aria-label="Reviews answered today"
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>

          {queue.data.recovery.active ? (
            <div
              role="status"
              className="rounded-md border p-3 text-sm"
              style={{ borderColor: 'var(--warn)' }}
            >
              <strong>Welcome back — here is today, not the whole backlog.</strong>
              <p className="mt-1 text-[color:var(--muted)]">{queue.data.recovery.reason}</p>
            </div>
          ) : null}

          {today.length === 0 ? (
            <Card>
              <p className="text-sm">
                {queue.data.empty_state ??
                  'Nothing is due. Reviews come back when the estimated chance of recall drops below your target.'}
              </p>
              {queue.data.upcoming.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm">
                  {queue.data.upcoming.map((item) => (
                    <li key={item.concept_id} className="flex justify-between gap-2">
                      <button
                        type="button"
                        className="underline"
                        onClick={() => onOpenConcept(item.concept_id)}
                      >
                        {item.title}
                      </button>
                      <span className="text-[color:var(--muted)]">{relativeDue(item.next_review_at)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : null}

          {current ? (
            <Card>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">{current.title}</p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {current.subject} · {current.reps} review(s) · {current.lapses} lapse(s)
                  </p>
                </div>
                <Badge tone={current.overdue_days > 1 ? 'warn' : 'neutral'}>
                  {current.overdue_days > 0 ? `${current.overdue_days.toFixed(1)} days overdue` : 'due today'}
                </Badge>
              </div>

              <details className="mb-3 text-sm">
                <summary className="cursor-pointer text-[color:var(--muted)]">Why is this here?</summary>
                <ul className="mt-1 list-disc pl-5">
                  {current.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </details>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[color:var(--muted)]">Format:</span>
                {current.available_formats.map((format) => {
                    const chosen = (formatOverride ?? current.suggested_format) === format;
                    return (
                      <button
                        key={format}
                        type="button"
                        className="rounded-md border px-2 py-1"
                        style={
                          chosen
                            ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                            : { borderColor: 'var(--line)' }
                        }
                        onClick={() => setFormatOverride(format)}
                        aria-pressed={chosen}
                        title={FORMAT_HINT[format]}
                      >
                        {FORMAT_LABEL[format]}
                      </button>
                    );
                  },
                )}
              </div>

              {formatOverride === null && current.suggested_format === null ? (
                /* No prose and no questions: nothing a prompt can be built from.
                   Saying so is better than a button that returns an error. */
                <div className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                  <p className="font-medium">This concept has nothing to practise yet.</p>
                  <p className="mt-1 text-[color:var(--muted)]">
                    Retrieval needs material: a summary, an explanation, or a question. Open the
                    concept and add a line or two, and it will come back to the queue.
                  </p>
                  <button type="button" className="btn mt-2" onClick={() => onOpenConcept(current.concept_id)}>
                    Open the concept
                  </button>
                </div>
              ) : (
                <PromptCard
                  key={`${current.concept_id}-${formatOverride ?? 'auto'}`}
                  conceptId={current.concept_id}
                  item={current}
                  format={formatOverride ?? current.suggested_format ?? 'free_recall'}
                  onFinished={(result) =>
                    setDone((existing) => ({ ...existing, [result.attempt.id]: result }))
                  }
                />
              )}

              {Object.keys(done).length > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button type="button" className="btn" onClick={advance}>
                    Next item
                  </button>
                  <span className="text-xs text-[color:var(--muted)]">
                    {Object.keys(done).length} of {today.length} answered today
                  </span>
                </div>
              ) : null}
            </Card>
          ) : today.length > 0 ? (
            <Card>
              <p className="text-sm font-medium">Today is done.</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">
                {queue.data.recovery.remaining_after_today > 0
                  ? `${queue.data.recovery.remaining_after_today} more will come back over the next few days, on their real due dates.`
                  : 'Anything else due will come back when its interval runs out.'}
              </p>
              <button type="button" className="btn mt-3" onClick={() => void queue.reload()}>
                Refresh the queue
              </button>
            </Card>
          ) : null}

          <p className="text-xs text-[color:var(--muted)]">{queue.data.policy}</p>
        </>
      ) : null}

      {stats.data ? (
        <Card>
          <SectionTitle hint="Counts of what you have practised and how it was graded. Self-graded attempts are listed apart because they are weaker evidence.">
            Practice so far
          </SectionTitle>
          {stats.data.summary.total === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No retrieval attempts recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[color:var(--muted)]">
                  <th scope="col" className="py-1">Format</th>
                  <th scope="col">Attempts</th>
                  <th scope="col">Mean score</th>
                  <th scope="col">Server-graded</th>
                  <th scope="col">Self-graded</th>
                </tr>
              </thead>
              <tbody>
                {stats.data.summary.by_format.map((row) => (
                  <tr key={row.format}>
                    <td className="py-1">{FORMAT_LABEL[row.format as PracticeFormat] ?? row.format}</td>
                    <td>{row.attempts}</td>
                    <td>{row.mean_score.toFixed(2)}</td>
                    <td>{row.auto_graded}</td>
                    <td>{row.self_graded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-[color:var(--muted)]">{stats.data.note}</p>
        </Card>
      ) : null}
    </div>
  );
}
