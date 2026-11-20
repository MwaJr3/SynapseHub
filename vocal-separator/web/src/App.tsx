import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from 'react';
import { api, loadSession, saveSession } from './api';
import { StemMixer } from './components/StemMixer';
import {
  VOICE_PARTS,
  confidenceClass,
  confidenceText,
  dateText,
  formatBytes,
  formatTime,
  percent,
  prettyName,
} from './lib/utils';
import type {
  AudioFileRecord,
  ExportFormat,
  Health,
  JobDetail,
  JobResults,
  JobSummary,
  ModelRecord,
  PitchData,
  ProjectDetail,
  ProjectSummary,
  Session,
  Voice,
} from './types';

const TERMINAL_STATES = new Set(['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED']);
const ACCEPTED_AUDIO = '.mp3,.wav,.flac,.m4a,.aac,.ogg,.oga,.opus,.aif,.aiff,audio/*';

const PROFILE_COPY: Record<string, { title: string; description: string }> = {
  vocals_instrumental: {
    title: 'Vocals + instrumental',
    description: 'Fastest, most reliable Level-1 split. Best for karaoke, remixes and vocal checks.',
  },
  full: {
    title: 'Full music stems',
    description: 'Vocals, drums, bass and other accompaniment. Piano/guitar only appear if a supporting ML model is truly available.',
  },
  extended: {
    title: 'Extended instruments',
    description: 'Requests piano and guitar too. The app will say so—and will not fabricate them—if the active engine cannot produce them.',
  },
  choir: {
    title: 'Choir / vocal ensemble',
    description: 'Full stems plus pitch tracking, voice-line clustering and confidence-gated experimental voice-part reconstruction.',
  },
};

const QUALITY_COPY: Record<string, string> = {
  fast: 'Fast — lower compute, rougher masks',
  balanced: 'Balanced — recommended for most songs',
  high: 'High quality — slower, finer analysis',
  maximum: 'Maximum — most compute; ML ensembles where a deployment provides them',
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function unknownText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(unknownText).join(', ');
  return JSON.stringify(value);
}

