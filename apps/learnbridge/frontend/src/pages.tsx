import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type LessonDetail, type QuizDetail, type User } from './api';
import { stateLabel, stateTone, syncTone } from './utils';
import { Badge, Card, EmptyState, ErrorBanner, Loading, StatCard } from './ui';

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): [T | null, string, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    loader().then((r) => { if (alive) setData(r); })
      .catch((err: unknown) => { if (alive) setError(err instanceof ApiError ? err.message : 'Loading failed.'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return [data, error, reload];
}

/* ----------------------------- Catalogue + reader ------------------------ */

export function CataloguePage({ user: _user }: { user: User }) {
  const [q, setQ] = useState('');
  const [courses, error, reload] = useAsync(() => api.courses(q), [q]);
  const [openCourse, setOpenCourse] = useState<number | null>(null);
  const [openLesson, setOpenLesson] = useState<LessonDetail | null>(null);
  const [actionError, setActionError] = useState('');

  const open = async (courseId: number, lessonId: number) => {
    setActionError('');
    try {
      setOpenCourse(courseId);
      setOpenLesson(await api.lesson(lessonId));
    } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Loading failed.'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Course catalogue</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <input className="input max-w-md" aria-label="Search courses" placeholder="Search courses…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!courses ? <Loading /> : courses.length === 0 ? (
        <EmptyState title="No courses found" hint="Try a different search term." />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {courses.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{c.title} <span className="text-xs text-slate-500">v{c.version}</span></div>
                  <div className="mt-1 text-xs text-slate-400">{c.subject} · {c.level} · {c.language} · ~{c.est_minutes} min · {c.lesson_count} lessons</div>
                  <p className="mt-2 text-sm text-slate-300">{c.description}</p>
                  <div className="mt-2 text-xs text-slate-500">License: {c.license || 'not stated'} · {c.attribution}</div>
                  <div className="mt-1 text-xs text-slate-500">Accessibility: {c.accessibility || 'not stated'}</div>
                </div>
                <div className="flex flex-col gap-2">
                  {c.enrolled ? <Badge tone="bg-emerald-950 text-emerald-300 border border-emerald-800">enrolled</Badge> : (
                    <button className="btn-primary" onClick={async () => { await api.enroll(c.id); reload(); }}>Enroll</button>
                  )}
                  <button className="btn-ghost" onClick={() => { setOpenCourse(openCourse === c.id ? null : c.id); setOpenLesson(null); }}>
                    {openCourse === c.id ? 'Close' : 'Lessons'}
                  </button>
                  <a className="btn-ghost" href={`/api/courses/${c.id}/pack`}>Course pack</a>
                </div>
              </div>
              {openCourse === c.id ? (
                <div className="mt-3 space-y-1 border-t border-slate-800 pt-3">
                  {(courses && openCourse === c.id ? null : null)}
                  <LessonList courseId={c.id} onOpen={open} />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
      {openLesson ? (
        <Card title={openLesson.title}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={stateTone(openLesson.state)}>{stateLabel(openLesson.state)}</Badge>
            <span className="text-xs text-slate-500">v{openLesson.version} · ~{openLesson.est_minutes} min</span>
            <button className="btn-ghost" onClick={async () => { await api.putProgress(openLesson.id, 'open'); setOpenLesson(await api.lesson(openLesson.id)); }}>Mark started</button>
            <button className="btn-ghost" onClick={async () => { await api.putProgress(openLesson.id, 'submit_work'); setOpenLesson(await api.lesson(openLesson.id)); }}>Submit for completion</button>
            <button className="btn-ghost" onClick={async () => { await api.toggleBookmark(openLesson.id); setOpenLesson(await api.lesson(openLesson.id)); }}>
              {openLesson.bookmarked ? 'Remove bookmark' : 'Bookmark'}
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {openLesson.content.map((block, i) => (
              <div key={i} className="rounded-lg border border-slate-800 p-3 text-sm text-slate-300">
                <div className="text-xs uppercase text-slate-500">{block.kind}</div>
                {block.body ? <p className="mt-1">{block.body}</p> : null}
                {block.url ? <p className="mt-1 font-mono text-xs text-slate-400">{block.url} {block.note ? `(${block.note})` : ''}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{openLesson.offline.note}</p>
          {Object.keys(openLesson.requirements).length > 0 ? (
            <p className="mt-1 text-xs text-amber-300">Completion requires quiz score ≥ {openLesson.requirements.min_quiz_score}%.</p>
          ) : null}
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-slate-300">My notes</h3>
            <ul className="space-y-1">
              {openLesson.notes.map((n) => <li key={n.id} className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400">{n.body}</li>)}
            </ul>
            <NoteForm lessonId={openLesson.id} onSaved={async () => setOpenLesson(await api.lesson(openLesson.id))} />
          </div>
          <div className="mt-4">
            <QuizSection lessonId={openLesson.id} onDone={async () => setOpenLesson(await api.lesson(openLesson.id))} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function LessonList({ courseId, onOpen }: { courseId: number; onOpen: (courseId: number, lessonId: number) => void }) {
  const [detail] = useAsync(() => api.course(courseId), [courseId]);
  if (!detail) return <Loading />;
  return (
    <div className="space-y-2">
      {detail.modules.map((m) => (
        <div key={m.id}>
          <div className="text-xs font-medium text-slate-400">{m.title}</div>
          {m.lessons.map((l) => (
            <button key={l.id} className="mt-1 block w-full rounded-lg border border-slate-800 px-3 py-1.5 text-left text-sm hover:bg-slate-800"
              onClick={() => onOpen(courseId, l.id)}>
              {l.title} <span className="text-xs text-slate-500">· v{l.version} · ~{l.est_minutes} min</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function NoteForm({ lessonId, onSaved }: { lessonId: number; onSaved: () => void }) {
  const [body, setBody] = useState('');
  return (
    <form className="mt-2 flex gap-2" onSubmit={async (e) => {
      e.preventDefault();
      await api.addNote(lessonId, body);
      setBody('');
      onSaved();
    }}>
      <input className="input flex-1" aria-label="Add a note" placeholder="Add a note…" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn-primary" disabled={!body.trim()}>Save</button>
    </form>
  );
}

function QuizSection({ lessonId, onDone }: { lessonId: number; onDone: () => void }) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; results: { question_id: number; correct: boolean; explanation: string }[] } | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    api.lesson(lessonId).then((lesson) => {
      const firstQuiz = (lesson as unknown as { quiz_ids: number[] }).quiz_ids?.[0];
      if (firstQuiz) api.quiz(firstQuiz).then(setQuiz).catch(() => undefined);
    }).catch(() => undefined);
  }, [lessonId]);

  if (!quiz) return <p className="text-xs text-slate-500">No quiz attached to this lesson.</p>;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-slate-300">Lesson quiz</h3>
      <div className="space-y-3">
          {quiz.questions.map((question) => (
            <div key={question.id} className="rounded-lg border border-slate-800 p-3">
              <div className="text-sm">{question.prompt}</div>
              {question.kind === 'short' ? (
                <input className="input mt-2" aria-label="Your answer" placeholder="Your answer"
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} />
              ) : question.kind === 'tf' ? (
                <div className="mt-2 flex gap-2">
                  {[true, false].map((v) => (
                    <button key={String(v)} type="button" className="btn-ghost"
                      onClick={() => setAnswers({ ...answers, [question.id]: v })}>{v ? 'True' : 'False'}</button>
                  ))}
                </div>
              ) : question.kind === 'multi' ? (
                <div className="mt-2 space-y-1">
                  {question.choices.map((choice, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" onChange={(e) => {
                        const prev = Array.isArray(answers[question.id]) ? (answers[question.id] as number[]) : [];
                        setAnswers({ ...answers, [question.id]: e.target.checked ? [...prev, idx] : prev.filter((i) => i !== idx) });
                      }} />
                      {choice}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-2 space-y-1">
                  {question.choices.map((choice, idx) => (
                    <label key={idx} className="flex items-center gap-2 text-sm">
                      <input type="radio" name={`q${question.id}`} onChange={() => setAnswers({ ...answers, [question.id]: idx })} />
                      {choice}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {actionError ? <ErrorBanner message={actionError} /> : null}
          <button className="btn-primary" onClick={async () => {
            setActionError('');
            try {
              setResult(await api.submitAttempt(quiz.id, answers));
              onDone();
            } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Submit failed.'); }
          }}>Submit answers</button>
          {result ? (
            <div className="rounded-lg border border-slate-700 p-3 text-sm">
              <div>Score: <strong>{result.score}%</strong> · {result.passed ? 'Passed' : 'Not passed yet'}</div>
              <ul className="mt-2 space-y-1">
                {result.results.map((r) => (
                  <li key={r.question_id} className={r.correct ? 'text-emerald-300' : 'text-rose-300'}>
                    Question {r.question_id}: {r.correct ? 'correct' : 'incorrect'}{r.explanation ? ` — ${r.explanation}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
    </div>
  );
}

/* ------------------------------ My learning ------------------------------ */

export function MyLearningPage() {
  const [progress, error, reload] = useAsync(() => api.myProgress(), []);
  const [sync, syncError, reloadSync] = useAsync(() => api.syncStatus(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My learning & sync</h1>
      {error || syncError ? <ErrorBanner message={error || syncError} /> : null}
      {!progress ? <Loading /> : progress.length === 0 ? (
        <EmptyState title="No enrollments yet" hint="Enroll from the course catalogue." />
      ) : (
        <div className="space-y-2">
          {progress.map((row) => (
            <div key={row.course_id} className="card">
              <div className="flex items-center justify-between">
                <div className="font-medium">{row.course_title}</div>
                <StatCard label="Completed" value={`${row.completed}/${row.total_lessons}`} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(row.states).map(([lessonId, state]) => (
                  <Badge key={lessonId} tone={stateTone(state)}>{stateLabel(state)}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Card title="Sync status">
        {!sync ? <Loading /> : (
          <>
            <div className="flex flex-wrap gap-3 text-sm">
              <span>Pending conflicts: <strong>{sync.pending_conflicts}</strong></span>
              <span>Last successful sync: <strong>{sync.last_sync ? new Date(sync.last_sync).toLocaleString() : '—'}</strong></span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Conflicted offline changes are preserved — choose which version to keep. Nothing is discarded silently.
            </p>
            <ul className="mt-2 space-y-1">
              {sync.events.filter((e) => e.status === 'conflict').map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-800 px-3 py-1.5 text-xs">
                  <span className="text-amber-200">conflict · {e.kind} · lesson {e.ref_id}</span>
                  <span className="flex gap-2">
                    <button className="btn-ghost" onClick={async () => { await api.resolveSync(e.id, 'keep_client'); reloadSync(); reload(); }}>Keep mine</button>
                    <button className="btn-ghost" onClick={async () => { await api.resolveSync(e.id, 'keep_server'); reloadSync(); reload(); }}>Keep server</button>
                    <button className="btn-ghost" onClick={async () => { await api.resolveSync(e.id, 'merge'); reloadSync(); reload(); }}>Merge</button>
                  </span>
                </li>
              ))}
            </ul>
            <ul className="mt-2 space-y-1">
              {sync.events.slice(0, 6).map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge tone={syncTone(e.status)}>{e.status}</Badge>
                  {e.kind} · lesson {e.ref_id} · {new Date(e.created_at).toLocaleString()}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

/* -------------------------------- Settings ------------------------------- */

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">{user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}</p>
      </Card>
      <Card title="What is available offline (documented, not hidden)">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Lesson text, worked examples, quiz questions and your notes can be cached for offline study.</li>
          <li>Audio/video links open only when online — offline availability is never claimed for media.</li>
          <li>Progress made offline queues changes; on reconnect they sync with explicit conflict resolution.</li>
          <li>Demo data is simulated and fictional.</li>
        </ul>
      </Card>
    </div>
  );
}
