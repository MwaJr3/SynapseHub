/**
 * The Library: what the learner adds themselves.
 *
 * Three things live here, in the order the learning lifecycle suggests:
 *
 * 1. **Concepts** — the ideas being learned, including their own.
 * 2. **Notes** — material kept for later lookup, searchable, with the matched
 *    terms shown so the result explains itself.
 * 3. **Sessions** — a sitting with an objective and a stopping condition, which
 *    ends with a line of reflection.
 *
 * Two decisions are visible in the interface rather than only in the API:
 *
 * * A concept is never deleted on one click. The first request asks the server
 *   what would go with it and shows that number, so nobody removes a term's
 *   worth of notes by accident.
 * * Finished sessions are shown as records and cannot be edited; an open session
 *   is the only editable one, and it is resumable after an interruption.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  LearningSession,
  LibraryResponse,
  KnowledgeRow,
  Note,
  OwnConcept,
  Relation,
  RelationType,
  SessionActivity,
} from './api';
import { api, ApiError } from './api';
import { useAsync } from './hooks';
import { Badge, Card, ErrorNote, Loading, SectionTitle } from './ui';

/* ------------------------------------------------------------------ helpers */

function errorMessage(cause: unknown): string {
  return cause instanceof ApiError ? cause.message : 'The request failed.';
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const STATUS_TONE = {
  open: 'warn',
  completed: 'good',
  partial: 'neutral',
  abandoned: 'neutral',
} as const;

/* -------------------------------------------------------------- concepts */

function ConceptForm({ onCreated }: { onCreated: (concept: OwnConcept) => void }) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [difficulty, setDifficulty] = useState('3');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createConcept({
        title: title.trim(),
        subject: subject.trim(),
        summary: summary.trim(),
        difficulty: Number(difficulty),
      });
      onCreated(created);
      setTitle('');
      setSummary('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="mt-4 grid gap-3" onSubmit={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Concept</span>
          <input
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Opportunity cost"
            minLength={2}
            maxLength={200}
            required
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Subject</span>
          {/* A plain text field, not a fixed list: the learner's subject
              vocabulary is theirs. */}
          <input
            className="field"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="e.g. Economics"
            maxLength={80}
            required
          />
        </label>
      </div>
      <label className="text-sm">
        <span className="mb-1 block font-medium">In one line</span>
        <input
          className="field"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Optional. What this is, without the textbook wording."
          maxLength={2000}
        />
      </label>
      <label className="text-sm sm:w-56">
        <span className="mb-1 block font-medium">Difficulty (1–5)</span>
        <input
          className="field"
          type="number"
          min={1}
          max={5}
          step={0.5}
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value)}
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Adding…' : 'Add concept'}
        </button>
      </div>
    </form>
  );
}

