import { useCallback, useEffect, useRef, useState } from 'react';

import { api, ApiError, type AnswerResult, type ConceptDetail, type KnowledgeRow, type MoveResult, type OpeningsResponse, type PuzzleSummary, type PuzzleView, type SourceRow, type TodayResponse } from './api';
import { ChessBoard } from './board';
import { OpeningsPanel } from './openings';
import { Badge, Card, EmptyState, ErrorNote, Loading, MasteryBar, ReasonList, SectionTitle } from './ui';
import { percent, tierColour } from './utils';

const muted = 'text-[color:var(--muted)]';

function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof ApiError ? cause.message : 'The request failed.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, error, loading, reload };
}

/* ------------------------------------------------------------------ sign in */

export function SignInPage({ onSignedIn }: { onSignedIn: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === 'register') await api.register(email, password, displayName);
      else await api.login(email, password);
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not sign you in.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <SectionTitle hint="Tessera tracks what you can still recall, not what you clicked.">
          {mode === 'login' ? 'Sign in' : 'Create an account'}
        </SectionTitle>
        <form className="grid gap-3" onSubmit={submit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input id="email" type="email" required autoComplete="email" className="field mt-1" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {mode === 'register' ? (
            <div>
              <label htmlFor="name" className="text-sm font-medium">Display name</label>
              <input id="name" className="field mt-1" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </div>
          ) : null}
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={12}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="field mt-1"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === 'register' ? <p className={`mt-1 text-xs ${muted}`}>At least 12 characters.</p> : null}
          </div>
          <button type="submit" className="btn btn-primary justify-self-start" disabled={pending}>
            {pending ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        {error ? <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--bad)' }}>{error}</p> : null}
        <button
          type="button"
          className="mt-4 text-sm underline"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
        >
          {mode === 'login' ? 'No account? Create one' : 'Already have an account? Sign in'}
        </button>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------- today */

export function TodayPage({ onOpenConcept }: { onOpenConcept: (id: string) => void }) {
  const [minutes, setMinutes] = useState(15);
  const { data, error, loading, reload } = useAsync<TodayResponse>(() => api.today(minutes), [minutes]);

  if (loading) return <Loading label="Building your session" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="Assembled from what is due, what is weak, and what you have not started.">
          Today
        </SectionTitle>
        <label htmlFor="minutes" className="text-sm font-medium">Time available</label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="minutes"
            type="range"
            min={5}
            max={60}
            step={5}
            value={minutes}
            onChange={(event) => setMinutes(Number(event.target.value))}
            className="w-64"
          />
          <span className="text-sm tabular-nums">{data.available_minutes} min</span>
        </div>
        <p className={`mt-2 text-xs ${muted}`}>
          The session adapts to the time you have; it does not pad itself with filler.
        </p>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState title="Nothing scheduled" body={data.empty_state ?? 'Pick a concept to begin.'} />
      ) : (
        <ul className="grid gap-3">
          {data.items.map((item, index) => (
            <li key={`${item.kind}-${item.concept_id}-${index}`}>
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Badge tone={item.kind === 'review' ? 'warn' : item.kind === 'weak_area' ? 'bad' : 'good'}>
                      {item.kind.replace('_', ' ')}
                    </Badge>
                    <h3 className="mt-1 font-semibold">{item.title}</h3>
                  </div>
                  <span className={`text-sm ${muted}`}>{item.minutes} min</span>
                </div>
                <ReasonList reasons={item.reasons} />
                <button type="button" className="btn btn-primary mt-3" onClick={() => onOpenConcept(item.concept_id)}>
                  {item.kind === 'new_concept' ? 'Start lesson' : 'Practise'}
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- knowledge */

export function KnowledgePage({ onOpenConcept }: { onOpenConcept: (id: string) => void }) {
  const { data, error, loading, reload } = useAsync(() => api.knowledge());

  if (loading) return <Loading label="Reading your learner model" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  const studied = data.concepts.filter((row) => row.tier !== 'unseen');
  const atRisk = studied.filter((row) => row.due);

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="Mastery moves only on evidence. The bar shows what you are likely to recall right now.">
          Knowledge bank
        </SectionTitle>
        <div className="flex flex-wrap gap-4 text-sm">
          <span><strong>{studied.length}</strong> studied</span>
          <span><strong>{atRisk.length}</strong> due for review</span>
          <span><strong>{data.concepts.length - studied.length}</strong> untouched</span>
        </div>
      </Card>

      {data.subjects.map((group) => (
        <Card key={group.subject}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{group.subject}</h3>
            <span className={`text-sm ${muted}`}>{percent(group.average_mastery)} average</span>
          </div>
          <ul className="mt-3 grid gap-3">
            {group.concepts.map((row: KnowledgeRow) => (
              <li key={row.concept_id}>
                <button
                  type="button"
                  onClick={() => onOpenConcept(row.concept_id)}
                  className="w-full text-left"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">{row.title}</span>
                    <span className="text-xs" style={{ color: tierColour(row.tier) }}>
                      {row.tier === 'unseen' ? 'not started' : `${percent(row.mastery)} · ${row.tier}`}
                    </span>
                  </div>
                  <div className="mt-1"><MasteryBar mastery={row.mastery} tier={row.tier} /></div>
                  {row.due ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--warn)' }}>
                      Recall likely decayed — review scheduled.
                    </p>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------- map */

export function MapPage({ onOpenConcept }: { onOpenConcept: (id: string) => void }) {
  const { data, error, loading, reload } = useAsync(() => api.map());

  if (loading) return <Loading label="Loading the knowledge map" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  const titles = new Map(data.nodes.map((node) => [node.id, node.title]));
  const prerequisites = data.edges.filter((edge) => edge.relation === 'prerequisite');

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="Arrows run from prerequisite to dependent concept. A concept is recommended only when its prerequisites are ready.">
          Knowledge map
        </SectionTitle>
        <p className={`text-sm ${muted}`}>
          {data.nodes.length} concepts · {prerequisites.length} prerequisite links
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {data.nodes.map((node) => {
          const needs = prerequisites.filter((edge) => edge.to === node.id);
          return (
            <Card key={node.id}>
              <div className="flex items-baseline justify-between gap-2">
                <button type="button" className="text-left font-semibold underline" onClick={() => onOpenConcept(node.id)}>
                  {node.title}
                </button>
                <span className="text-xs" style={{ color: tierColour(node.tier) }}>{percent(node.mastery)}</span>
              </div>
              <p className={`mt-1 text-xs ${muted}`}>{node.subject} · difficulty {node.difficulty.toFixed(1)}/5</p>
              <div className="mt-2"><MasteryBar mastery={node.mastery} tier={node.tier} /></div>
              <p className={`mt-2 text-xs ${muted}`}>
                {needs.length === 0
                  ? 'No prerequisites.'
                  : `Requires: ${needs.map((edge) => titles.get(edge.from) ?? edge.from).join(', ')}`}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- concept */

export function ConceptPage({ conceptId, onBack }: { conceptId: string; onBack: () => void }) {
  const { data, error, loading, reload } = useAsync<ConceptDetail>(() => api.concept(conceptId), [conceptId]);

  if (loading) return <Loading label="Opening the concept" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      <button type="button" className="text-sm underline justify-self-start" onClick={onBack}>← Back</button>

      <Card>
        <Badge>{data.concept.subject}</Badge>
        <h2 className="mt-2 text-xl font-semibold">{data.concept.title}</h2>
        <p className={`mt-1 text-sm ${muted}`}>{data.concept.summary}</p>
        <p className="mt-3 text-sm leading-relaxed">{data.concept.explanation}</p>
        {data.state ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Your mastery</span>
              <span style={{ color: tierColour(data.state.tier) }}>{percent(data.state.mastery)} · {data.state.tier}</span>
            </div>
            <div className="mt-1"><MasteryBar mastery={data.state.mastery} tier={data.state.tier} /></div>
            <p className={`mt-1 text-xs ${muted}`}>
              {data.state.reps} reviews · stability {data.state.stability_days} days · {data.state.lapses} lapses
            </p>
          </div>
        ) : (
          <p className={`mt-4 text-sm ${muted}`}>Not studied yet — mastery appears after your first answer.</p>
        )}
      </Card>

      {data.lesson ? (
        <Card>
          <SectionTitle hint={`About ${data.lesson.est_minutes} minutes`}>{data.lesson.title}</SectionTitle>
          <p className="text-sm italic">{data.lesson.hook}</p>
          <p className="mt-3 text-sm">{data.lesson.explanation}</p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-[#f2f3f6] p-3 text-xs">{data.lesson.example}</pre>
          <p className="mt-3 text-sm"><strong>Apply it:</strong> {data.lesson.application}</p>
          <p className="mt-3 text-sm"><strong>Takeaway:</strong> {data.lesson.recap}</p>
          {data.provenance ? (
            <div className={`mt-4 rounded-md border p-3 text-xs ${muted}`} style={{ borderColor: 'var(--line)' }}>
              <p>
                Source: <a className="underline" href={data.provenance.url} target="_blank" rel="noopener noreferrer">{data.provenance.title}</a>
                {' '}by {data.provenance.author}
              </p>
              <p className="mt-1">{data.provenance.license_class} · {data.provenance.license_name}</p>
              <p className="mt-1">{data.provenance.attribution}</p>
            </div>
          ) : null}
        </Card>
      ) : null}

      <PracticeCard questions={data.questions} onGraded={reload} />
    </div>
  );
}

function PracticeCard({
  questions,
  onGraded,
}: {
  questions: ConceptDetail['questions'];
  onGraded: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(3);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  const question = questions[index];

  useEffect(() => {
    setChoice(null);
    setResult(null);
    setError(null);
    startedAt.current = Date.now();
  }, [index]);

  if (!question) {
    return (
      <Card>
        <EmptyState title="No practice questions yet" body="This concept has no questions in the bank, so it cannot be graded. Nothing is simulated." />
      </Card>
    );
  }

  const submit = async () => {
    if (choice === null) return;
    setPending(true);
    setError(null);
    try {
      const graded = await api.answer(question.id, choice, confidence, Date.now() - startedAt.current);
      setResult(graded);
      onGraded();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not record that answer.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Card>
      <SectionTitle hint={`Question ${index + 1} of ${questions.length}`}>Practise</SectionTitle>
      <p className="font-medium">{question.prompt}</p>
      <fieldset className="mt-3 grid gap-2" disabled={result !== null}>
        <legend className="sr-only">Answer choices</legend>
        {question.choices.map((text, choiceIndex) => (
          <label
            key={text}
            className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"
            style={{ borderColor: choice === choiceIndex ? 'var(--accent)' : 'var(--line)' }}
          >
            <input
              type="radio"
              name={`q-${question.id}`}
              checked={choice === choiceIndex}
              onChange={() => setChoice(choiceIndex)}
              className="mt-1"
            />
            <span>{text}</span>
          </label>
        ))}
      </fieldset>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <label htmlFor="confidence">How sure are you?</label>
        <select id="confidence" className="field w-40" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} disabled={result !== null}>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>{value} / 5</option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex gap-2">
        {result === null ? (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={choice === null || pending}>
            {pending ? 'Checking…' : 'Check answer'}
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={() => setIndex((value) => (value + 1 < questions.length ? value + 1 : 0))}
          >
            Next question
          </button>
        )}
      </div>

      {error ? <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--bad)' }}>{error}</p> : null}

      {result ? (
        <div
          role="status"
          className="mt-4 rounded-md border p-4 text-sm"
          style={{ borderColor: result.correct ? 'var(--good)' : 'var(--bad)' }}
        >
          <strong>{result.correct ? 'Correct' : 'Not this time'}</strong>
          <p className="mt-1">{result.explanation}</p>
          {result.misconception ? (
            <p className={`mt-2 text-xs ${muted}`}>This question tests a common misbelief: {result.misconception}</p>
          ) : null}
          <p className={`mt-2 text-xs ${muted}`}>
            Mastery {percent(result.mastery)} ({result.mastery_delta >= 0 ? '+' : ''}
            {Math.round(result.mastery_delta * 100)} points) · next review in {result.interval_days.toFixed(1)} days.
            {result.retrievability_before < 1
              ? ` Recall before this review was about ${percent(result.retrievability_before)}.`
              : ''}
          </p>
        </div>
      ) : null}
    </Card>
  );
}

/* --------------------------------------------------------------------- chess */

type ChessTab = 'tactics' | 'openings';

/** Chess is two activities, so the page is a real tabbed surface rather than a
 *  list with a second list stapled underneath. */
export function ChessPage() {
  const [tab, setTab] = useState<ChessTab>('tactics');

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Chess activities" className="flex flex-wrap gap-1">
        {([
          ['tactics', 'Tactics'],
          ['openings', 'Openings'],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`chess-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`chess-panel-${value}`}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === value ? 'font-semibold' : ''}`}
            style={tab === value ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`chess-panel-${tab}`} aria-labelledby={`chess-tab-${tab}`}>
        {tab === 'tactics' ? <TacticsPage /> : <OpeningsPage />}
      </div>
    </div>
  );
}

function OpeningsPage() {
  const { data, error, loading, reload } = useAsync<OpeningsResponse>(() => api.openings());

  if (loading) return <Loading label="Loading the opening reference" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  return <OpeningsPanel openings={data.openings} />;
}

function TacticsPage() {
  const { data, error, loading, reload } = useAsync(() => api.puzzles());
  const [activeId, setActiveId] = useState<string | null>(null);

  if (loading) return <Loading label="Loading puzzles" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  if (activeId) {
    return <PuzzleRunner puzzleId={activeId} onBack={() => setActiveId(null)} />;
  }

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="Solved puzzles are graded evidence and feed the same learner model as quiz answers.">
          Tactics
        </SectionTitle>
        <p className={`text-sm ${muted}`}>
          Positions are checked against the real rules of chess, so an illegal move is rejected rather than accepted.
        </p>
      </Card>
      <ul className="grid gap-3 md:grid-cols-2">
        {data.puzzles.map((puzzle: PuzzleSummary) => (
          <li key={puzzle.id}>
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{puzzle.title}</h3>
                <Badge>{puzzle.theme}</Badge>
              </div>
              <p className={`mt-1 text-sm ${muted}`}>
                {puzzle.side_to_move} to move · difficulty {puzzle.difficulty.toFixed(1)}/5
              </p>
              <button type="button" className="btn btn-primary mt-3" onClick={() => setActiveId(puzzle.id)}>
                Open board
              </button>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PuzzleRunner({ puzzleId, onBack }: { puzzleId: string; onBack: () => void }) {
  const { data, error, loading, reload } = useAsync<PuzzleView>(() => api.puzzle(puzzleId), [puzzleId]);
  const [result, setResult] = useState<MoveResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  if (loading) return <Loading label="Setting up the board" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  const fen = result?.fen ?? data.board.fen;
  // The server always sends the legal moves for the current position, so the board
  // never has to guess what is playable.
  const legalMoves = data.board.legal_moves;
  const plies = result?.plies_played ?? data.board.plies_played;
  const solved = result?.solved ?? false;

  const play = async (uci: string) => {
    setPending(true);
    setRequestError(null);
    try {
      const outcome = await api.move(puzzleId, uci, plies);
      setResult(outcome);
      if (outcome.solved) setFeedback('Solved. This position feeds your tactics mastery.');
      else if (!outcome.legal) setFeedback(outcome.error ?? 'That move is not legal.');
      else if (!outcome.on_solution) setFeedback(outcome.error ?? 'Legal, but not the winning continuation.');
      else setFeedback(outcome.opponent_reply ? `Good — the opponent replied ${outcome.opponent_reply}.` : 'Keep going.');
    } catch (cause) {
      setRequestError(cause instanceof ApiError ? cause.message : 'Could not send that move.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="grid gap-4">
      <button type="button" className="text-sm underline justify-self-start" onClick={onBack}>← Back to puzzles</button>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{data.title}</h2>
          <Badge>{data.theme}</Badge>
        </div>
        <p className={`mt-1 text-sm ${muted}`}>
          {solved ? 'Solved.' : `${data.board.side_to_move} to move.`} {data.board.in_check && !solved ? 'You are in check.' : ''}
        </p>
        <div className="mt-3">
          <ChessBoard
            fen={fen}
            legalMoves={legalMoves}
            disabled={solved || pending}
            label={solved ? 'Puzzle complete — reset by reopening it.' : 'Select a piece, then a highlighted square.'}
            onMove={play}
          />
        </div>
        {feedback ? (
          <p role="status" className="mt-3 text-sm" style={{ color: solved ? 'var(--good)' : 'var(--warn)' }}>{feedback}</p>
        ) : null}
        {requestError ? <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--bad)' }}>{requestError}</p> : null}
        {result?.san_history.length ? (
          <p className={`mt-2 text-sm ${muted}`}>Played: {result.san_history.join(' ')}</p>
        ) : null}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------- sources */

export function SourcesPage() {
  const { data, error, loading, reload } = useAsync<{ sources: SourceRow[] }>(() => api.sources());

  if (loading) return <Loading label="Reading provenance" />;
  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="Free to read is not free to copy. Material is only stored when its licence permits it.">
          Content provenance
        </SectionTitle>
        <p className={`text-sm ${muted}`}>
          Each source records its licence and the decision the gate reached. Non-commercial licences are shown as
          reference-only when the deployment is commercial.
        </p>
      </Card>
      <ul className="grid gap-3">
        {data.sources.map((source) => (
          <li key={source.source_id}>
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a className="font-semibold underline" href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
                <Badge tone={source.usage === 'full' ? 'good' : source.usage === 'reference_only' ? 'warn' : 'bad'}>
                  {source.usage}
                </Badge>
              </div>
              <p className={`mt-1 text-sm ${muted}`}>{source.author} · {source.license_class} · {source.license_name || 'no licence recorded'}</p>
              <p className={`mt-2 text-sm ${muted}`}>{source.reason}</p>
              <p className={`mt-1 text-xs ${muted}`}>Retrieved {source.retrieved_at}. {source.attribution}</p>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
