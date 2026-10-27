import { useMemo, useState } from 'react';

import {
  api,
  ApiError,
  type Assessment,
  type AssessmentDiffRow,
  type AssessmentDiffSummary,
  type AssessmentScore,
  type CoreAxis,
  type Instrument,
  type ProfileResponse,
} from './api';
import { useAsync } from './hooks';
import { EmptyRing, HeroPanel, ScoreRing } from './rings';
import { formatScore } from './utils';
import { Badge, Card, EmptyState, ErrorNote, Loading } from './ui';

const muted = 'text-[color:var(--muted)]';

function axisKey(axis: { axis: string; name: string }): string {
  return `${axis.axis}/${axis.name}`;
}

export function buildScores(
  instrument: Instrument,
  numbers: Record<string, string>,
  labels: Record<string, string>,
): { scores: AssessmentScore[]; error: string | null } {
  const scores: AssessmentScore[] = [];
  for (const axis of instrument.axes) {
    const key = axisKey(axis);
    if (instrument.value_kind === 'label') {
      const label = (labels[key] ?? '').trim();
      if (label) scores.push({ axis: axis.axis, name: axis.name, value: null, value_label: label, note: '' });
      continue;
    }
    const raw = (numbers[key] ?? '').trim();
    // An empty field is an absence, not a zero. "0" is a supplied score and is kept.
    if (!raw) continue;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return { scores: [], error: `“${axis.label}” is not a number.` };
    scores.push({ axis: axis.axis, name: axis.name, value: parsed, value_label: '', note: '' });
  }
  if (scores.length === 0) {
    return {
      scores: [],
      error:
        instrument.value_kind === 'label'
          ? 'Enter at least one label, or there is nothing to record.'
          : 'Enter at least one score. Blank fields are stored as missing, not as zero.',
    };
  }
  return { scores, error: null };
}