function ConceptRow({ concept, onDelete, onChoose }: {
  concept: OwnConcept;
  onDelete: (concept: OwnConcept) => void;
  onChoose: (concept: OwnConcept) => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border-b py-3 last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      <div className="min-w-0">
        <p className="font-medium">{concept.title}</p>
        <p className="text-sm text-[color:var(--muted)]">
          {concept.subject} · difficulty {concept.difficulty}
          {concept.summary ? ` · ${concept.summary}` : ''}
        </p>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn" onClick={() => onChoose(concept)}>
          Use in a note
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onDelete(concept)}
          aria-label={`Delete ${concept.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------- relations */

function RelationsPanel({
  options,
  relationTypes,
}: {
  options: { id: string; title: string; subject: string }[];
  relationTypes: RelationType[];
}) {
  const [subject, setSubject] = useState(options[0]?.id ?? '');
  const [target, setTarget] = useState('');
  const [relation, setRelation] = useState(relationTypes.find((item) => item.id === 'prerequisite')?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!subject && options[0]) setSubject(options[0].id);
  }, [options, subject]);

  const list = useAsync<{ relations: Relation[] }>(
    () => (subject ? api.relations(subject) : Promise.resolve({ relations: [] })),
    [subject, nonce],
  );

  const chosen = relationTypes.find((item) => item.id === relation);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.relate(subject, target, relation);
      if (!result.created) {
        setError('That relation already exists, so nothing was added.');
      }
      setNonce((value) => value + 1);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (options.length < 2) {
    return (
      <p className="text-sm text-[color:var(--muted)]">
        Relations need two concepts to connect. Add one, or draw on the seeded curriculum.
      </p>
    );
  }

  return (
    <div>
      <label className="text-sm sm:w-80">
        <span className="mb-1 block font-medium">Relations of</span>
        <select className="field" value={subject} onChange={(event) => setSubject(event.target.value)}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.title} — {option.subject}
            </option>
          ))}
        </select>
      </label>

      {list.loading ? <p className="mt-2 text-sm text-[color:var(--muted)]">Loading relations…</p> : null}
      {list.error ? <p className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>{list.error}</p> : null}
      {list.data && list.data.relations.length === 0 ? (
        <p className="mt-2 text-sm text-[color:var(--muted)]">No relations recorded for this concept.</p>
      ) : null}
      {list.data && list.data.relations.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm">
          {list.data.relations.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {item.from_title} <em>{item.label}</em> {item.to_title}
              </span>
              {item.removable ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    void api.unrelate(item.id).then(() => setNonce((value) => value + 1));
                  }}
                  aria-label={`Remove ${item.from_title} ${item.label} ${item.to_title}`}
                >
                  Remove
                </button>
              ) : (
                <Badge>catalogue</Badge>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <form className="mt-3 grid gap-2 sm:grid-cols-[9rem_1fr_auto]" onSubmit={add}>
        <label className="text-sm">
          <span className="sr-only">Relation type</span>
          <select className="field" value={relation} onChange={(event) => setRelation(event.target.value)}>
            {relationTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Other concept</span>
          <select className="field" value={target} onChange={(event) => setTarget(event.target.value)} required>
            <option value="">Choose the other concept…</option>
            {options
              .filter((option) => option.id !== subject)
              .map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
          </select>
        </label>
        <button type="submit" className="btn" disabled={busy || !target}>
          {busy ? 'Adding…' : 'Add relation'}
        </button>
      </form>
      {chosen ? (
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          {chosen.meaning}
          {chosen.gates === 'true' ? ' Circular prerequisites are refused: they could never unblock.' : ''}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ notes */

function NoteSearch({ onResults }: { onResults: (query: string) => void }) {
  const [query, setQuery] = useState('');
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onResults(query.trim());
      }}
    >
      <label className="flex-1 text-sm">
        <span className="sr-only">Search your notes</span>
        <input
          className="field"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your notes — words, not questions"
        />
      </label>
      <button type="submit" className="btn">
        Search
      </button>
      {query ? (
        <button
          type="button"
          className="btn"
          onClick={() => {
            setQuery('');
            onResults('');
          }}
        >
          Clear
        </button>
      ) : null}
    </form>
  );
}

function NoteCard({ note, onDelete }: { note: Note; onDelete: (note: Note) => void }) {
  return (
    <li className="border-b py-3 last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{note.title}</p>
          <p className="text-xs text-[color:var(--muted)]">
            {note.concept_title}
            {note.source_ref ? ` · ${note.source_ref}` : ''} · edited {formatWhen(note.updated_at)}
          </p>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => onDelete(note)}
          aria-label={`Delete note ${note.title}`}
        >
          Delete
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
      {note.matched.length > 0 ? (
        <p className="mt-2 text-xs text-[color:var(--muted)]">
          Matched: {note.matched.join(', ')}
        </p>
      ) : null}
    </li>
  );
}

/* --------------------------------------------------------------- sessions */

function SessionComposer({
  concepts,
  onStarted,
}: {
  concepts: OwnConcept[];
  onStarted: (session: LearningSession) => void;
}) {
  const [conceptId, setConceptId] = useState(concepts[0]?.id ?? '');
  const [objective, setObjective] = useState('');
  const [stopping, setStopping] = useState('');
  const [minutes, setMinutes] = useState('25');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conceptId && concepts[0]) setConceptId(concepts[0].id);
  }, [concepts, conceptId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const started = await api.startSession({
        concept_id: conceptId,
        objective: objective.trim(),
        stopping_condition: stopping.trim(),
        planned_minutes: Number(minutes),
      });
      onStarted(started);
      setObjective('');
      setStopping('');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (concepts.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted)]">
        Pick something from the knowledge bank to work on, or add a concept above — a session needs a concept to be
        about.
      </p>
    );
  }

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <label className="text-sm">
        <span className="mb-1 block font-medium">Concept</span>
        <select className="field" value={conceptId} onChange={(event) => setConceptId(event.target.value)}>
          {concepts.map((concept) => (
            <option key={concept.id} value={concept.id}>
              {concept.title} — {concept.subject}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium">What is this sitting for?</span>
        <input
          className="field"
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder="Explain the light reactions without notes"
          required
          minLength={3}
          maxLength={500}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="text-sm">
          <span className="mb-1 block font-medium">When do you stop?</span>
          <input
            className="field"
            value={stopping}
            onChange={(event) => setStopping(event.target.value)}
            placeholder="Two clean explanations in a row, or 25 minutes"
            required
            minLength={3}
            maxLength={500}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Planned minutes</span>
          <input
            className="field"
            type="number"
            min={5}
            max={240}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p role="alert" className="text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      ) : null}
      <div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Starting…' : 'Start session'}
        </button>
      </div>
    </form>
  );
}

function OpenSession({
  session,
  activities,
  onChange,
}: {
  session: LearningSession;
  activities: { id: string; label: string }[];
  onChange: () => void;
}) {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState(session.reflection);
  const [minutes, setMinutes] = useState(String(session.planned_minutes));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveActivities = async (next: SessionActivity[]) => {
    setBusy(true);
    setError(null);
    try {
      await api.updateSession(session.id, { activities: next });
      setChosen({});
      onChange();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const addActivity = async () => {
    const stage = Object.keys(chosen)[0];
    if (!stage) {
      setError('Choose an activity first.');
      return;
    }
    await saveActivities([...session.activities, { stage, note: chosen[stage]?.trim() ?? '' }]);
  };

  const finish = async (outcome: 'completed' | 'partial' | 'abandoned') => {
    setBusy(true);
    setError(null);
    try {
      await api.finishSession(session.id, {
        outcome,
        reflection: reflection.trim(),
        minutes_spent: Number(minutes),
      });
      onChange();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="border-b py-4 last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{session.objective}</p>
          <p className="text-sm text-[color:var(--muted)]">
            {session.concept_title} · stop when: {session.stopping_condition} · started{' '}
            {formatWhen(session.started_at)}
          </p>
        </div>
        <Badge tone={STATUS_TONE[session.status]}>open</Badge>
      </div>

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--muted)]">What you did</p>
        {session.activities.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">Nothing recorded yet.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {session.activities.map((activity, index) => (
              <li key={`${activity.stage}-${index}`}>
                <span className="font-medium">{activity.stage}</span>
                {activity.note ? ` — ${activity.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
        <label className="text-sm">
          <span className="sr-only">Activity</span>
          <select
            className="field"
            defaultValue=""
            onChange={(event) => setChosen({ [event.target.value]: '' })}
          >
            <option value="">Add an activity…</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">What happened</span>
          <input
            className="field"
            value={Object.values(chosen)[0] ?? ''}
            onChange={(event) => {
              const stage = Object.keys(chosen)[0];
              if (stage) setChosen({ [stage]: event.target.value });
            }}
            placeholder="A few words about it (optional)"
          />
        </label>
        <button type="button" className="btn" onClick={() => void addActivity()} disabled={busy}>
          Record
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Reflection — one line is enough</span>
          <textarea
            className="field"
            rows={2}
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What worked, and what you would change next time."
          />
        </label>
        <label className="text-sm sm:w-40">
          <span className="mb-1 block font-medium">Minutes spent</span>
          <input
            className="field"
            type="number"
            min={0}
            max={600}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>
          {error}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={busy} onClick={() => void finish('completed')}>
          Finish — done as planned
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void finish('partial')}>
          Finish — partway
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => void finish('abandoned')}>
          Stop without finishing
        </button>
      </div>
      <p className="mt-2 text-xs text-[color:var(--muted)]">
        A session you worked in needs a reflection; one you abandoned does not. Both stay in the record.
      </p>
    </li>
  );
}

