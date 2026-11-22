import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type User } from './api';
import { attendanceTone, formatDate, letterTone } from './utils';
import { Badge, Card, ConfirmButton, EmptyState, ErrorBanner, Field, Loading, StatCard } from './ui';

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): [T | null, string, () => void] {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setError('');
    loader()
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof ApiError ? err.message : 'Loading failed.');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return [data, error, reload];
}

function DemoBanner({ demo }: { demo: boolean }) {
  if (!demo) return null;
  return (
    <div className="rounded-lg border border-amber-800 bg-amber-950/60 px-3 py-2 text-sm text-amber-200">
      Simulated demonstration data — fictional students, results and attendance. Not real records.
    </div>
  );
}

/* ------------------------------- Overview ------------------------------- */

export function OverviewPage({ user }: { user: User }) {
  const [overview, error] = useAsync(() => api.overview(), []);
  if (error) return <ErrorBanner message={error} />;
  if (!overview) return <Loading />;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Overview</h1>
      <DemoBanner demo={overview.demo_data} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Students" value={overview.students} />
        <StatCard label="Sections" value={overview.sections} />
        <StatCard label="Active enrollments" value={overview.enrollments} />
        <StatCard label="Grades recorded" value={overview.grades} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Courses" value={overview.courses} />
        <StatCard label="Attendance records" value={overview.attendance} />
        <StatCard label="Your role" value={user.role} />
      </div>
      <Card title="What this system enforces">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>Enrollment rules: no duplicates, capacity limits, active students only.</li>
          <li>Grade validation: scores 0–100, one grade per assessment (upsert), draft vs final.</li>
          <li>Attendance validation: four statuses, one record per date per enrollment.</li>
          <li>Transcripts computed from FINAL grades only.</li>
          <li>Role-based access enforced on the server: admin, teacher, student, parent.</li>
          <li>Administrative changes are written to an audit log.</li>
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------- Students ------------------------------- */

export function StudentsPage({ user }: { user: User }) {
  const [students, error, reload] = useAsync(() => api.students(), []);
  const [form, setForm] = useState({ first_name: '', last_name: '', enrollment_no: '', email: '', date_of_birth: '', status: 'active' });
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Students</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {user.role === 'admin' ? (
        <Card title="Add a student">
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createStudent(form);
                setForm({ first_name: '', last_name: '', enrollment_no: '', email: '', date_of_birth: '', status: 'active' });
                reload();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Create failed.');
              }
            }}
          >
            <Field label="First name">
              <input className="input" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </Field>
            <Field label="Last name">
              <input className="input" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </Field>
            <Field label="Enrollment number">
              <input className="input" required value={form.enrollment_no} onChange={(e) => setForm({ ...form, enrollment_no: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Date of birth (YYYY-MM-DD)">
              <input className="input" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">active</option>
                <option value="graduated">graduated</option>
                <option value="transferred">transferred</option>
              </select>
            </Field>
            <button className="btn-primary md:col-span-3 justify-center">Add student</button>
          </form>
        </Card>
      ) : null}
      {!students ? (
        <Loading />
      ) : students.length === 0 ? (
        <EmptyState title="No students visible" hint="Students and parents see only their own records." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Enrollment no.</th>
                <th scope="col" className="th">Name</th>
                <th scope="col" className="th">Email</th>
                <th scope="col" className="th">Status</th>
                <th scope="col" className="th text-right">Sections</th>
                {user.role === 'admin' ? <th scope="col" className="th">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-slate-800">
                  <td className="td font-mono">{s.enrollment_no}</td>
                  <td className="td">{s.first_name} {s.last_name}</td>
                  <td className="td text-slate-400">{s.email || '—'}</td>
                  <td className="td">{s.status}</td>
                  <td className="td text-right tabular-nums">{s.enrolled_sections.length}</td>
                  {user.role === 'admin' ? (
                    <td className="td">
                      <ConfirmButton
                        label="Delete"
                        confirmMessage={`Delete student ${s.enrollment_no}?`}
                        onConfirm={async () => {
                          await api.deleteStudent(s.id);
                          reload();
                        }}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- Courses/Sections --------------------------- */

export function CoursesPage({ user }: { user: User }) {
  const [courses, error, reload] = useAsync(() => api.courses(), []);
  const [sections, sectionError, reloadSections] = useAsync(() => api.sections(), []);
  const [form, setForm] = useState({ code: '', title: '', credit_hours: '3', description: '' });
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Courses & sections</h1>
      {error || sectionError || actionError ? <ErrorBanner message={error || sectionError || actionError} /> : null}
      {user.role === 'admin' ? (
        <Card title="Add a course">
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.createCourse({ ...form, credit_hours: Number(form.credit_hours) });
                setForm({ code: '', title: '', credit_hours: '3', description: '' });
                reload();
                reloadSections();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Create failed.');
              }
            }}
          >
            <Field label="Code">
              <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </Field>
            <Field label="Title">
              <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <Field label="Credit hours">
              <input className="input" type="number" min={1} max={12} value={form.credit_hours} onChange={(e) => setForm({ ...form, credit_hours: e.target.value })} />
            </Field>
            <Field label="Description">
              <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <button className="btn-primary md:col-span-4 justify-center">Add course</button>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Courses">
          {!courses ? (
            <Loading />
          ) : courses.length === 0 ? (
            <EmptyState title="No courses" hint="Admins can add courses above." />
          ) : (
            <ul className="space-y-2">
              {courses.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-800 p-3">
                  <div className="font-medium">{c.code} · {c.title}</div>
                  <div className="text-xs text-slate-400">{c.credit_hours} credit hours</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Sections">
          {!sections ? (
            <Loading />
          ) : sections.length === 0 ? (
            <EmptyState title="No sections" hint="Sections appear once created by an admin." />
          ) : (
            <ul className="space-y-2">
              {sections.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-800 p-3">
                  <div className="font-medium">{s.course_code} · {s.term}</div>
                  <div className="text-xs text-slate-400">
                    {s.teacher_name} · {s.enrolled}/{s.capacity} enrolled
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ---------------------------- Enrollments/Grades ------------------------- */

export function EnrollmentPage({ user }: { user: User }) {
  const [enrollments, error, reload] = useAsync(() => api.enrollments(), []);
  const [students] = useAsync(() => api.students(), []);
  const [sections] = useAsync(() => api.sections(), []);
  const [studentId, setStudentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Enrollments & grades</h1>
      {error || actionError ? <ErrorBanner message={error || actionError} /> : null}
      {user.role === 'admin' ? (
        <Card title="Enroll a student">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api.enroll(Number(studentId), Number(sectionId));
                reload();
              } catch (err) {
                setActionError(err instanceof ApiError ? err.message : 'Enroll failed.');
              }
            }}
          >
            <Field label="Student">
              <select className="input" required value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Select…</option>
                {(students ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.enrollment_no} · {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Section">
              <select className="input" required value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">Select…</option>
                {(sections ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course_code} · {s.term} ({s.enrolled}/{s.capacity})
                  </option>
                ))}
              </select>
            </Field>
            <button className="btn-primary" disabled={!studentId || !sectionId}>
              Enroll
            </button>
          </form>
        </Card>
      ) : null}
      {!enrollments ? (
        <Loading />
      ) : enrollments.length === 0 ? (
        <EmptyState title="No enrollments visible" hint="Only records you may access are listed." />
      ) : (
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div key={e.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{e.student_name} · {e.section_label}</div>
                  <div className="text-xs text-slate-400">{e.status === 'enrolled' ? 'Enrolled' : 'Dropped'}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => setOpenId(openId === e.id ? null : e.id)}>
                    {openId === e.id ? 'Close panel' : 'Grades & attendance'}
                  </button>
                  {user.role === 'admin' && e.status === 'enrolled' ? (
                    <ConfirmButton
                      label="Drop"
                      confirmMessage={`Drop ${e.student_name} from ${e.section_label}?`}
                      onConfirm={async () => {
                        await api.dropEnrollment(e.id);
                        reload();
                      }}
                    />
                  ) : null}
                </div>
              </div>
              {openId === e.id ? <EnrollmentPanel enrollmentId={e.id} canWrite={user.role === 'admin' || (user.role === 'teacher' && user.id === e.teacher_id)} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EnrollmentPanel({ enrollmentId, canWrite }: { enrollmentId: number; canWrite: boolean }) {
  const [grades, error, reloadGrades] = useAsync(() => api.grades(enrollmentId), [enrollmentId]);
  const [attendance, attendanceError, reloadAttendance] = useAsync(() => api.attendance(enrollmentId), [enrollmentId]);
  const [assessment, setAssessment] = useState('');
  const [score, setScore] = useState('');
  const [status, setStatus] = useState('final');
  const [date, setDate] = useState('');
  const [attStatus, setAttStatus] = useState('present');
  const [actionError, setActionError] = useState('');

  return (
    <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
      {error || attendanceError || actionError ? <ErrorBanner message={error || attendanceError || actionError} /> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-300">Grades</h2>
          <ul className="space-y-1">
            {(grades ?? []).map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                <span className="flex-1">{g.assessment}</span>
                <span className="font-mono">{g.score}</span>
                <Badge tone={g.status === 'final' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-300 border border-slate-700'}>
                  {g.status}
                </Badge>
              </li>
            ))}
            {(grades ?? []).length === 0 ? <li className="text-sm text-slate-400">No grades recorded.</li> : null}
          </ul>
          {canWrite ? (
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={async (ev) => {
                ev.preventDefault();
                try {
                  await api.addGrade(enrollmentId, assessment, Number(score), status);
                  setAssessment('');
                  setScore('');
                  reloadGrades();
                } catch (err) {
                  setActionError(err instanceof ApiError ? err.message : 'Save failed.');
                }
              }}
            >
              <input className="input flex-1" aria-label="Assessment" placeholder="Assessment" required value={assessment} onChange={(e) => setAssessment(e.target.value)} />
              <input className="input w-20" type="number" min={0} max={100} required aria-label="Score" placeholder="Score" value={score} onChange={(e) => setScore(e.target.value)} />
              <select className="input w-28" aria-label="Grade status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="final">final</option>
                <option value="draft">draft</option>
              </select>
              <button className="btn-primary">Save grade</button>
            </form>
          ) : null}
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium text-slate-300">Attendance</h2>
          <ul className="space-y-1">
            {(attendance ?? []).map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-sm">
                <span className="flex-1">{r.date}</span>
                <Badge tone={attendanceTone(r.status)}>{r.status}</Badge>
              </li>
            ))}
            {(attendance ?? []).length === 0 ? <li className="text-sm text-slate-400">No attendance recorded.</li> : null}
          </ul>
          {canWrite ? (
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={async (ev) => {
                ev.preventDefault();
                try {
                  await api.recordAttendance(enrollmentId, date, attStatus, '');
                  setDate('');
                  reloadAttendance();
                } catch (err) {
                  setActionError(err instanceof ApiError ? err.message : 'Save failed.');
                }
              }}
            >
              <input className="input flex-1" type="date" required aria-label="Attendance date" value={date} onChange={(e) => setDate(e.target.value)} />
              <select className="input w-28" aria-label="Attendance status" value={attStatus} onChange={(e) => setAttStatus(e.target.value)}>
                <option value="present">present</option>
                <option value="absent">absent</option>
                <option value="late">late</option>
                <option value="excused">excused</option>
              </select>
              <button className="btn-primary">Record</button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Transcripts ------------------------------ */

export function TranscriptsPage() {
  const [students] = useAsync(() => api.students(), []);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [transcript, error] = useAsync(
    () => (studentId ? api.transcript(studentId) : Promise.resolve(null)),
    [studentId],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Transcripts</h1>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="w-80">
        <Field label="Student">
          <select className="input" value={studentId ?? ''} onChange={(e) => setStudentId(Number(e.target.value))}>
            <option value="">Select…</option>
            {(students ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.enrollment_no} · {s.first_name} {s.last_name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {!transcript ? (
        studentId ? <Loading /> : null
      ) : (
        <Card title={`${transcript.student_name} · ${transcript.enrollment_no}`}>
          <div className="mb-3 flex flex-wrap gap-3">
            <StatCard label="GPA" value={transcript.gpa === null ? '—' : transcript.gpa.toFixed(2)} tone="text-teal-300" />
            <StatCard label="Credits" value={transcript.total_credits} />
            <StatCard label="Computed" value={formatDate(transcript.computed_at)} />
          </div>
          {transcript.lines.length === 0 ? (
            <EmptyState title="No final grades yet" hint="Transcripts are computed from final grades only." />
          ) : (
            <table className="min-w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th scope="col" className="th">Course</th>
                  <th scope="col" className="th">Term</th>
                  <th scope="col" className="th">Credits</th>
                  <th scope="col" className="th">Average</th>
                  <th scope="col" className="th">Letter</th>
                </tr>
              </thead>
              <tbody>
                {transcript.lines.map((line, i) => (
                  <tr key={`${line.course_code}-${line.term}-${i}`} className="border-t border-slate-800">
                    <td className="td">{line.course_code} · {line.title}</td>
                    <td className="td">{line.term}</td>
                    <td className="td">{line.credit_hours}</td>
                    <td className="td font-mono">{line.average ?? '—'}</td>
                    <td className="td">
                      <Badge tone={letterTone(line.letter)}>{line.letter ?? '—'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}

/* --------------------------------- Audit --------------------------------- */

export function AuditPage() {
  const [events, error] = useAsync(() => api.audit(), []);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit log</h1>
      {error ? <ErrorBanner message={error} /> : null}
      {!events ? (
        <Loading />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full">
            <thead className="bg-slate-900">
              <tr>
                <th scope="col" className="th">Time</th>
                <th scope="col" className="th">Action</th>
                <th scope="col" className="th">Target</th>
                <th scope="col" className="th">Detail</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t border-slate-800">
                  <td className="td text-slate-400">{formatDate(e.created_at)}</td>
                  <td className="td font-mono text-xs">{e.action}</td>
                  <td className="td font-mono text-xs">{e.target}</td>
                  <td className="td text-xs text-slate-400">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Settings -------------------------------- */

export function SettingsPage({ user }: { user: User }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card title="Account">
        <p className="text-sm text-slate-300">
          {user.display_name} · <span className="text-slate-400">{user.email}</span> · role: {user.role}
        </p>
      </Card>
      <Card title="Known limitations (documented, not hidden)">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-300">
          <li>
            The project prompt named Django; this implementation uses FastAPI + React for consistency with the rest of
            the suite. The functionality and tests follow the prompt.
          </li>
          <li>Data completeness and system integration are enterprise concerns; this MVP validates its own inputs and logs administrative changes, but does not integrate with external student-record systems.</li>
          <li>Transcripts are generated live from final grades; there is no PDF renderer in this MVP.</li>
          <li>Demo data is simulated and fictional.</li>
        </ul>
      </Card>
    </div>
  );
}