function stateClass(state: string): string {
  return `state-${state.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

interface FlattenedJob {
  job: JobSummary;
  audio: AudioFileRecord;
}

function flattenJobs(project: ProjectDetail | null): FlattenedJob[] {
  if (!project) return [];
  return project.audio_files
    .flatMap((audio) => audio.jobs.map((job) => ({ job, audio })))
    .sort((a, b) => b.job.id - a.job.id);
}

function HealthList({ health }: { health: Health | null }) {
  if (!health) return <p className="muted">Checking the processing service…</p>;
  return (
    <dl className="system-list">
      <div>
        <dt>Service</dt>
        <dd>{health.status} · pipeline {health.pipeline}</dd>
      </div>
      <div>
        <dt>DSP engine</dt>
        <dd>{health.engines.dsp ? 'Available now' : 'Unavailable'}</dd>
      </div>
      <div>
        <dt>Demucs ML</dt>
        <dd>{health.engines.demucs ? 'Available' : health.engines.demucs_note}</dd>
      </div>
      <div>
        <dt>CREPE pitch model</dt>
        <dd>{health.engines.crepe ? 'Available' : health.engines.crepe_note}</dd>
      </div>
      <div>
        <dt>M4A / AAC</dt>
        <dd>{health.engines.ffmpeg ? 'ffmpeg detected' : 'Requires ffmpeg; upload WAV/FLAC/MP3/OGG/AIFF here'}</dd>
      </div>
      <div>
        <dt>Retention setting</dt>
        <dd>{health.retention_days} day(s)</dd>
      </div>
    </dl>
  );
}

function HonestyPanel({ health }: { health: Health | null }) {
  return (
    <section className="panel honesty-panel">
      <p className="eyebrow">What is real in this build</p>
      <h2>Reconstructions, not recovered multitracks</h2>
      <ul className="honesty-list">
        <li>
          <strong>Level 1 is real separation.</strong> Demucs runs when its code and weights are
          actually available; otherwise the built-in DSP engine partitions the spectrum and the
          stems sum back to the original. DSP isolation is weaker and bleed is expected.
        </li>
        <li>
          <strong>Voice parts are experimental.</strong> Individual soprano/alto/tenor/bass
          recovery is a second, much harder inference problem. Parts are exported only when the
          tracked line passes evidence and confidence gates.
        </li>
        <li>
          <strong>Unknown is a valid result.</strong> The standard vocal ranges overlap heavily (alto, mezzo-soprano and tenor most of all);
          the UI shows probabilities instead of inventing certainty or empty part files.
        </li>
        <li>
          <strong>Your audio stays private to your account.</strong> Downloads use short-lived
          signed URLs. Upload only material you own or are legally entitled to process.
        </li>
        <li>
          <strong>Native formats:</strong> WAV, FLAC, MP3, OGG and AIFF.{' '}
          {health?.engines.ffmpeg
            ? 'ffmpeg is available for M4A/AAC in this deployment.'
            : 'M4A/AAC need ffmpeg in this deployment.'}
        </li>
      </ul>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [health, setHealth] = useState<Health | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectDetail, setProjectDetail] = useState<ProjectDetail | null>(null);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  const [selectedAudioId, setSelectedAudioId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [quality, setQuality] = useState('balanced');
  const [profile, setProfile] = useState('choir');
  const [engine, setEngine] = useState('auto');
  const [vocalAnalysis, setVocalAnalysis] = useState(true);
  const [allVoiceParts, setAllVoiceParts] = useState(true);

  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [results, setResults] = useState<JobResults | null>(null);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [practiceStemId, setPracticeStemId] = useState<number | null>(null);
  const [practiceNonce, setPracticeNonce] = useState(0);
  const [classificationDrafts, setClassificationDrafts] = useState<Record<string, string>>({});

  const [models, setModels] = useState<ModelRecord[]>([]);
  const [adminStats, setAdminStats] = useState<Record<string, unknown> | null>(null);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('WAV');
  const [exportUrl, setExportUrl] = useState('');

  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const token = session?.token;
  const jobs = useMemo(() => flattenJobs(projectDetail), [projectDetail]);
  const selectedAudio = projectDetail?.audio_files.find((file) => file.id === selectedAudioId) ?? null;
  const selectedJob = jobs.find(({ job }) => job.id === selectedJobId)?.job ?? null;
  const resultWarnings = useMemo(() => {
    const all = [...(results?.warnings ?? []), ...(results?.report.warnings ?? [])];
    return [...new Set(all)];
  }, [results]);
  const associatedStemByVoice = useMemo(() => {
    const map = new Map<string, number>();
    const stems = results?.stems ?? [];
    // The lead copy first, so a merged part stem (which carries every member line) wins.
    stems.filter((stem) => stem.voice_id && stem.name === 'lead_vocal').forEach((stem) => map.set(stem.voice_id, stem.id));
    stems.filter((stem) => stem.voice_id && stem.name !== 'lead_vocal').forEach((stem) => {
      map.set(stem.voice_id, stem.id);
      const members = stem.quality?.voice_ids;
      if (Array.isArray(members)) members.forEach((id) => map.set(String(id), stem.id));
    });
    return map;
  }, [results]);

  function showNotice(message: string) {
    setNotice(message);
    setError('');
  }

  function showError(message: string) {
    setError(message);
  }

  async function loadProject(
    authToken: string,
    projectId: number,
    preferredAudioId?: number | null,
    preferredJobId?: number | null,
  ): Promise<ProjectDetail> {
    const detail = await api.project(authToken, projectId);
    setProjectDetail(detail);
    setSelectedProjectId(projectId);

    const nextAudioId =
      (preferredAudioId && detail.audio_files.some((file) => file.id === preferredAudioId)
        ? preferredAudioId
        : detail.audio_files[0]?.id) ?? null;
    setSelectedAudioId(nextAudioId);

    const flattened = flattenJobs(detail);
    const nextJobId =
      (preferredJobId && flattened.some(({ job }) => job.id === preferredJobId)
        ? preferredJobId
        : flattened[0]?.job.id) ?? null;
    if (nextJobId !== selectedJobId) {
      setSelectedJobId(nextJobId);
      const summary = flattened.find(({ job }) => job.id === nextJobId)?.job;
      setJobDetail(summary ? { ...summary, stages: [] } : null);
      setResults(null);
      setPitchData(null);
      setExportUrl('');
    }
    return detail;
  }

  async function refreshProjects(authToken: string, preferredProjectId?: number | null) {
    const list = await api.projects(authToken);
    setProjects(list);
    const projectId =
      (preferredProjectId && list.some((project) => project.id === preferredProjectId)
        ? preferredProjectId
        : list[0]?.id) ?? null;
    if (projectId) await loadProject(authToken, projectId, selectedAudioId, selectedJobId);
    else {
      setSelectedProjectId(null);
      setProjectDetail(null);
      setSelectedAudioId(null);
      setSelectedJobId(null);
      setJobDetail(null);
      setResults(null);
    }
    return list;
  }

  async function refreshModels(authToken: string, isAdmin: boolean) {
    const [modelRows, stats] = await Promise.all([
      api.models(authToken),
      isAdmin ? api.adminStats(authToken).catch(() => null) : Promise.resolve(null),
    ]);
    setModels(modelRows);
    setAdminStats(stats);
  }

  async function refreshResults(): Promise<void> {
    if (!token || !selectedJobId) return;
    const nextResults = await api.results(token, selectedJobId);
    setResults(nextResults);
    try {
      setPitchData(await api.pitch(token, selectedJobId));
    } catch {
      setPitchData(null);
    }
    if (selectedProjectId) {
      const list = await api.projects(token);
      setProjects(list);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((value) => {
        if (!cancelled) setHealth(value);
      })
      .catch(() => {
        if (!cancelled) setHealth(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveSession(session);
    if (!session) {
      setProjects([]);
      setProjectDetail(null);
      setSelectedProjectId(null);
      setSelectedAudioId(null);
      setSelectedJobId(null);
      setJobDetail(null);
      setResults(null);
      setPitchData(null);
      setModels([]);
      setAdminStats(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const list = await api.projects(session.token);
        if (cancelled) return;
        setProjects(list);
        if (list[0]) await loadProject(session.token, list[0].id);
        await refreshModels(session.token, session.user.is_admin);
      } catch (loadError) {
        if (!cancelled) showError(errorText(loadError));
      }
    })();
    return () => {
      cancelled = true;
    };
    // loadProject/refreshModels intentionally use the session snapshot for
    // this bootstrap pass; later actions call them explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    if (!token || !selectedJobId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const detail = await api.job(token, selectedJobId);
        if (cancelled) return;
        setJobDetail(detail);
        if (detail.state === 'COMPLETED') {
          const nextResults = await api.results(token, selectedJobId);
          if (cancelled) return;
          setResults(nextResults);
          try {
            const pitch = await api.pitch(token, selectedJobId);
            if (!cancelled) setPitchData(pitch);
          } catch {
            if (!cancelled) setPitchData(null);
          }
        } else if (TERMINAL_STATES.has(detail.state)) {
          setResults(null);
          setPitchData(null);
        }
      } catch (loadError) {
        if (!cancelled) showError(errorText(loadError));
      }
    };

    void load();
    if (jobDetail && TERMINAL_STATES.has(jobDetail.state)) {
      return () => {
        cancelled = true;
      };
    }
    const interval = window.setInterval(() => void load(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
    // jobDetail.state is the polling gate; including the whole object would
    // restart the interval on every progress update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedJobId, jobDetail?.state]);

  useEffect(() => {
    if (!results) return;
    setClassificationDrafts(() => {
      const next: Record<string, string> = {};
      results.voices.forEach((voice) => {
        next[voice.voice_id] = voice.user_classification || voice.classification || 'unknown';
      });
      return next;
    });
  }, [results]);

  async function handleAuth(event: FormEvent) {
    event.preventDefault();
    setBusy('auth');
    setError('');
    setNotice('');
    try {
      const nextSession =
        authMode === 'register' ? await api.register(email, password) : await api.login(email, password);
      setSession(nextSession);
      setPassword('');
      showNotice(authMode === 'register' ? 'Account created. Your projects are private by default.' : 'Welcome back.');
    } catch (authError) {
      showError(errorText(authError));
    } finally {
      setBusy('');
    }
  }

  async function handleCreateProject(event: FormEvent) {
    event.preventDefault();
    if (!token || !newProjectTitle.trim()) return;
    setBusy('project');
    try {
      const created = await api.createProject(token, newProjectTitle.trim());
      setNewProjectTitle('');
      await refreshProjects(token, created.id);
      showNotice(`Project “${created.title}” created.`);
    } catch (createError) {
      showError(errorText(createError));
    } finally {
      setBusy('');
    }
  }

  async function handleDeleteProject() {
    if (!token || !projectDetail) return;
    if (!window.confirm(`Delete “${projectDetail.title}”, its uploads, stems and exports?`)) return;
    setBusy('delete-project');
    try {
      await api.deleteProject(token, projectDetail.id);
      setSelectedJobId(null);
      setJobDetail(null);
      setResults(null);
      await refreshProjects(token);
      showNotice('Project deleted.');
    } catch (deleteError) {
      showError(errorText(deleteError));
    } finally {
      setBusy('');
    }
  }

  function acceptDroppedFile(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }

  async function handleUpload() {
    if (!token || !selectedProjectId || !selectedFile) return;
    setBusy('upload');
    try {
      const uploaded = await api.upload(token, selectedProjectId, selectedFile);
      await loadProject(token, selectedProjectId, uploaded.audio_file_id, selectedJobId);
      const list = await api.projects(token);
      setProjects(list);
      setSelectedFile(null);
      showNotice(
        `${uploaded.filename} validated and uploaded.${uploaded.duplicate_of_existing ? ' This exact file already exists in your library.' : ''} ${uploaded.notice}`,
      );
    } catch (uploadError) {
      showError(errorText(uploadError));
    } finally {
      setBusy('');
    }
  }

  async function handleCreateJob() {
    if (!token || !selectedAudioId) return;
    setBusy('job');
    try {
      const created = await api.createJob(token, {
        audio_file_id: selectedAudioId,
        quality,
        profile,
        engine,
        vocal_analysis: vocalAnalysis,
        all_voice_parts: vocalAnalysis && allVoiceParts,
      });
      setSelectedJobId(created.id);
      setJobDetail({ ...created, stages: [] });
      setResults(null);
      setPitchData(null);
      setExportUrl('');
      if (selectedProjectId) await loadProject(token, selectedProjectId, selectedAudioId, created.id);
      showNotice(created.estimated_processing_time ?? 'Separation job queued.');
    } catch (jobError) {
      showError(errorText(jobError));
    } finally {
      setBusy('');
    }
  }

  function selectJob(job: JobSummary) {
    setSelectedJobId(job.id);
    setJobDetail({ ...job, stages: [] });
    setResults(null);
    setPitchData(null);
    setExportUrl('');
    setError('');
  }

  async function handleCancelJob() {
    if (!token || !selectedJobId) return;
    setBusy('cancel');
    try {
      const cancelled = await api.cancelJob(token, selectedJobId);
      setJobDetail({ ...cancelled, stages: jobDetail?.stages ?? [] });
      showNotice('Cancellation recorded. A worker already inside a model call may finish that call before stopping.');
    } catch (cancelError) {
      showError(errorText(cancelError));
    } finally {
      setBusy('');
    }
  }

  async function handleClassificationSave(voice: Voice) {
    if (!token || !results) return;
    const stemId = associatedStemByVoice.get(voice.voice_id);
    if (!stemId) {
      showError('This detected line has no exported stem yet, so there is no stem record to attach a correction to.');
      return;
    }
    setBusy(`voice-${voice.voice_id}`);
    try {
      await api.patchStem(token, stemId, {
        voice_classification: classificationDrafts[voice.voice_id] || 'unknown',
      });
      await refreshResults();
      showNotice('Your classification was saved separately from the AI/DSP classification.');
    } catch (saveError) {
      showError(errorText(saveError));
    } finally {
      setBusy('');
    }
  }

  function requestPractice(voice: Voice) {
    const stemId = associatedStemByVoice.get(voice.voice_id);
    if (!stemId) return;
    setPracticeStemId(stemId);
    setPracticeNonce((value) => value + 1);
    window.setTimeout(() => {
      document.getElementById('stem-mixer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function handleExport() {
    if (!token || !selectedJobId) return;
    setBusy('export');
    try {
      const created = await api.createExport(token, selectedJobId, exportFormat);
      setExportUrl(created.download_url);
      showNotice(`ZIP export ready (${exportFormat}). It contains only stems that actually exist, plus reports and analysis JSON.`);
    } catch (exportError) {
      showError(errorText(exportError));
    } finally {
      setBusy('');
    }
  }

  function downloadReport() {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results.report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `job-${results.id}-processing-report.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleToggleModel(model: ModelRecord) {
    if (!token || !session?.user.is_admin) return;
    setBusy(`model-${model.name}`);
    try {
      await api.toggleModel(token, model.name, !model.enabled);
      await refreshModels(token, true);
      showNotice(`${model.name} ${model.enabled ? 'disabled' : 'enabled'}.`);
    } catch (toggleError) {
      showError(errorText(toggleError));
    } finally {
      setBusy('');
    }
  }

  function logout() {
    setSession(null);
    saveSession(null);
    setNotice('');
    setError('');
  }

  const header = (
    <header className="site-header">
      <div className="header-inner">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">♫</div>
          <div>
            <strong>Vocal Separator</strong>
            <span>Music stems · choir analysis · vocal practice</span>
          </div>
        </div>
        <div className="header-actions">
          <span className={`health-dot ${health ? 'online' : ''}`}>
            {health ? `API ${health.status}` : 'API status unknown'}
          </span>
          {session && (
            <>
              <span className="user-chip">{session.user.email}{session.user.is_admin ? ' · admin' : ''}</span>
              <button type="button" className="button ghost small" onClick={logout}>Log out</button>
            </>
          )}
        </div>
      </div>
    </header>
  );

  const alerts = (
    <>
      {notice && (
        <div className="alert success" role="status">
          {notice}
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice('')}>×</button>
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
          <button type="button" aria-label="Dismiss error" onClick={() => setError('')}>×</button>
        </div>
      )}
    </>
  );

  if (!session) {
    return (
      <div className="app-shell">
        {header}
        <main className="page auth-layout">
          <section className="hero-panel">
            <p className="eyebrow">Upload → analyze → separate → practice → export</p>
            <h1>Separate the song. <span>Inspect the voices.</span></h1>
            <p className="hero-copy">
              Turn a mixed recording into synchronized music stems, examine the evidence behind
              detected vocal lines, solo what you need, and download only the parts the system can
              justify. No fabricated soprano file just because a button exists.
            </p>
            <div className="capability-grid">
              <article>
                <strong>Level 1</strong>
                <h2>Music stems</h2>
                <p>Original, vocals, instrumental and available drums, bass, piano, guitar or other stems.</p>
              </article>
              <article>
                <strong>Level 2</strong>
                <h2>Vocal intelligence</h2>
                <p>Polyphonic pitch lines, persistent voice tracks, ranges, probabilities and gated reconstructions.</p>
              </article>
              <article>
                <strong>Practice</strong>
                <h2>Choir workstation</h2>
                <p>Synchronized mixer, A/B original, phrase loops, pitch-preserved tempo and estimated pitch lines.</p>
              </article>
            </div>
            <HonestyPanel health={health} />
          </section>

          <section className="panel auth-panel">
            <p className="eyebrow">Private workspace</p>
            <h2>{authMode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
            <p className="muted">Projects and audio are owner-scoped. Signed URLs expire automatically.</p>
            {alerts}
            <div className="segmented-control" role="group" aria-label="Authentication mode">
              <button
                type="button"
                aria-pressed={authMode === 'login'}
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Log in
              </button>
              <button
                type="button"
                aria-pressed={authMode === 'register'}
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>
            <form className="form-stack" onSubmit={handleAuth}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </label>
              <button className="button primary large" type="submit" disabled={busy === 'auth'}>
                {busy === 'auth' ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Log in'}
              </button>
            </form>
            <div className="auth-health">
              <h3>Current deployment</h3>
              <HealthList health={health} />
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {header}
      <main className="page workspace-layout">
        <aside className="sidebar">
          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">Library</p>
                <h2>My projects</h2>
              </div>
              <span className="status-pill">{projects.length}</span>
            </div>
            <form className="form-stack compact-form" onSubmit={handleCreateProject}>
              <label className="field">
                <span>New project</span>
                <input
                  value={newProjectTitle}
                  onChange={(event) => setNewProjectTitle(event.target.value)}
                  placeholder="Sunday choir rehearsal"
                />
              </label>
              <button className="button primary" type="submit" disabled={busy === 'project' || !newProjectTitle.trim()}>
                Create project
              </button>
            </form>

            <div className="project-list">
              {projects.length === 0 && <p className="muted">No projects yet. Create one to upload audio.</p>}
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-card ${project.id === selectedProjectId ? 'selected' : ''}`}
                  onClick={() => {
                    if (token) void loadProject(token, project.id).catch((loadError) => showError(errorText(loadError)));
                  }}
                >
                  <strong>{project.title}</strong>
                  <span>{dateText(project.created_at)}</span>
                  <span className="mini-stats">
                    {project.audio_files} file(s) · {project.jobs} job(s) · {project.stems} stem(s)
                  </span>
                </button>
              ))}
            </div>
            {projectDetail && (
              <button
                type="button"
                className="button danger-outline full-width"
                disabled={busy === 'delete-project'}
                onClick={() => void handleDeleteProject()}
              >
                Delete selected project
              </button>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading compact">
              <div>
                <p className="eyebrow">System</p>
                <h2>Processing status</h2>
              </div>
            </div>
            <HealthList health={health} />
          </section>

          <HonestyPanel health={health} />
        </aside>

        <div className="content-column">
          {alerts}

          <section className="workspace-header panel">
            <div>
              <p className="eyebrow">Project workspace</p>
              <h1>{projectDetail?.title ?? 'Create a project to begin'}</h1>
              <p className="muted">
                Upload, configure real engine capabilities, watch every pipeline stage, then inspect
                synchronized stems and the evidence behind each detected voice.
              </p>
            </div>
            {selectedJob && (
              <div className="selected-job-chip">
                <span>Selected job</span>
                <strong>#{selectedJob.id} · {selectedJob.state}</strong>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">1 · Source audio</p>
                <h2>Upload and choose a recording</h2>
              </div>
              <span className="status-pill">Private by default</span>
            </div>

            {!projectDetail ? (
              <div className="empty-state">Create or select a project from the library first.</div>
            ) : (
              <>
                <div className="file-list">
                  {projectDetail.audio_files.length === 0 && (
                    <p className="muted">No audio in this project yet.</p>
                  )}
                  {projectDetail.audio_files.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      className={`file-row ${file.id === selectedAudioId ? 'selected' : ''}`}
                      onClick={() => setSelectedAudioId(file.id)}
                    >
                      <span className="file-main">
                        <strong>{file.filename}</strong>
                        <span>
                          {formatTime(file.meta.duration)} · {file.meta.sample_rate ?? '—'} Hz ·{' '}
                          {file.meta.channels ?? '—'} channel(s) · {formatBytes(file.size_bytes)}
                        </span>
                      </span>
                      <span className="file-meta">
                        {String(file.meta.format ?? file.meta.sniffed_format ?? 'audio')}
                        <small>{file.jobs.length} processing job(s)</small>
                      </span>
                    </button>
                  ))}
                </div>

                <label
                  className={`dropzone ${dragging ? 'is-dragging' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={acceptDroppedFile}
                >
                  <span className="drop-icon">♫</span>
                  <strong>Drop your song here</strong>
                  <span>or choose a file — MP3 · WAV · FLAC · M4A · OGG · OPUS · AIFF</span>
                  <input
                    className="visually-hidden"
                    type="file"
                    accept={ACCEPTED_AUDIO}
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </label>

                {selectedFile && (
                  <div className="selected-file card-inset">
                    <div>
                      <strong>{selectedFile.name}</strong>
                      <span>{formatBytes(selectedFile.size)} · browser type: {selectedFile.type || 'unknown'}</span>
                    </div>
                    <button
                      type="button"
                      className="button primary"
                      disabled={busy === 'upload'}
                      onClick={() => void handleUpload()}
                    >
                      {busy === 'upload' ? 'Validating…' : 'Upload & validate'}
                    </button>
                  </div>
                )}
                <p className="fine-print">
                  The server checks magic bytes—not just the extension—plus codec, duration, sample rate,
                  channels and file integrity. Upload only audio you own or have permission to process.
                </p>
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">2 · Separation</p>
                <h2>Choose what the engine should attempt</h2>
              </div>
              {selectedAudio && <span className="status-pill">{selectedAudio.filename}</span>}
            </div>

            <div className="options-grid">
              <fieldset className="option-group">
                <legend>Stem profile</legend>
                {Object.entries(PROFILE_COPY).map(([value, copy]) => (
                  <label key={value} className={`radio-card ${profile === value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="profile"
                      value={value}
                      checked={profile === value}
                      onChange={() => setProfile(value)}
                    />
                    <span>
                      <strong>{copy.title}</strong>
                      <small>{copy.description}</small>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="option-stack">
                <label className="field">
                  <span>Processing quality</span>
                  <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                    {Object.entries(QUALITY_COPY).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Engine selection</span>
                  <select value={engine} onChange={(event) => setEngine(event.target.value)}>
                    <option value="auto">Auto — ML when genuinely available, DSP fallback with a visible warning</option>
                    <option value="demucs">Demucs only — fail clearly if unavailable</option>
                    <option value="dsp">Built-in DSP — exact-sum soft masks, more bleed</option>
                  </select>
                </label>
                <label className="check-field large-check">
                  <input
                    type="checkbox"
                    checked={vocalAnalysis}
                    onChange={(event) => setVocalAnalysis(event.target.checked)}
                  />
                  <span>
                    <strong>Analyze individual voices</strong>
                    <small>Pitch tracks, ranges, probabilities and confidence-gated part reconstruction.</small>
                  </span>
                </label>
                <label className="check-field large-check">
                  <input
                    type="checkbox"
                    checked={allVoiceParts}
                    disabled={!vocalAnalysis}
                    onChange={(event) => setAllVoiceParts(event.target.checked)}
                  />
                  <span>
                    <strong>Separate every voice part (soprano → bass)</strong>
                    <small>One stem per part. Low-confidence lines are placed by pitch order and marked best guess.</small>
                  </span>
                </label>
                <div className="engine-note">
                  <strong>Current server:</strong>{' '}
                  {health?.engines.demucs
                    ? 'Demucs reports available; first use may need its weights.'
                    : `DSP will be used in Auto mode. ${health?.engines.demucs_note ?? ''}`}
                </div>
                <button
                  type="button"
                  className="button primary large"
                  disabled={!selectedAudioId || busy === 'job'}
                  onClick={() => void handleCreateJob()}
                >
                  {busy === 'job' ? 'Queueing…' : 'Start separation'}
                </button>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">3 · Processing history</p>
                <h2>Jobs in this project</h2>
              </div>
              <span className="status-pill">{jobs.length} job(s)</span>
            </div>
            {jobs.length === 0 ? (
              <div className="empty-state">No separation jobs yet.</div>
            ) : (
              <div className="job-list">
                {jobs.map(({ job, audio }) => (
                  <button
                    key={job.id}
                    type="button"
                    className={`job-row ${job.id === selectedJobId ? 'selected' : ''}`}
                    onClick={() => selectJob(job)}
                  >
                    <span className="job-main">
                      <strong>#{job.id} · {audio.filename}</strong>
                      <span>{job.message || 'Queued'} · {dateText(job.created_at)}</span>
                    </span>
                    <span className={`state-chip ${stateClass(job.state)}`}>{job.state}</span>
                    <span className="job-progress-text">{Math.round((job.progress ?? 0) * 100)}%</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {(jobDetail || selectedJob) && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Pipeline</p>
                  <h2>{jobDetail?.state === 'COMPLETED' ? 'Separation complete' : 'Processing progress'}</h2>
                  <p className="muted">{jobDetail?.message || selectedJob?.message || 'Waiting for worker…'}</p>
                </div>
                <div className="section-actions">
                  <span className={`state-chip ${stateClass(jobDetail?.state ?? selectedJob?.state ?? '')}`}>
                    {jobDetail?.state ?? selectedJob?.state}
                  </span>
                  {jobDetail && !TERMINAL_STATES.has(jobDetail.state) && (
                    <button
                      type="button"
                      className="button danger-outline small"
                      disabled={busy === 'cancel'}
                      onClick={() => void handleCancelJob()}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              <div className="progress-track" aria-label="Overall job progress">
                <div className="progress-bar" style={{ width: `${Math.round((jobDetail?.progress ?? 0) * 100)}%` }} />
              </div>
              <p className="progress-caption">{Math.round((jobDetail?.progress ?? 0) * 100)}% overall</p>

              {jobDetail?.stages?.length ? (
                <ol className="stages-list">
                  {jobDetail.stages.map((stage) => (
                    <li key={stage.name} className={`stage-row ${stateClass(stage.state)}`}>
                      <span className="stage-icon">
                        {stage.state === 'done' ? '✓' : stage.state === 'running' ? '→' : stage.state === 'failed' ? '!' : '○'}
                      </span>
                      <span className="stage-main">
                        <strong>{prettyName(stage.name)}</strong>
                        <small>{stage.message || stage.state}</small>
                      </span>
                      <span>{Math.round(stage.progress * 100)}%</span>
                      {stage.duration_s !== undefined && stage.duration_s > 0 && (
                        <small>{stage.duration_s.toFixed(1)}s</small>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">Stage details will appear as the worker reports them.</p>
              )}

              {jobDetail?.error && <div className="alert error inline">{jobDetail.error}</div>}
              {(jobDetail?.warnings?.length ?? 0) > 0 && (
                <ul className="warning-list">
                  {jobDetail?.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              )}
            </section>
          )}

          {results && (
            <>
              <section className="panel result-summary">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">4 · Results</p>
                    <h2>Inspect before you download</h2>
                    <p className="muted">
                      <strong>Original</strong> is the uploaded mix. Every separated stem is an
                      AI/DSP reconstruction and may contain bleed or artifacts.
                    </p>
                  </div>
                  <span className="status-pill is-live">Synchronized outputs</span>
                </div>

                <div className="summary-grid">
                  <article className="summary-card">
                    <span>Music / derived stems</span>
                    <strong>{results.stems.filter((stem) => stem.kind !== 'voice_part' && stem.kind !== 'minus_one').length}</strong>
                  </article>
                  <article className="summary-card">
                    <span>Exported voice parts</span>
                    <strong>{results.stems.filter((stem) => stem.kind === 'voice_part').length}</strong>
                  </article>
                  <article className="summary-card">
                    <span>Detected voice lines</span>
                    <strong>{results.voices.length}</strong>
                  </article>
                  <article className="summary-card">
                    <span>Model</span>
                    <strong className="summary-model">{results.model || '—'} {results.model_version}</strong>
                  </article>
                </div>

                {results.report.voice_outcome && (
                  <p className="muted small-text" data-outcome={results.report.voice_outcome.code}>
                    {results.report.voice_outcome.message}
                    {results.report.lead_split_outcome?.code === 'lead_split_ready'
                      ? ` ${results.report.lead_split_outcome.message}`
                      : ''}
                  </p>
                )}

                {resultWarnings.length > 0 && (
                  <ul className="warning-list">
                    {resultWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                )}

                <div className="export-bar card-inset">
                  <label className="compact-field">
                    <span>ZIP audio format</span>
                    <select value={exportFormat} onChange={(event) => setExportFormat(event.target.value as ExportFormat)}>
                      <option value="WAV">WAV — lossless working stems</option>
                      <option value="FLAC">FLAC — lossless, smaller</option>
                      <option value="MP3">MP3 — final-stage lossy export</option>
                    </select>
                  </label>
                  <button type="button" className="button primary" disabled={busy === 'export'} onClick={() => void handleExport()}>
                    {busy === 'export' ? 'Preparing ZIP…' : 'Create ZIP export'}
                  </button>
                  {exportUrl && (
                    <a className="button ghost" href={exportUrl}>
                      ↓ Download ZIP
                    </a>
                  )}
                  <button type="button" className="button ghost" onClick={downloadReport}>
                    ↓ Processing report JSON
                  </button>
                </div>
              </section>

              <StemMixer
                key={results.id}
                results={results}
                token={token ?? ''}
                pitchData={pitchData}
                practiceStemId={practiceStemId}
                practiceNonce={practiceNonce}
                onRefresh={refreshResults}
                onNotice={showNotice}
                onError={showError}
              />

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Vocal analysis</p>
                    <h2>Detected voices & confidence</h2>
                    <p className="muted">
                      Classification uses the whole line—range, pitch distribution, continuity and weak
                      timbral evidence—not a single high or low note.
                    </p>
                  </div>
                  <span className="status-pill">Unknown is valid</span>
                </div>

                {results.voices.length === 0 ? (
                  <div className="empty-state">
                    No analysable vocal lines were reported. The aggregate vocal stem may be silent,
                    instrumental-only, or too uncertain to track responsibly.
                  </div>
                ) : (
                  <div className="voice-grid">
                    {results.voices.map((voice) => {
                      const associatedStemId = associatedStemByVoice.get(voice.voice_id);
                      // The sentence under these controls explains why they are inert;
                      // the id lets each control point at it so a screen reader announces
                      // the reason together with the control instead of leaving it nearby.
                      const stemGateId = `stem-gate-${voice.voice_id}`;
                      const displayClass = voice.user_classification || voice.classification;
                      return (
                        <article key={voice.voice_id} className="voice-card">
                          <div className="voice-card-heading">
                            <div>
                              <p className="eyebrow">
                                {voice.voice_id.replace('_', ' ')} · {voice.is_lead ? 'Lead line' : prettyName(voice.role)}
                                {voice.assigned_part ? ` · Part: ${prettyName(voice.assigned_part)}${voice.assignment === 'best_guess' ? ' (best guess)' : ''}` : ''}
                              </p>
                              <h3>{prettyName(displayClass)}</h3>
                              {voice.user_classification && voice.user_classification !== voice.classification && (
                                <p className="muted small-text">AI/DSP said: {prettyName(voice.classification)}</p>
                              )}
                              {voice.classification === 'unknown' && voice.predicted && (
                                <p className="muted small-text">Most likely, but not reliable: {prettyName(voice.predicted)}</p>
                              )}
                            </div>
                            <span className={`confidence-chip ${confidenceClass(voice.confidence)}`}>
                              {percent(voice.confidence)}
                            </span>
                          </div>

                          <div
                            className="confidence-bar"
                            role="meter"
                            aria-label={`${voice.voice_id} classification confidence`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(voice.confidence * 100)}
                          >
                            <span
                              className={confidenceClass(voice.confidence)}
                              style={{ width: `${Math.round(voice.confidence * 100)}%` }}
                            />
                          </div>
                          <p className="muted small-text">{confidenceText(voice.confidence, voice.confidence_label)}</p>

                          <dl className="metric-grid voice-metrics">
                            <div>
                              <dt>Range</dt>
                              <dd>
                                {voice.range
                                  ? `${voice.range.lowest_note}–${voice.range.highest_note}`
                                  : '—'}
                              </dd>
                            </div>
                            <div>
                              <dt>Median pitch</dt>
                              <dd>{voice.pitch_statistics ? `MIDI ${voice.pitch_statistics.median_midi}` : '—'}</dd>
                            </div>
                            <div>
                              <dt>Voiced evidence</dt>
                              <dd>{voice.voiced_seconds !== undefined ? `${voice.voiced_seconds.toFixed(1)}s` : '—'}</dd>
                            </div>
                            <div>
                              <dt>Stem</dt>
                              <dd>{voice.stem_available ? 'Exported' : 'Withheld'}</dd>
                            </div>
                          </dl>

                          {voice.chart_fit?.length ? (
                            <p className="muted small-text" title="Share of this line's notes inside each standard vocal range">
                              Fits the standard ranges:{' '}
                              {voice.chart_fit
                                .filter((fit, index) => index === 0 || fit.within_range_ratio >= 0.9)
                                .slice(0, 3)
                                .map(
                                  (fit) =>
                                    `${prettyName(fit.class)} ${fit.lowest_note}–${fit.highest_note} (${percent(fit.within_range_ratio)})`,
                                )
                                .join(' · ')}
                            </p>
                          ) : null}

                          {voice.predictions?.length ? (
                            <div className="prediction-list">
                              {voice.predictions.slice(0, 4).map((prediction) => (
                                <span key={prediction.class}>
                                  {prettyName(prediction.class)} {percent(prediction.probability)}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {voice.stem_available && voice.stem_note && (
                            <p className="muted small-text">{voice.stem_note}</p>
                          )}

                          {!voice.stem_available && (
                            <div className="withheld-box">
                              {voice.stem_unavailable_reason ??
                                'This line did not meet the export gate, so no misleading part file was created.'}
                            </div>
                          )}

                          <div className="voice-actions">
                            <label className="compact-field grow">
                              <span>Your classification</span>
                              <select
                                value={classificationDrafts[voice.voice_id] ?? displayClass}
                                disabled={!associatedStemId}
                                aria-describedby={!associatedStemId ? stemGateId : undefined}
                                onChange={(event) =>
                                  setClassificationDrafts((previous) => ({
                                    ...previous,
                                    [voice.voice_id]: event.target.value,
                                  }))
                                }
                              >
                                {VOICE_PARTS.map((part) => (
                                  <option key={part} value={part}>{prettyName(part)}</option>
                                ))}
                              </select>
                            </label>
                            <button
                              type="button"
                              className="button small"
                              disabled={!associatedStemId || busy === `voice-${voice.voice_id}`}
                              aria-describedby={!associatedStemId ? stemGateId : undefined}
                              onClick={() => void handleClassificationSave(voice)}
                            >
                              Save correction
                            </button>
                            <button
                              type="button"
                              className="button small primary"
                              disabled={!associatedStemId}
                              aria-describedby={!associatedStemId ? stemGateId : undefined}
                              onClick={() => requestPractice(voice)}
                            >
                              Practice stem
                            </button>
                          </div>
                          {!associatedStemId && (
                            /* Linked by id so the sentence is announced with the control
                               it explains, instead of sitting next to it unconnected. */
                            <p id={stemGateId} className="fine-print">Corrections and practice activate when this line produces an exported stem.</p>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Provenance</p>
                    <h2>Processing report</h2>
                  </div>
                  <span className="status-pill">Pipeline {results.report.pipeline ?? '—'}</span>
                </div>
                <div className="report-grid">
                  <dl className="system-list">
                    <div><dt>Input</dt><dd>{results.audio_file.filename}</dd></div>
                    <div><dt>Duration</dt><dd>{formatTime(results.report.input?.duration ?? results.audio_file.meta.duration)}</dd></div>
                    <div><dt>Sample rate</dt><dd>{results.report.input?.sample_rate ?? results.audio_file.meta.sample_rate ?? '—'} Hz</dd></div>
                    <div><dt>Channels</dt><dd>{results.report.input?.channels ?? results.audio_file.meta.channels ?? '—'}</dd></div>
                    <div><dt>Processing time</dt><dd>{results.report.processing_time !== undefined ? `${results.report.processing_time}s` : '—'}</dd></div>
                    <div><dt>Detected sources</dt><dd>{results.report.detected_sources?.map(prettyName).join(', ') || '—'}</dd></div>
                  </dl>
                  <dl className="system-list">
                    <div><dt>Separation model</dt><dd>{unknownText(results.report.separation?.model)} {unknownText(results.report.separation?.version)}</dd></div>
                    <div><dt>Engine</dt><dd>{unknownText(results.report.separation?.engine)}</dd></div>
                    <div><dt>Profile</dt><dd>{unknownText(results.report.separation?.profile)}</dd></div>
                    <div><dt>Quality preset</dt><dd>{unknownText(results.report.separation?.quality)}</dd></div>
                    <div><dt>Sample aligned</dt><dd>{unknownText(results.report.reconstruction?.sample_aligned)}</dd></div>
                    <div>
                      <dt>Reconstruction residual</dt>
                      <dd>
                        {results.report.reconstruction?.residual_db_below_mix !== null &&
                        results.report.reconstruction?.residual_db_below_mix !== undefined
                          ? `${results.report.reconstruction.residual_db_below_mix} dB below mix`
                          : results.report.reconstruction?.note ?? '—'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <details className="raw-json">
                  <summary>View raw processing report</summary>
                  <pre>{JSON.stringify(results.report, null, 2)}</pre>
                </details>
              </section>
            </>
          )}

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Model registry</p>
                <h2>Available engines & licences</h2>
                <p className="muted">The interface only presents an adapter as available when this deployment can actually use it.</p>
              </div>
              <span className="status-pill">{models.filter((model) => model.available).length} available</span>
            </div>

            {session.user.is_admin && adminStats && (
              <div className="summary-grid admin-summary">
                <article className="summary-card"><span>Users</span><strong>{unknownText(adminStats.users)}</strong></article>
                <article className="summary-card"><span>Projects</span><strong>{unknownText(adminStats.projects)}</strong></article>
                <article className="summary-card"><span>Stems</span><strong>{unknownText(adminStats.stems)}</strong></article>
                <article className="summary-card"><span>Failures</span><strong>{unknownText(adminStats.failures)}</strong></article>
              </div>
            )}

            <div className="model-grid">
              {models.map((model) => (
                <article key={model.name} className="model-card">
                  <div className="model-heading">
                    <div>
                      <h3>{model.name}</h3>
                      <p>{model.provider} · {model.version}</p>
                    </div>
                    <span className={`availability-chip ${model.available ? 'available' : ''}`}>
                      {model.available ? 'Available' : model.enabled ? 'Unavailable' : 'Disabled'}
                    </span>
                  </div>
                  <p className="muted">{model.availability_note}</p>
                  <dl className="system-list compact-system">
                    <div><dt>Sources</dt><dd>{model.supported_sources.map(prettyName).join(', ')}</dd></div>
                    <div><dt>Licence</dt><dd>{model.license}</dd></div>
                    <div><dt>GPU required</dt><dd>{model.gpu_required ? 'Yes' : 'No'}</dd></div>
                    <div><dt>Expected quality</dt><dd>{unknownText(model.meta.expected_quality)}</dd></div>
                  </dl>
                  {session.user.is_admin && (
                    <button
                      type="button"
                      className="button ghost small"
                      disabled={busy === `model-${model.name}`}
                      onClick={() => void handleToggleModel(model)}
                    >
                      {model.enabled ? 'Disable model' : 'Enable model'}
                    </button>
                  )}
                </article>
              ))}
            </div>
            {session.user.is_admin && adminStats?.note ? (
              <p className="fine-print">{String(adminStats.note)}</p>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