function FinishedSession({ session }: { session: LearningSession }) {
  return (
    <li className="border-b py-3 last:border-b-0" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">{session.objective}</p>
          <p className="text-xs text-[color:var(--muted)]">
            {session.concept_title} · {formatWhen(session.finished_at)}
            {session.minutes_spent !== null ? ` · ${session.minutes_spent} min` : ''}
            {session.covered.length ? ` · ${session.covered.join(', ')}` : ''}
          </p>
        </div>
        <Badge tone={STATUS_TONE[session.status]}>{session.status}</Badge>
      </div>
      {session.reflection ? <p className="mt-1 text-sm">{session.reflection}</p> : null}
    </li>
  );
}

/* ------------------------------------------------------------------- page */

export function LibraryPage({ onOpenConcept }: { onOpenConcept: (id: string) => void }) {
  const overview = useAsync<LibraryResponse>(() => api.library(), []);
  const catalogue = useAsync<{ concepts: KnowledgeRow[] }>(() => api.knowledge(), []);
  const [noteQuery, setNoteQuery] = useState('');
  const notes = useAsync(() => api.notes(noteQuery), [noteQuery]);
  const sessions = useAsync(() => api.sessions(), []);

  const [noteConcept, setNoteConcept] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteSource, setNoteSource] = useState('');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [noteBusy, setNoteBusy] = useState(false);

  // Deleting a concept is a two-step conversation: the server reports what would
  // go with it and the interface repeats that before the second request.
  const [pendingDelete, setPendingDelete] = useState<{ concept: OwnConcept; impact: string } | null>(null);

  const refreshAll = useCallback(() => {
    overview.reload();
    notes.reload();
    sessions.reload();
  }, [overview, notes, sessions]);

  const conceptsForPickers = useMemo(() => overview.data?.concepts ?? [], [overview.data]);

  // Every concept the learner can see, for the relation pickers: the catalogue
  // plus their own. The API refuses anything else, so the list is a convenience
  // rather than the security boundary.
  const relationOptions = useMemo(() => {
    const rows = new Map<string, { id: string; title: string; subject: string }>();
    for (const row of catalogue.data?.concepts ?? []) {
      rows.set(row.concept_id, { id: row.concept_id, title: row.title, subject: row.subject });
    }
    for (const concept of overview.data?.concepts ?? []) {
      rows.set(concept.id, { id: concept.id, title: concept.title, subject: concept.subject });
    }
    return [...rows.values()];
  }, [catalogue.data, overview.data]);

  useEffect(() => {
    if (!noteConcept && conceptsForPickers[0]) setNoteConcept(conceptsForPickers[0].id);
  }, [conceptsForPickers, noteConcept]);

  const submitNote = async (event: React.FormEvent) => {
    event.preventDefault();
    setNoteBusy(true);
    setNoteError(null);
    try {
      await api.createNote({
        concept_id: noteConcept,
        title: noteTitle.trim(),
        body: noteBody.trim(),
        source_ref: noteSource.trim(),
      });
      setNoteTitle('');
      setNoteBody('');
      setNoteSource('');
      notes.reload();
      overview.reload();
    } catch (cause) {
      setNoteError(errorMessage(cause));
    } finally {
      setNoteBusy(false);
    }
  };

  const askDelete = async (concept: OwnConcept) => {
    try {
      await api.deleteConcept(concept.id);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        // The refusal *is* the impact report.
        setPendingDelete({ concept, impact: cause.message });
        return;
      }
      setPendingDelete({ concept, impact: errorMessage(cause) });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await api.deleteConcept(pendingDelete.concept.id, true);
    setPendingDelete(null);
    refreshAll();
  };

  const open = sessions.data?.sessions.filter((session) => session.status === 'open') ?? [];
  const finished = sessions.data?.sessions.filter((session) => session.status !== 'open') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle hint="Concepts you add, notes you keep, sessions you actually run. Nothing here is inferred from activity elsewhere.">
          Your material
        </SectionTitle>
        {overview.loading ? <Loading label="Loading your library" /> : null}
        {overview.error ? <ErrorNote message={overview.error} onRetry={overview.reload} /> : null}
        {overview.data ? (
          <p className="text-sm text-[color:var(--muted)]">
            {overview.data.stats.concepts_own} concept(s) · {overview.data.stats.notes} note(s) ·{' '}
            {overview.data.stats.sessions_finished} session(s) · {overview.data.stats.minutes_recorded} minute(s)
            recorded.
            <span className="mt-1 block text-xs">{overview.data.stats.note}</span>
          </p>
        ) : null}
      </div>

      <Card>
        <SectionTitle hint="Anything you can name is learnable. The catalogue is shared; these are yours.">
          Your concepts
        </SectionTitle>
        {pendingDelete ? (
          <div role="alertdialog" aria-label="Confirm deletion" className="mb-4 rounded-md border p-3 text-sm" style={{ borderColor: 'var(--bad)' }}>
            <p className="font-medium">Delete “{pendingDelete.concept.title}”?</p>
            <p className="mt-1 text-[color:var(--muted)]">{pendingDelete.impact}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" className="btn" onClick={() => void confirmDelete()}>
                Delete it
              </button>
              <button type="button" className="btn" onClick={() => setPendingDelete(null)}>
                Keep it
              </button>
            </div>
          </div>
        ) : null}

        {conceptsForPickers.length === 0 && overview.data ? (
          <p className="text-sm text-[color:var(--muted)]">
            You have not added a concept yet. The knowledge bank still has the seeded curriculum.
          </p>
        ) : (
          <ul className="mt-2">
            {conceptsForPickers.map((concept) => (
              <ConceptRow
                key={concept.id}
                concept={concept}
                onDelete={(target) => void askDelete(target)}
                onChoose={(target) => {
                  setNoteConcept(target.id);
                  onOpenConcept(target.id);
                }}
              />
            ))}
          </ul>
        )}
        <ConceptForm
          onCreated={() => {
            overview.reload();
          }}
        />
      </Card>

      <Card>
        <SectionTitle hint="Relations you draw are yours; the catalogue's are shared. Only a prerequisite changes what gets recommended — the rest describe how you think about the ideas.">
          Relations
        </SectionTitle>
        {overview.data ? (
          <RelationsPanel options={relationOptions} relationTypes={overview.data.relations} />
        ) : (
          <Loading label="Loading relation types" />
        )}
      </Card>

      <Card>
        <SectionTitle hint="A note is for looking something up later. It is not evidence of learning, and it does not change your mastery.">
          Notes
        </SectionTitle>
        <NoteSearch onResults={setNoteQuery} />

        {noteQuery ? (
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            {notes.data?.explanation ?? 'Matching notes…'}
          </p>
        ) : null}

        {notes.loading ? <Loading label="Loading notes" /> : null}
        {notes.error ? <ErrorNote message={notes.error} onRetry={notes.reload} /> : null}
        {notes.data && notes.data.notes.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            {noteQuery ? 'No note matched those words.' : 'No notes yet.'}
          </p>
        ) : null}
        {notes.data && notes.data.notes.length > 0 ? (
          <ul className="mt-3">
            {notes.data.notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onDelete={(target) => {
                  void api.deleteNote(target.id).then(() => {
                    notes.reload();
                    overview.reload();
                  });
                }}
              />
            ))}
          </ul>
        ) : null}

        {conceptsForPickers.length > 0 ? (
          <form className="mt-4 grid gap-3" onSubmit={submitNote}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">About</span>
                <select className="field" value={noteConcept} onChange={(event) => setNoteConcept(event.target.value)}>
                  {conceptsForPickers.map((concept) => (
                    <option key={concept.id} value={concept.id}>
                      {concept.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">Title</span>
                <input
                  className="field"
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder="What you would search for"
                  required
                  maxLength={200}
                />
              </label>
            </div>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Note</span>
              <textarea
                className="field"
                rows={4}
                value={noteBody}
                onChange={(event) => setNoteBody(event.target.value)}
                placeholder="In your own words. Anything pasted keeps its source below."
                required
              />
            </label>
            <label className="text-sm sm:w-96">
              <span className="mb-1 block font-medium">Source (optional)</span>
              <input
                className="field"
                value={noteSource}
                onChange={(event) => setNoteSource(event.target.value)}
                placeholder="Page, lecture, or URL — wherever this came from"
                maxLength={300}
              />
            </label>
            {noteError ? (
              <p role="alert" className="text-sm" style={{ color: 'var(--bad)' }}>
                {noteError}
              </p>
            ) : null}
            <div>
              <button type="submit" className="btn" disabled={noteBusy}>
                {noteBusy ? 'Saving…' : 'Save note'}
              </button>
            </div>
          </form>
        ) : null}
      </Card>

      <Card>
        <SectionTitle hint="An objective and a stopping condition before you start; one line of reflection before you stop. That is the whole ceremony.">
          Sessions
        </SectionTitle>

        {sessions.loading ? <Loading label="Loading sessions" /> : null}
        {sessions.error ? <ErrorNote message={sessions.error} onRetry={sessions.reload} /> : null}

        {open.length > 0 ? (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold">Open</h3>
            {open.length > 1 ? (
              <p className="mb-2 text-xs text-[color:var(--muted)]">
                More than one is open. Each can be resumed where it was left.
              </p>
            ) : null}
            <ul>
              {open.map((session) => (
                <OpenSession
                  key={session.id}
                  session={session}
                  activities={overview.data?.activities ?? []}
                  onChange={refreshAll}
                />
              ))}
            </ul>
          </div>
        ) : null}

        <SessionComposer concepts={conceptsForPickers} onStarted={refreshAll} />

        {finished.length > 0 ? (
          <div className="mt-5">
            <h3 className="mb-1 text-sm font-semibold">Record</h3>
            <p className="mb-2 text-xs text-[color:var(--muted)]">
              Closed sessions are a record, not a draft: starting a new one is how you continue.
            </p>
            <ul>
              {finished.map((session) => (
                <FinishedSession key={session.id} session={session} />
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
