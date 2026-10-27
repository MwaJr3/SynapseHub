import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { EXPORT_NOTE, workflowTone } from './utils';
import { Badge, Card, EmptyState, ErrorBanner, Field, Loading } from './ui';

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

export function LessonsPage({ user }: { user: User }) {
  const [lessons, error, reload] = useAsync(() => api.lessons(), []);
  const [openId, setOpenId] = useState<number | null>(null);
  const [detail, setDetail] = useState<import('./api').LessonDetail | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [actionError, setActionError] = useState('');

  const open = async (id: number) => {
    setOpenId(id);
    setDetail(await api.lesson(id));
    const current = await api.lesson(id);
    setTitle(current.title);
  };

  const act = async (fn: () => Promise<unknown>) => {
    setActionError('');
    try {
      await fn();
      if (openId) setDetail(await api.lesson(openId));
      reload();
    } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Action failed.'); }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Lesson studio</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <Card title="Create a lesson from a template">
        <form className="flex flex-wrap gap-2" onSubmit={async (e) => {
          e.preventDefault();
          const template = (new FormData(e.target as HTMLFormElement).get('template')) as string;
          await act(async () => {
            const courses = await api.courses();
            let courseId = courses[0]?.id;
            if (!courseId) courseId = (await api.createCourse('My Course')).id;
            const unit = await api.createUnit(courseId, 'Default unit');
            await api.createLesson(unit.id, title || 'Untitled lesson', template);
          });
          setTitle('');
        }}>
          <input className="input" aria-label="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="input" name="template">
            <option value="lesson_plan">Lesson plan</option>
            <option value="worked_example">Worked example</option>
            <option value="revision_sheet">Revision sheet</option>
            <option value="quiz">Quiz</option>
            <option value="assignment_brief">Assignment brief</option>
            <option value="blank">Blank</option>
          </select>
          <button className="btn-primary">Create draft</button>
        </form>
      </Card>
      {!lessons ? <Loading /> : lessons.length === 0 ? (
        <EmptyState title="No lessons yet" hint="Create your first draft above." />
      ) : (
        <div className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium">{l.title}</span>{' '}
                  <Badge tone={workflowTone(l.status)}>{l.status}</Badge>{' '}
                  <span className="text-xs text-slate-400">v{l.version}</span>
                  <div className="text-xs text-slate-400">{l.objective}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-ghost" onClick={() => void open(l.id)}>{openId === l.id ? 'Close' : 'Open'}</button>
                  <a className="btn-ghost" href={`/api/lessons/${l.id}/export.html`}>Export HTML</a>
                </div>
              </div>
              {openId === l.id && detail ? (
                <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
                  <Field label="Title">
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-ghost" onClick={() => void act(() => api.editLesson(detail.id, title, detail.blocks, 'Edited from studio'))}>Save draft changes</button>
                    <button className="btn-ghost" onClick={() => void act(() => api.transition(detail.id, 'review'))}>Submit for review</button>
                    {user.role !== 'teacher' ? (
                      <button className="btn-primary" onClick={() => void act(() => api.transition(detail.id, 'published'))}>Approve & publish</button>
                    ) : null}
                    <button className="btn-ghost" onClick={() => void act(() => api.transition(detail.id, 'archived'))}>Archive</button>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-slate-300">Version history</h3>
                    <ul className="space-y-1">
                      {detail.versions.map((v) => (
                        <li key={v.version} className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-1.5 text-xs">
                          <span>v{v.version} — {v.change_summary}</span>
                          <button className="btn-ghost" onClick={() => void act(() => api.restore(detail.id, v.version))}>Restore</button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-slate-400">Restoring creates a new version — history is never rewritten.</p>
                  </div>
                  <div>
                    <h3 className="mb-1 text-sm font-medium text-slate-300">Reviewer comments</h3>
                    <ul className="space-y-1">
                      {detail.comments.map((c) => (
                        <li key={c.id} className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400">
                          {c.body} {c.resolved ? '· resolved' : ''}
                        </li>
                      ))}
                    </ul>
                    <form className="mt-2 flex gap-2" onSubmit={async (e) => {
                      e.preventDefault();
                      await act(async () => { await api.addComment(detail.id, comment); setComment(''); });
                    }}>
                      <input className="input flex-1" aria-label="Add a comment" placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
                      <button className="btn-ghost">Add</button>
                    </form>
                  </div>
                  <p className="text-xs text-slate-400">{EXPORT_NOTE}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function QuestionBankPage() {
  const [questions, error, reload] = useAsync(() => api.questions(), []);
  const [kind, setKind] = useState('single');
  const [prompt, setPrompt] = useState('');
  const [choices, setChoices] = useState('');
  const [answer, setAnswer] = useState('');
  const [actionError, setActionError] = useState('');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Question bank</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      <Card title="Add a question">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={async (e) => {
          e.preventDefault();
          setActionError('');
          try {
            const parsedAnswer = kind === 'tf' ? answer === 'true' : kind === 'numeric' ? Number(answer)
              : kind === 'multi' ? answer.split(',').map((s) => Number(s.trim()))
              : kind === 'single' ? Number(answer) : answer;
            await api.createQuestion(kind, prompt, kind === 'tf' || kind === 'numeric' ? [] : choices.split('|').map((s) => s.trim()), parsedAnswer);
            setPrompt(''); setChoices(''); setAnswer('');
            reload();
          } catch (err) { setActionError(err instanceof ApiError ? err.message : 'Create failed.'); }
        }}>
          <Field label="Kind">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="single">single</option>
              <option value="multi">multi</option>
              <option value="tf">tf</option>
              <option value="numeric">numeric</option>
              <option value="ordering">ordering</option>
              <option value="rubric">rubric</option>
            </select>
          </Field>
          <Field label="Prompt"><input className="input" required value={prompt} onChange={(e) => setPrompt(e.target.value)} /></Field>
          <Field label="Choices (| separated)"><input className="input" value={choices} onChange={(e) => setChoices(e.target.value)} /></Field>
          <Field label="Answer (index, csv indexes, true/false, number, or rubric text)">
            <input className="input" required value={answer} onChange={(e) => setAnswer(e.target.value)} />
          </Field>
          <button className="btn-primary md:col-span-4 justify-center">Validate & add</button>
        </form>
      </Card>
      {!questions ? <Loading /> : questions.length === 0 ? (
        <EmptyState title="No questions yet" hint="Validated questions appear here." />
      ) : (
        <div className="space-y-2">
          {questions.map((q) => (
            <div key={q.id} className="card">
              <div className="flex items-center gap-2">
                <Badge tone="bg-slate-800 text-slate-300 border border-slate-700">{q.kind}</Badge>
                <span className="text-sm">{q.prompt}</span>
              </div>
              {q.choices.length > 0 ? <div className="mt-1 text-xs text-slate-400">{q.choices.join(' · ')}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">{user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}</p>
      </Card>
      <Card title="Workflow & honesty rules">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>draft → review → published → archived; publishing requires a reviewer role (server-enforced).</li>
          <li>Version restore creates new versions; history is never rewritten.</li>
          <li>{EXPORT_NOTE}</li>
          <li>Rendered content is escaped on export (XSS-safe static HTML).</li>
          <li>Demo content is simulated.</li>
        </ul>
      </Card>
    </div>
  );
}
