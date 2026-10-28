/**
 * Learner development — the document's Phase I, on screen.
 *
 * The page is organised around the same four refusals the backend makes, because
 * an interface that hides them would undo the work:
 *
 * **No score for self-management.** The baseline section shows prose and counts
 * and says, on screen, that a percentage would imply a measurement that never
 * happened. There is no number to find.
 *
 * **A hypothesis is a claim.** Each area shows the suggested question, the claim
 * actually recorded, and a confidence badge whose reason is printed next to it.
 * "High" is never a colour without a sentence.
 *
 * **Named methods stay undefined.** The methods panel lists nine names and, under
 * each, what problem it seems to address and an openly supported alternative — with
 * the word *undefined* visible, because a tidy definition is the tempting lie.
 *
 * **The retrieval check is marked by you.** Criteria are checkboxes; passing needs
 * all of them; and the panel says the marking is self-assessment rather than
 * implying a grader exists.
 */
import { useCallback, useMemo, useState } from 'react';

import type {
  BaselineItem,
  Confidence,
  Curriculum,
  DevelopmentArea,
  DevelopmentGate,
  DevelopmentModel,
  Experiment,
  Lesson,
  Protocol,
  RetrievalResult,
} from './api';
import { api, ApiError } from './api';
import { useAsync } from './hooks';
import { Badge, Card, EmptyState, ErrorNote, Loading, SectionTitle } from './ui';

const CONFIDENCE_TONE: Record<Confidence, 'neutral' | 'good' | 'warn' | 'bad'> = {
  none: 'neutral',
  low: 'warn',
  moderate: 'neutral',
  high: 'good',
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  none: 'No evidence yet',
  low: 'Low confidence',
  moderate: 'Moderate confidence',
  high: 'Higher confidence',
};

const STATE_TONE: Record<Lesson['state'], 'neutral' | 'good' | 'warn'> = {
  not_started: 'neutral',
  studied: 'warn',
  practised: 'warn',
  retrieval_passed: 'good',
};

const STATE_LABEL: Record<Lesson['state'], string> = {
  not_started: 'Not started',
  studied: 'Studied',
  practised: 'Practised',
  retrieval_passed: 'Retrieval passed',
};

type Tab = 'model' | 'baseline' | 'curriculum' | 'protocol' | 'experiments' | 'gate';

const TABS: { key: Tab; label: string }[] = [
  { key: 'model', label: 'Learner model' },
  { key: 'baseline', label: 'Self-management' },
  { key: 'curriculum', label: 'Curriculum' },
  { key: 'protocol', label: 'Protocol' },
  { key: 'experiments', label: 'Experiments' },
  { key: 'gate', label: 'Phase I gate' },
];

function asMessage(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'The request failed.';
}

/* ---------------------------------------------------------------- the model */