export function ProfilePage() {
  const { data, error, loading, reload } = useAsync<ProfileResponse>(() => api.profile());
  const [notice, setNotice] = useState<string | null>(null);
  //: Kept on the page rather than in the row: the row that was reassessed becomes
  //: a retired one after the reload, and a diff that disappears is not a record.
  const [reassessment, setReassessment] = useState<{
    priorLabel: string;
    assessmentId: string;
    diff: AssessmentDiffRow[];
    summary: AssessmentDiffSummary;
  } | null>(null);

  if (loading) return <Loading label="Reading your profile" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  const dimensions = data.axes.filter((axis) => axis.axis === 'dimension');
  const processes = data.axes.filter((axis) => axis.axis === 'process');
  const live = data.assessments.filter((assessment) => !assessment.archived);
  const retired = data.assessments.filter((assessment) => assessment.archived);

  return (
    <div className="space-y-6">
      <HeroPanel>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
          Learner profile
        </p>
        <h1 className="mt-1 text-2xl font-semibold">What was reported, and what is still unknown</h1>
        <p className={`mt-2 max-w-prose text-sm ${muted}`}>
          Every score here came from an instrument you completed. Nothing on this page changes what you have
          demonstrated — that comes only from graded answers, separately.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          {data.axes.map((axis) => (
            <ScoreRing
              key={`hero-${axis.name}`}
              value={axis.score?.value ?? null}
              min={axis.score?.scale_min ?? 0}
              max={axis.score?.scale_max ?? 100}
              label={axis.label}
            />
          ))}
        </div>
      </HeroPanel>

      <Card>
        <h3 className="text-sm font-semibold">Read this before the numbers</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
          {data.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">The ten axes</h3>
          {data.missing.length > 0 ? (
            <Badge tone="warn">{data.missing.length} without a score</Badge>
          ) : (
            <Badge tone="good">All ten scored</Badge>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {data.axes.map((axis) => (
            <div key={`ring-${axis.name}`} className="rise">
              {axis.score ? (
                <ScoreRing
                  value={axis.score.value}
                  min={axis.score.scale_min}
                  max={axis.score.scale_max}
                  label={axis.label}
                  caption={axis.score.instrument_label}
                />
              ) : (
                <EmptyRing label={axis.label} />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <AxisGroup title="Learning dimensions" axes={dimensions} />
          <AxisGroup title="Learning processes" axes={processes} />
        </div>

        {data.missing.length > 0 ? (
          <p className={`mt-4 text-sm ${muted}`}>
            <strong>Not supplied:</strong> {data.missing.join(', ')}. These stay missing — the system will not
            treat them as zero and will not estimate them.
          </p>
        ) : null}
      </Card>

      {live.length === 0 ? (
        <Card>
          <EmptyState
            title="No assessments recorded yet"
            body="Nothing has been entered, so every axis above is honestly empty. Load the baseline you supplied, or add a result below."
          />
          <BaselineButton
            onLoaded={(created) => {
              setNotice(
                created === 0
                  ? 'The supplied baseline was already recorded. Nothing changed.'
                  : `Loaded ${created} supplied assessment${created === 1 ? '' : 's'} — marked as reported, not measured.`,
              );
              reload();
            }}
          />
        </Card>
      ) : (
        <Card>
          <h3 className="text-sm font-semibold">Assessments on record ({live.length})</h3>
          <ul className="mt-3 space-y-4">
            {live.map((assessment) => (
              <AssessmentRow
                key={assessment.id}
                assessment={assessment}
                instrument={data.instruments.find((candidate) => candidate.id === assessment.instrument) ?? null}
                onChanged={reload}
                onReassessed={setReassessment}
                onNotice={setNotice}
              />
            ))}
          </ul>
          <BaselineButton
            quiet
            onLoaded={(created) => {
              setNotice(
                created === 0
                  ? 'The supplied baseline was already recorded. Nothing changed.'
                  : `Loaded ${created} supplied assessment${created === 1 ? '' : 's'}.`,
              );
              reload();
            }}
          />
        </Card>
      )}

      {reassessment ? (
        <Card>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">Reassessment of “{reassessment.priorLabel}”</h3>
            <button type="button" className="text-xs underline" onClick={() => setReassessment(null)}>
              Dismiss
            </button>
          </div>
          <DiffTable rows={reassessment.diff} summary={reassessment.summary} />
          <p className={`mt-2 text-xs ${muted}`}>
            The earlier submission is in the history above, marked as reassessed rather than deleted.
          </p>
        </Card>
      ) : null}

      {retired.length > 0 ? (
        <Card>
          <h3 className="text-sm font-semibold">Retired ({retired.length})</h3>
          <p className={`mt-1 text-sm ${muted}`}>
            Kept rather than deleted, so the correction itself is auditable. They no longer count as evidence.
          </p>
          <ul className="mt-3 space-y-3">
            {retired.map((assessment) => (
              <li key={assessment.id} className="rounded-md border p-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{assessment.label}</span>
                  <Badge>{assessment.replaced_by ? 'reassessed' : 'retired'}</Badge>
                </div>
                <p className={`mt-1 ${muted}`}>
                  {assessment.archive_reason || 'No reason recorded.'} · entered {assessment.created_at.slice(0, 10)}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {notice ? (
        <p role="status" className="text-sm" style={{ color: 'var(--good)' }}>
          {notice}
        </p>
      ) : null}

      <ContextCard context={data.context} updatedAt={data.updated_at} onSaved={reload} />

      <AddAssessmentCard
        instruments={data.instruments}
        onSaved={(label) => {
          setNotice(`Recorded “${label}”.`);
          reload();
        }}
      />
    </div>
  );
}

function AxisGroup({ title, axes }: { title: string; axes: CoreAxis[] }) {
  return (
    <div>
      <h4 className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>{title}</h4>
      <ul className="mt-2 divide-y" style={{ borderColor: 'var(--line)' }}>
        {axes.map((axis) => (
          <li key={axis.name} className="py-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm">{axis.label}</span>
              {axis.score ? (
                <span className="text-sm font-semibold tabular-nums">
                  {axis.score.value !== null
                    ? formatScore(axis.score.value, axis.score.scale_min, axis.score.scale_max)
                    : axis.score.value_label}
                </span>
              ) : (
                <Badge tone="warn">no score</Badge>
              )}
            </div>
            {axis.score ? (
              <p className={`mt-1 text-xs ${muted}`}>
                {axis.score.instrument_label}
                {axis.score.administered_on ? ` · taken ${axis.score.administered_on}` : ' · date not recorded'}
                {axis.score.reported_by === 'provider-report' ? ' · from a report you supplied' : ' · you reported this'}
                {axis.score.note ? ` · ${axis.score.note}` : ''}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function initialNumbers(assessment: Assessment): Record<string, string> {
  const numbers: Record<string, string> = {};
  for (const score of assessment.scores) {
    if (score.value !== null) numbers[`${score.axis}/${score.name}`] = String(score.value);
  }
  return numbers;
}

function initialLabels(assessment: Assessment): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const score of assessment.scores) {
    if (score.value_label) labels[`${score.axis}/${score.name}`] = score.value_label;
  }
  return labels;
}

const DIRECTION_TEXT: Record<AssessmentDiffRow['direction'], string> = {
  up: 'higher',
  down: 'lower',
  same: 'unchanged',
  new: 'newly supplied',
  missing: 'still not supplied',
  not_supplied: 'withdrawn',
};

function DiffTable({ rows, summary }: { rows: AssessmentDiffRow[]; summary: AssessmentDiffSummary }) {
  return (
    <div className="mt-3">
      <p className="text-xs font-medium">
        {summary.moved} of {summary.axes} axes changed
        {summary.mean_delta === null ? '' : ` · mean change ${summary.mean_delta > 0 ? '+' : ''}${summary.mean_delta}`}
      </p>
      <table className="mt-2 w-full text-left text-xs">
        <caption className="sr-only">What changed between the two submissions</caption>
        <thead className="text-[color:var(--muted)]">
          <tr>
            <th scope="col" className="py-1">
              Axis
            </th>
            <th scope="col" className="py-1">
              Before
            </th>
            <th scope="col" className="py-1">
              Now
            </th>
            <th scope="col" className="py-1">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.axis}/${row.name}`} className="border-t" style={{ borderColor: 'var(--line)' }}>
              <th scope="row" className="py-1 font-normal">
                {row.name.replace(/_/g, ' ')}
              </th>
              <td className="py-1 tabular-nums">
                {row.previous === null ? (row.previous_label || 'not supplied') : row.previous}
              </td>
              <td className="py-1 tabular-nums">
                {row.value === null ? (row.new_label || 'not supplied') : row.value}
              </td>
              <td className="py-1">
                {DIRECTION_TEXT[row.direction]}
                {row.delta === null ? '' : ` (${row.delta > 0 ? '+' : ''}${row.delta})`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={`mt-2 text-xs ${muted}`}>{summary.note}</p>
    </div>
  );
}

function AssessmentRow({
  assessment,
  instrument,
  onChanged,
  onReassessed,
  onNotice,
}: {
  assessment: Assessment;
  instrument: Instrument | null;
  onChanged: () => void;
  onReassessed: (result: {
    priorLabel: string;
    assessmentId: string;
    diff: AssessmentDiffRow[];
    summary: AssessmentDiffSummary;
  }) => void;
  onNotice: (message: string) => void;
}) {
  const [retiring, setRetiring] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [numbers, setNumbers] = useState<Record<string, string>>(() => initialNumbers(assessment));
  const [labels, setLabels] = useState<Record<string, string>>(() => initialLabels(assessment));
  const [administeredOn, setAdministeredOn] = useState(assessment.administered_on);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const retire = async () => {
    setPending(true);
    setError(null);
    try {
      await api.archiveAssessment(assessment.id, reason);
      onNotice(`Retired “${assessment.label}”. The row is kept in the history.`);
      setRetiring(false);
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  const submitReassessment = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!instrument) {
      setError('The instrument definition is missing, so the axes cannot be shown. Reload the profile.');
      return;
    }
    const { scores, error: invalid } = buildScores(instrument, numbers, labels);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    try {
      const result = await api.reassessAssessment(assessment.id, {
        administered_on: administeredOn,
        scores,
      });
      onReassessed({
        priorLabel: assessment.label,
        assessmentId: result.assessment.id,
        diff: result.diff,
        summary: result.summary,
      });
      setReassessing(false);
      onNotice('Reassessment recorded. The earlier submission is kept as superseded, not deleted.');
      onChanged();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <li className="rounded-md border p-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{assessment.label}</span>
        <span className={`text-xs ${muted}`}>
          {assessment.reported_by === 'provider-report' ? 'from a supplied report' : 'you reported this'}
          {assessment.administered_on ? ` · ${assessment.administered_on}` : ' · date not recorded'}
        </span>
      </div>

      {assessment.supersedes_id ? (
        <p className={`mt-1 text-xs ${muted}`}>A reassessment of an earlier submission. Both are kept.</p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-1">
        {assessment.scores.map((score) => (
          <span
            key={`${score.axis}/${score.name}`}
            className="rounded border px-2 py-0.5 text-xs"
            style={{ borderColor: 'var(--line)' }}
          >
            {score.name.replace(/_/g, ' ')}
            {score.value !== null ? (
              <strong className="ml-1 tabular-nums">{score.value}</strong>
            ) : score.value_label ? (
              <strong className="ml-1">{score.value_label}</strong>
            ) : (
              <span className={`ml-1 ${muted}`}>not supplied</span>
            )}
          </span>
        ))}
      </div>

      {assessment.source_note ? <p className={`mt-2 text-xs ${muted}`}>{assessment.source_note}</p> : null}
      {assessment.source_url ? (
        <p className="mt-1 text-xs">
          <a href={assessment.source_url} rel="noreferrer noopener" target="_blank">
            Source report
          </a>
        </p>
      ) : null}

      {error ? <p className="mt-2 text-xs" style={{ color: 'var(--bad)' }} role="alert">{error}</p> : null}

      {retiring ? (
        <div className="mt-3 space-y-2">
          <label className="block text-xs" htmlFor={`reason-${assessment.id}`}>
            Why is this being retired?
          </label>
          <input
            id={`reason-${assessment.id}`}
            className="w-full rounded border p-2 text-sm"
            style={{ borderColor: 'var(--line)' }}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. entered twice, correct values are in the newer row"
          />
          <div className="flex gap-2">
            <button type="button" className="btn" disabled={pending} onClick={() => void retire()}>
              {pending ? 'Retiring…' : 'Retire this assessment'}
            </button>
            <button type="button" className="btn" onClick={() => setRetiring(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {reassessing ? (
        <form
          className="mt-3 space-y-3 rounded border p-3"
          style={{ borderColor: 'var(--line)' }}
          aria-label={`Reassess ${assessment.label}`}
          onSubmit={(event) => void submitReassessment(event)}
        >
          <p className="text-xs">
            Record a newer result for the same instrument. The earlier submission is archived as superseded and
            stays readable; nothing is overwritten.
          </p>
          {instrument ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {instrument.axes.map((axis) => {
                const key = `${axis.axis}/${axis.name}`;
                return (
                  <label key={key} className="flex items-center justify-between gap-3 text-xs">
                    <span>{axis.label}</span>
                    <input
                      aria-label={axis.label}
                      className="w-24 rounded border p-1 text-right text-sm tabular-nums"
                      style={{ borderColor: 'var(--line)' }}
                      type={instrument.value_kind === 'label' ? 'text' : 'number'}
                      step={instrument.value_kind === 'label' ? undefined : 'any'}
                      min={instrument.value_kind === 'label' ? undefined : (instrument.scale_min ?? 0)}
                      max={instrument.value_kind === 'label' ? undefined : (instrument.scale_max ?? 100)}
                      value={instrument.value_kind === 'label' ? (labels[key] ?? '') : (numbers[key] ?? '')}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (instrument.value_kind === 'label') {
                          setLabels((current) => ({ ...current, [key]: value }));
                        } else {
                          setNumbers((current) => ({ ...current, [key]: value }));
                        }
                      }}
                    />
                  </label>
                );
              })}
            </div>
          ) : null}
          <div>
            <label className="block text-xs" htmlFor={`reassess-date-${assessment.id}`}>
              Date taken (optional)
            </label>
            <input
              id={`reassess-date-${assessment.id}`}
              type="date"
              className="mt-1 w-full rounded border p-2 text-sm sm:w-56"
              style={{ borderColor: 'var(--line)' }}
              value={administeredOn}
              onChange={(event) => setAdministeredOn(event.target.value)}
            />
          </div>
          <p className={`text-xs ${muted}`}>
            A blank field is recorded as “not supplied”, never as zero. Pre-filled values are the ones already on
            record.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn" disabled={pending}>
              {pending ? 'Recording…' : 'Record the reassessment'}
            </button>
            <button type="button" className="btn" onClick={() => setReassessing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {!reassessing ? (
          <button type="button" className="underline" onClick={() => setReassessing(true)}>
            Reassess this
          </button>
        ) : null}
        {!retiring ? (
          <button type="button" className="underline" onClick={() => setRetiring(true)}>
            Retire this assessment
          </button>
        ) : null}
      </div>
    </li>
  );
}

function BaselineButton({ onLoaded, quiet = false }: { onLoaded: (created: number) => void; quiet?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await api.loadBaseline();
      onLoaded(result.created.length);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={quiet ? 'mt-4 border-t pt-3' : 'mt-4'} style={quiet ? { borderColor: 'var(--line)' } : undefined}>
      <button type="button" className="btn" disabled={pending} onClick={() => void load()}>
        {pending ? 'Loading…' : 'Load the baseline I supplied'}
      </button>
      <p className={`mt-1 text-xs ${muted}`}>
        Transcribes your own diagnostic results exactly as supplied — including the score that was never given.
        Marked as reported, never as measured.
      </p>
      {error ? <p className="mt-1 text-xs" style={{ color: 'var(--bad)' }}>{error}</p> : null}
    </div>
  );
}

function ContextCard({ context, updatedAt, onSaved }: { context: string; updatedAt: string | null; onSaved: () => void }) {
  const [draft, setDraft] = useState(context);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setState('saving');
    setError(null);
    try {
      await api.saveProfileContext(draft);
      setState('saved');
      onSaved();
    } catch (cause) {
      setState('idle');
      setError(cause instanceof ApiError ? cause.message : 'The request failed.');
    }
  };

  return (
    <Card>
      <h3 className="text-sm font-semibold">Your context</h3>
      <p className={`mt-1 text-sm ${muted}`}>
        Constraints, deadlines and goals in your own words. Free text on purpose: the system does not score it.
      </p>
      <label className="mt-3 block text-xs" htmlFor="profile-context">
        Context notes
      </label>
      <textarea
        id="profile-context"
        className="mt-1 w-full rounded border p-2 text-sm"
        style={{ borderColor: 'var(--line)' }}
        rows={4}
        maxLength={4000}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setState('idle');
        }}
        placeholder="e.g. Two evenings a week, a clinical exam in May, and a job that eats weekends."
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={state === 'saving'} onClick={() => void save()}>
          {state === 'saving' ? 'Saving…' : 'Save notes'}
        </button>
        <span role="status" className={`text-xs ${muted}`}>
          {state === 'saved' ? 'Saved.' : updatedAt ? `Last saved ${updatedAt.slice(0, 10)}` : 'Not saved yet'}
        </span>
      </div>
      {error ? <p className="mt-1 text-xs" style={{ color: 'var(--bad)' }}>{error}</p> : null}
    </Card>
  );
}

function AddAssessmentCard({ instruments, onSaved }: { instruments: Instrument[]; onSaved: (label: string) => void }) {
  const [instrumentId, setInstrumentId] = useState(instruments[0]?.id ?? '');
  const instrument = useMemo(
    () => instruments.find((candidate) => candidate.id === instrumentId) ?? instruments[0],
    [instruments, instrumentId],
  );
  const [numbers, setNumbers] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [reportedBy, setReportedBy] = useState<'learner' | 'provider-report'>('learner');
  const [administeredOn, setAdministeredOn] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceNote, setSourceNote] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  if (!instrument) return null;

  const reset = () => {
    setNumbers({});
    setLabels({});
    setSourceUrl('');
    setSourceNote('');
    setAdministeredOn('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(null);

    const { scores, error: invalid } = buildScores(instrument, numbers, labels);
    if (invalid) {
      setError(invalid);
      return;
    }

    setPending(true);
    try {
      const saved = await api.addAssessment({
        instrument: instrument.id,
        reported_by: reportedBy,
        administered_on: administeredOn,
        source_url: sourceUrl,
        source_note: sourceNote,
        scores,
      });
      setDone(`Recorded ${scores.length} score${scores.length === 1 ? '' : 's'}.`);
      reset();
      onSaved(saved.label);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The request failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <h3 className="text-sm font-semibold">Add an assessment</h3>
      <p className={`mt-1 text-sm ${muted}`}>
        Only what the instrument actually reported. Leave a field blank if it was not scored — blank is recorded as
        missing, never as zero.
      </p>

      <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs" htmlFor="instrument">
              Instrument
            </label>
            <select
              id="instrument"
              className="mt-1 w-full rounded border p-2 text-sm"
              style={{ borderColor: 'var(--line)' }}
              value={instrument.id}
              onChange={(event) => {
                setInstrumentId(event.target.value);
                reset();
                setError(null);
                setDone(null);
              }}
            >
              {instruments.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.label}
                </option>
              ))}
            </select>
            {instrument.note ? <p className={`mt-1 text-xs ${muted}`}>{instrument.note}</p> : null}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs" htmlFor="reported-by">
                Who reported these numbers?
              </label>
              <select
                id="reported-by"
                className="mt-1 w-full rounded border p-2 text-sm"
                style={{ borderColor: 'var(--line)' }}
                value={reportedBy}
                onChange={(event) => setReportedBy(event.target.value as 'learner' | 'provider-report')}
              >
                <option value="learner">I did, from my own result</option>
                <option value="provider-report">I transcribed a report</option>
              </select>
            </div>
            <div>
              <label className="block text-xs" htmlFor="administered-on">
                Date taken (optional)
              </label>
              <input
                id="administered-on"
                type="date"
                className="mt-1 w-full rounded border p-2 text-sm"
                style={{ borderColor: 'var(--line)' }}
                value={administeredOn}
                onChange={(event) => setAdministeredOn(event.target.value)}
              />
            </div>
          </div>
        </div>

        <fieldset className="rounded border p-3" style={{ borderColor: 'var(--line)' }}>
          <legend className="px-1 text-xs font-semibold">
            {instrument.scale_min !== null && instrument.scale_max !== null
              ? `Scores (scale ${instrument.scale_min}–${instrument.scale_max})`
              : 'Labels'}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {instrument.axes.map((axis) => {
              const key = axisKey(axis);
              const id = `score-${key.replace('/', '-')}`;
              return (
                <div key={key}>
                  <label className="block text-xs" htmlFor={id}>
                    {axis.label}
                  </label>
                  <input
                    id={id}
                    className="mt-1 w-full rounded border p-2 text-sm"
                    style={{ borderColor: 'var(--line)' }}
                    type={instrument.value_kind === 'label' ? 'text' : 'number'}
                    inputMode={instrument.value_kind === 'label' ? undefined : 'decimal'}
                    step={instrument.value_kind === 'label' ? undefined : 'any'}
                    min={instrument.value_kind === 'label' ? undefined : instrument.scale_min ?? undefined}
                    max={instrument.value_kind === 'label' ? undefined : instrument.scale_max ?? undefined}
                    placeholder={instrument.value_kind === 'label' ? 'not reported' : 'blank = not supplied'}
                    value={
                      instrument.value_kind === 'label' ? labels[key] ?? '' : numbers[key] ?? ''
                    }
                    onChange={(event) => {
                      const value = event.target.value;
                      if (instrument.value_kind === 'label') {
                        setLabels((current) => ({ ...current, [key]: value }));
                      } else {
                        setNumbers((current) => ({ ...current, [key]: value }));
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs" htmlFor="source-url">
              Source link (optional)
            </label>
            <input
              id="source-url"
              className="mt-1 w-full rounded border p-2 text-sm"
              style={{ borderColor: 'var(--line)' }}
              value={sourceUrl}
              maxLength={600}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className="block text-xs" htmlFor="source-note">
              How it was reported (optional)
            </label>
            <input
              id="source-note"
              className="mt-1 w-full rounded border p-2 text-sm"
              style={{ borderColor: 'var(--line)' }}
              value={sourceNote}
              maxLength={2000}
              onChange={(event) => setSourceNote(event.target.value)}
              placeholder="e.g. transcribed from a PDF report"
            />
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-sm" style={{ color: 'var(--bad)' }}>
            {error}
          </p>
        ) : null}
        {done ? (
          <p role="status" className="text-sm" style={{ color: 'var(--good)' }}>
            {done}
          </p>
        ) : null}

        <button type="submit" className="btn" disabled={pending}>
          {pending ? 'Saving…' : 'Record assessment'}
        </button>
      </form>
    </Card>
  );
}
