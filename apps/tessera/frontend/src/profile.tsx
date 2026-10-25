import { useMemo, useState } from 'react';

import {
  api,
  ApiError,
  type Assessment,
  type AssessmentScore,
  type CoreAxis,
  type Instrument,
  type ProfileResponse,
} from './api';
import { useAsync } from './hooks';
import { formatScore } from './utils';
import { Badge, Card, EmptyState, ErrorNote, Loading, SectionTitle } from './ui';

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

  if (loading) return <Loading label="Reading your profile" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  const dimensions = data.axes.filter((axis) => axis.axis === 'dimension');
  const processes = data.axes.filter((axis) => axis.axis === 'process');
  const live = data.assessments.filter((assessment) => !assessment.archived);
  const retired = data.assessments.filter((assessment) => assessment.archived);

  return (
    <div className="space-y-6">
      <SectionTitle hint="What the assessments reported, and what is still missing. Nothing here changes what you have demonstrated.">
        Learner profile
      </SectionTitle>

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

        <div className="mt-4 grid gap-6 md:grid-cols-2">
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
              <AssessmentRow key={assessment.id} assessment={assessment} onChanged={reload} onNotice={setNotice} />
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
                  <Badge>retired</Badge>
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

function AssessmentRow({
  assessment,
  onChanged,
  onNotice,
}: {
  assessment: Assessment;
  onChanged: () => void;
  onNotice: (message: string) => void;
}) {
  const [retiring, setRetiring] = useState(false);
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

  return (
    <li className="rounded-md border p-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{assessment.label}</span>
        <span className={`text-xs ${muted}`}>
          {assessment.reported_by === 'provider-report' ? 'from a supplied report' : 'you reported this'}
          {assessment.administered_on ? ` · ${assessment.administered_on}` : ' · date not recorded'}
        </span>
      </div>

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

      {error ? <p className="mt-2 text-xs" style={{ color: 'var(--bad)' }}>{error}</p> : null}

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
      ) : (
        <button type="button" className="mt-3 text-xs underline" onClick={() => setRetiring(true)}>
          Retire this assessment
        </button>
      )}
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