function AreaCard({
  area,
  onSave,
}: {
  area: DevelopmentArea;
  onSave: (claim: string, rationale: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [claim, setClaim] = useState(area.hypothesis?.claim ?? area.suggestion.claim);
  const [rationale, setRationale] = useState(area.hypothesis?.rationale ?? area.suggestion.rationale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      await onSave(claim, rationale);
      setEditing(false);
    } catch (cause) {
      setError(asMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const stored = area.hypothesis;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{area.name}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {area.missing ? (
            <Badge>Not measured</Badge>
          ) : (
            <Badge>
              {area.score?.value ?? '—'} reported
              {area.score?.instrument_label ? ` · ${area.score.instrument_label}` : ''}
            </Badge>
          )}
          {stored ? (
            <Badge tone={CONFIDENCE_TONE[stored.confidence]}>{CONFIDENCE_LABEL[stored.confidence]}</Badge>
          ) : (
            <Badge>No claim recorded</Badge>
          )}
        </div>
      </div>

      <p className="mt-1 text-sm text-[color:var(--muted)]">{area.goal}</p>

      {area.missing ? (
        <p className="mt-2 text-sm">
          The instrument did not report this area. A missing score is not a low score, so nothing is
          assumed about it.
        </p>
      ) : null}

      {editing || !stored ? (
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-medium" htmlFor={`claim-${area.key}`}>
            The claim, in your words
          </label>
          <textarea
            id={`claim-${area.key}`}
            className="w-full rounded border p-2 text-sm"
            rows={3}
            value={claim}
            onChange={(event) => setClaim(event.target.value)}
          />
          <label className="block text-sm font-medium" htmlFor={`rationale-${area.key}`}>
            Why it is worth testing
          </label>
          <textarea
            id={`rationale-${area.key}`}
            className="w-full rounded border p-2 text-sm"
            rows={2}
            value={rationale}
            onChange={(event) => setRationale(event.target.value)}
          />
          {error ? <ErrorNote message={error} /> : null}
          <div className="flex gap-2">
            <button className="btn" type="button" onClick={save} disabled={busy}>
              {busy ? 'Saving…' : 'Record this claim'}
            </button>
            {stored ? (
              <button className="btn" type="button" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            Suggested from what is actually known: {area.suggestion.kind === 'question' ? 'a question' : 'an inference from a score'}.
            {' '}It is a starting point, not a finding.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <p>{stored.claim}</p>
          {stored.rationale ? <p className="text-[color:var(--muted)]">{stored.rationale}</p> : null}
          <p className="text-xs text-[color:var(--muted)]">
            Confidence is computed from the evidence kinds below, not chosen. Evidence:{' '}
            {stored.evidence.length
              ? stored.evidence.map((entry) => `${entry.kind} (${entry.count})`).join(', ')
              : 'none recorded'}
            .
          </p>
          {stored.contradict.length ? (
            <p className="text-xs">
              <span className="font-medium">Would be contradicted by:</span> {stored.contradict.join('; ')}
            </p>
          ) : null}
          {stored.status !== 'open' ? (
            <p className="text-xs">
              Marked <strong>{stored.status}</strong>
              {stored.review_note ? `: ${stored.review_note}` : ''}
            </p>
          ) : null}
          <button className="btn" type="button" onClick={() => setEditing(true)}>
            Revise the claim
          </button>
        </div>
      )}
    </Card>
  );
}

function ModelPanel({ model, onReload }: { model: DevelopmentModel; onReload: () => void }) {
  const [error, setError] = useState('');

  const save = useCallback(
    async (area: DevelopmentArea, claim: string, rationale: string) => {
      try {
        await api.writeHypothesis({
          scope: area.scope,
          key: area.key,
          claim,
          rationale,
          support: area.suggestion.support,
          contradict: area.suggestion.contradict,
        });
        onReload();
      } catch (cause) {
        setError(asMessage(cause));
        throw cause;
      }
    },
    [onReload],
  );

  const dimensions = model.areas.filter((area) => area.scope === 'dimension');
  const processes = model.areas.filter((area) => area.scope === 'process');

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-base font-semibold">What this page will not do</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {model.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Confidence policy — {model.confidence_policy.none} · {model.confidence_policy.low} ·{' '}
          {model.confidence_policy.moderate} · {model.confidence_policy.high}
        </p>
      </Card>

      {error ? <ErrorNote message={error} /> : null}

      <SectionTitle hint="Each area carries a claim or an explicit question. Nothing is inferred silently.">
        Dimensions
      </SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {dimensions.map((area) => (
          <AreaCard key={area.key} area={area} onSave={(claim, rationale) => save(area, claim, rationale)} />
        ))}
      </div>

      <SectionTitle hint="Processes are trained, not scored. Each has a drill and a failure mode.">Processes</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {processes.map((area) => (
          <AreaCard key={area.key} area={area} onSave={(claim, rationale) => save(area, claim, rationale)} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the baseline */

function BaselinePanel() {
  const state = useAsync(() => api.developmentBaseline(), []);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [observation, setObservation] = useState<Record<string, string>>({
    task: '',
    planned_minutes: '40',
    actual_minutes: '0',
    started_after_minutes: '0',
    interruptions: '0',
    resumed_after_minutes: '0',
  });
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  const items: BaselineItem[] = state.data?.items ?? [];
  const unanswered = items.filter((item) => !answers[item.key]);

  async function submit() {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const payload = {
        ...Object.fromEntries(
          ['planned_minutes', 'actual_minutes', 'started_after_minutes', 'interruptions', 'resumed_after_minutes'].map(
            (key) => [key, Number.parseInt(observation[key] || '0', 10) || 0],
          ),
        ),
        task: observation.task,
        finished,
      };
      const result = await api.recordBaseline(
        items.map((item) => ({ key: item.key, answer: answers[item.key] ?? '' })),
        payload,
      );
      setSaved(result.summary);
      state.reload();
    } catch (cause) {
      setError(asMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (state.loading) return <Loading label="Loading the baseline…" />;
  if (state.error) return <ErrorNote message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;

  const baseline = state.data.baseline;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-base font-semibold">Why there is no score here</h3>
        <p className="mt-1 text-sm">{state.data.why_no_score}</p>
        <p className="mt-2 text-xs text-[color:var(--muted)]">{baseline?.score_note ?? ''}</p>
      </Card>

      {baseline ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">Your latest baseline</h3>
            <Badge>No score by design</Badge>
          </div>
          <p className="mt-2 text-sm" data-testid="baseline-summary">
            {baseline.summary}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {baseline.items.map((item) => (
              <div key={item.key}>
                <dt className="text-xs text-[color:var(--muted)]">{item.key}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        <EmptyState
          title="No baseline yet"
          body="Nine statements and one timed session. It describes how work actually starts and stops — it does not score you."
        />
      )}

      <SectionTitle hint="Answer for the last two weeks, not for the learner you would like to be.">
        Record a baseline
      </SectionTitle>

      <Card className="space-y-4 p-4">
        {items.map((item) => (
          <fieldset key={item.key}>
            <legend className="text-sm font-medium">{item.prompt}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {item.options.map((option) => (
                <label key={option} className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name={item.key}
                    value={option}
                    checked={answers[item.key] === option}
                    onChange={() => setAnswers((current) => ({ ...current, [item.key]: option }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="border-t pt-3">
          <h4 className="text-sm font-semibold">The observation task</h4>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            One real session, timed. This is the part that is not self-report.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              What you intended to do
              <input
                className="mt-1 w-full rounded border p-2 text-sm"
                value={observation.task}
                onChange={(event) => setObservation({ ...observation, task: event.target.value })}
              />
            </label>
            {state.data.observation_fields
              .filter((field) => field.key !== 'task' && field.key !== 'finished')
              .map((field) => (
                <label key={field.key} className="text-sm">
                  {field.label}
                  <input
                    className="mt-1 w-full rounded border p-2 text-sm"
                    inputMode="numeric"
                    value={observation[field.key] ?? ''}
                    onChange={(event) => setObservation({ ...observation, [field.key]: event.target.value })}
                  />
                </label>
              ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={finished} onChange={() => setFinished((value) => !value)} />
            The objective was met
          </label>
        </div>

        {error ? <ErrorNote message={error} /> : null}
        {saved ? (
          <p className="text-sm" role="status">
            Recorded. {saved}
          </p>
        ) : null}

        <button className="btn" type="button" onClick={submit} disabled={busy || unanswered.length > 0 || !observation.task}>
          {busy ? 'Recording…' : 'Record baseline'}
        </button>
        {unanswered.length ? (
          <p className="text-xs text-[color:var(--muted)]">
            {unanswered.length} statement(s) still unanswered. A partial baseline is not a baseline.
          </p>
        ) : null}
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------- the curriculum */

function LessonCard({ lesson, onChanged }: { lesson: Lesson; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [met, setMet] = useState<number[]>(lesson.criteria_met);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RetrievalResult | null>(null);

  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await run();
      onChanged();
    } catch (cause) {
      setError(asMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{lesson.title}</h3>
        <Badge tone={STATE_TONE[lesson.state]}>{STATE_LABEL[lesson.state]}</Badge>
      </div>
      <p className="mt-1 text-xs text-[color:var(--muted)]">
        Group {lesson.group} · {lesson.group_title} · {lesson.topics.length} topic(s)
      </p>
      <p className="mt-2 text-sm">{lesson.model}</p>

      <button className="btn mt-2" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        {open ? 'Hide the lesson' : 'Open the lesson'}
      </button>

      {open ? (
        <div className="mt-3 space-y-2 text-sm">
          <p>
            <span className="font-medium">Use it when: </span>
            {lesson.when_to_use}
          </p>
          <p>
            <span className="font-medium">Not when: </span>
            {lesson.when_not_to_use}
          </p>
          <p>
            <span className="font-medium">Worked example: </span>
            {lesson.worked_example}
          </p>
          <p>
            <span className="font-medium">Exercise: </span>
            {lesson.exercise}
          </p>
          <p>
            <span className="font-medium">Judging results: </span>
            {lesson.judging_results}
          </p>
          <p>
            <span className="font-medium">Traps: </span>
            {lesson.traps}
          </p>
          <ul className="list-disc pl-5 text-xs text-[color:var(--muted)]">
            {lesson.topics.map((topic) => (
              <li key={topic.key}>{topic.title}</li>
            ))}
          </ul>

          <div className="rounded border p-3">
            <h4 className="text-sm font-semibold">Retrieval check</h4>
            <p className="mt-1 text-sm">{lesson.retrieval_check.question}</p>
            <textarea
              className="mt-2 w-full rounded border p-2 text-sm"
              rows={3}
              aria-label="Your answer, from memory"
              placeholder="Answer from memory. The page cannot check this — you will."
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
            />
            <fieldset className="mt-2">
              <legend className="text-xs text-[color:var(--muted)]">
                Which criteria did your answer meet?
              </legend>
              {lesson.retrieval_check.criteria.map((criterion, index) => (
                <label key={criterion} className="mt-1 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={met.includes(index)}
                    onChange={() =>
                      setMet((current) =>
                        current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
                      )
                    }
                  />
                  {criterion}
                </label>
              ))}
            </fieldset>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Marking is yours: the criteria are prose, and a keyword match would be a fake grade.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => act(() => api.studyLesson(lesson.slug))}
              >
                Mark studied
              </button>
              <button
                className="btn"
                type="button"
                disabled={busy}
                onClick={() => act(() => api.practiseLesson(lesson.slug))}
              >
                Mark practised
              </button>
              <button
                className="btn"
                type="button"
                disabled={busy || answer.trim().length < 20}
                onClick={() =>
                  act(async () => {
                    const outcome = await api.submitRetrieval(lesson.slug, answer, met);
                    setResult(outcome);
                  })
                }
              >
                Submit the retrieval check
              </button>
            </div>
            {result ? (
              <p className="mt-2 text-sm" role="status">
                {result.passed
                  ? 'Passed — every criterion was met.'
                  : `Not yet. ${result.still_open.length} criterion(s) still open.`}
              </p>
            ) : null}
            {error ? <ErrorNote message={error} /> : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function CurriculumPanel({ curriculum, onChanged }: { curriculum: Curriculum; onChanged: () => void }) {
  const [group, setGroup] = useState('all');
  const lessons = group === 'all' ? curriculum.lessons : curriculum.lessons.filter((lesson) => lesson.group === group);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Coverage</h3>
          <p className="text-sm text-[color:var(--muted)]">
            {curriculum.progress.practised} of {curriculum.progress.total} practised ·{' '}
            {curriculum.progress.retrieval_passed} retrieval check(s) passed
          </p>
        </div>
        <p className="mt-1 text-sm">
          Every topic the document names is attached to exactly one lesson. A test asserts that
          partition, so nothing can be dropped quietly.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            className="btn"
            type="button"
            aria-pressed={group === 'all'}
            onClick={() => setGroup('all')}
          >
            All groups
          </button>
          {Object.entries(curriculum.progress.groups).map(([key, info]) => (
            <button
              key={key}
              className="btn"
              type="button"
              aria-pressed={group === key}
              onClick={() => setGroup(key)}
            >
              {key} · {info.title} ({info.lessons})
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {lessons.map((lesson) => (
          <LessonCard key={lesson.slug} lesson={lesson} onChanged={onChanged} />
        ))}
      </div>

      <SectionTitle hint="Nine named methods arrived without definitions. None has been invented.">
        Named methods
      </SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        {curriculum.named_methods.map((method) => (
          <Card key={method.name} className="p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{method.name}</h3>
              <Badge tone="warn">undefined</Badge>
            </div>
            <p className="mt-1 text-sm">
              <span className="font-medium">Problem it appears to address: </span>
              {method.problem}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-medium">Openly supported alternative: </span>
              {method.open_alternative}
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">{method.note}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the protocol */

function ProtocolPanel({ protocol, onSaved }: { protocol: Protocol; onSaved: () => void }) {
  const [sections, setSections] = useState<Record<string, string>>(() =>
    Object.fromEntries(protocol.sections.map((section) => [section.key, section.text])),
  );
  const [examples, setExamples] = useState<Record<string, string>>(() =>
    Object.fromEntries(protocol.material_examples.map((example) => [example.key, example.text])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      const result = await api.saveProtocol(sections, examples);
      setSaved(result.complete ? `Version ${result.version} saved. Complete.` : `Version ${result.version} saved. Still missing: ${result.missing.join(', ')}.`);
      onSaved();
    } catch (cause) {
      setError(asMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Your operating procedure</h3>
          <Badge tone={protocol.complete ? 'good' : 'warn'}>
            {protocol.complete ? 'Complete' : `${protocol.missing.length} part(s) empty`}
          </Badge>
        </div>
        <p className="mt-1 text-sm">
          Nothing here is prefilled. A protocol written by the assistant would be the assistant's,
          and the point is that it is yours.
        </p>
      </Card>

      {protocol.sections.map((section) => (
        <Card key={section.key} className="p-4">
          <label className="block text-sm font-medium" htmlFor={`protocol-${section.key}`}>
            {section.label}
          </label>
          <textarea
            id={`protocol-${section.key}`}
            className="mt-1 w-full rounded border p-2 text-sm"
            rows={2}
            value={sections[section.key] ?? ''}
            onChange={(event) => setSections({ ...sections, [section.key]: event.target.value })}
          />
        </Card>
      ))}

      <SectionTitle hint="One example per kind of material. The four are not interchangeable.">
        Material examples
      </SectionTitle>
      {protocol.material_examples.map((example) => (
        <Card key={example.key} className="p-4">
          <label className="block text-sm font-medium" htmlFor={`material-${example.key}`}>
            {example.label}
          </label>
          <p className="text-xs text-[color:var(--muted)]">{example.guidance}</p>
          <textarea
            id={`material-${example.key}`}
            className="mt-1 w-full rounded border p-2 text-sm"
            rows={2}
            value={examples[example.key] ?? ''}
            onChange={(event) => setExamples({ ...examples, [example.key]: event.target.value })}
          />
        </Card>
      ))}

      {error ? <ErrorNote message={error} /> : null}
      {saved ? (
        <p className="text-sm" role="status">
          {saved}
        </p>
      ) : null}
      <button className="btn" type="button" onClick={save} disabled={busy}>
        {busy ? 'Saving…' : 'Save a new version'}
      </button>
    </div>
  );
}

/* ---------------------------------------------------------- the experiments */

function ExperimentsPanel({ minSample }: { minSample: number }) {
  const state = useAsync(() => api.developmentExperiments(), []);
  const [form, setForm] = useState({ technique: '', hypothesis: '', predicted: '', measure: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    setBusy(true);
    setError('');
    try {
      await api.createExperiment(form);
      setForm({ technique: '', hypothesis: '', predicted: '', measure: '' });
      state.reload();
    } catch (cause) {
      setError(asMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-base font-semibold">Why a sample size is demanded</h3>
        <p className="mt-1 text-sm">{state.data?.rule ?? `A conclusion needs at least ${minSample} comparable cases.`}</p>
      </Card>

      <SectionTitle hint="Written before the result exists, or it is a description of the result.">
        Design an experiment
      </SectionTitle>
      <Card className="space-y-2 p-4">
        {(
          [
            ['technique', 'Technique under test'],
            ['hypothesis', 'What you expect to happen'],
            ['predicted', 'What you predict you will see'],
            ['measure', 'How the result will be judged'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-sm">
            {label}
            <input
              className="mt-1 w-full rounded border p-2 text-sm"
              value={form[key]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </label>
        ))}
        {error ? <ErrorNote message={error} /> : null}
        <button className="btn" type="button" onClick={create} disabled={busy || !form.technique || !form.hypothesis || !form.measure}>
          {busy ? 'Saving…' : 'Record the experiment'}
        </button>
      </Card>

      {state.loading ? <Loading label="Loading experiments…" /> : null}
      {state.error ? <ErrorNote message={state.error} onRetry={state.reload} /> : null}
      {state.data?.experiments.length === 0 ? (
        <EmptyState title="No experiments yet" body="A protocol without a test is a hope." />
      ) : null}
      {(state.data?.experiments ?? []).map((experiment: Experiment) => (
        <Card key={experiment.id} className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{experiment.technique}</h3>
            <Badge tone={experiment.outcome === 'supported' ? 'good' : experiment.outcome === 'pending' ? 'warn' : 'neutral'}>
              {experiment.outcome}
            </Badge>
          </div>
          <p className="mt-1 text-sm">{experiment.hypothesis}</p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">Measure: {experiment.measure}</p>
          {experiment.observed ? <p className="mt-1 text-sm">Observed: {experiment.observed}</p> : null}
          {experiment.caveat ? <p className="mt-1 text-xs">{experiment.caveat}</p> : null}
        </Card>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- the gate */

function GatePanel({ gate }: { gate: DevelopmentGate }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">Phase I deliverables</h3>
          <Badge tone={gate.ready ? 'good' : 'warn'}>
            {gate.done} of {gate.total}
          </Badge>
        </div>
        <p className="mt-1 text-sm">{gate.note}</p>
      </Card>
      {gate.requirements.map((requirement) => (
        <Card key={requirement.key} className="p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-sm font-semibold">{requirement.label}</h4>
            <Badge tone={requirement.done ? 'good' : 'warn'}>{requirement.done ? 'Met' : 'Outstanding'}</Badge>
          </div>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{requirement.detail}</p>
          {!requirement.done && requirement.missing.length ? (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {requirement.missing.slice(0, 6).map((item) => (
                <li key={item}>{item}</li>
              ))}
              {requirement.missing.length > 6 ? <li>…and {requirement.missing.length - 6} more</li> : null}
            </ul>
          ) : null}
        </Card>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- the page */

export function DevelopmentPage() {
  const [tab, setTab] = useState<Tab>('model');
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((value) => value + 1), []);

  const model = useAsync(() => api.developmentModel(), [nonce]);
  const curriculum = useAsync(() => api.developmentCurriculum(), [nonce]);
  const protocol = useAsync(() => api.developmentProtocol(), [nonce]);
  const gate = useAsync(() => api.developmentGate(), [nonce]);

  const loading = useMemo(
    () => model.loading || curriculum.loading || protocol.loading || gate.loading,
    [model.loading, curriculum.loading, protocol.loading, gate.loading],
  );

  if (loading) return <Loading label="Loading learner development…" />;
  const failure = model.error ?? curriculum.error ?? protocol.error ?? gate.error;
  if (failure) return <ErrorNote message={failure} onRetry={reload} />;
  if (!model.data || !curriculum.data || !protocol.data || !gate.data) return null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h2 className="text-xl font-semibold">Learner development</h2>
        <p className="mt-1 text-sm">
          The document's Phase I: a provisional learner model, a behavioural baseline, the technique
          curriculum, a personal protocol, and a plan to test it.
        </p>
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          {gate.data.done} of {gate.data.total} Phase I deliverables are present.
        </p>
        <nav className="mt-3 flex flex-wrap gap-1" aria-label="Learner development sections">
          {TABS.map((item) => (
            <button
              key={item.key}
              className="btn"
              type="button"
              aria-pressed={tab === item.key}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </Card>

      {tab === 'model' ? <ModelPanel model={model.data} onReload={reload} /> : null}
      {tab === 'baseline' ? <BaselinePanel /> : null}
      {tab === 'curriculum' ? <CurriculumPanel curriculum={curriculum.data} onChanged={reload} /> : null}
      {tab === 'protocol' ? <ProtocolPanel protocol={protocol.data} onSaved={reload} /> : null}
      {tab === 'experiments' ? <ExperimentsPanel minSample={gate.data.total ? 5 : 5} /> : null}
      {tab === 'gate' ? <GatePanel gate={gate.data} /> : null}
    </div>
  );
}
