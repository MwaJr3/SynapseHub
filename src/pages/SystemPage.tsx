import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { goalDomains, today } from '@/features/personal-os/data';
import { AnalyticsSpace } from '@/features/personal-os/AnalyticsSpace';
import { createScopedExport, type ExportScope } from '@/features/personal-os/exports';
import { ExecutionSpace } from '@/features/personal-os/ExecutionSpace';
import { GrowthSpace } from '@/features/personal-os/GrowthSpace';
import { RecordStudio } from '@/features/personal-os/RecordStudio';
import { ScheduleSpace } from '@/features/personal-os/ScheduleSpace';
import { decryptExport, encryptExport } from '@/features/personal-os/secureExport';
import { CycleCompletion, ReflectionRecords } from '@/features/personal-os/ReflectionRecords';
import {
  computeOverallSignal,
  createCycleArchive,
  currentCycleWeek,
  cycleEndDate,
  cycleProgress,
  energyScore,
  hydratePersonalSystem,
  systemHealth,
  todayActions,
  usePersonalSystem,
} from '@/features/personal-os/system';
import type {
  Decision,
  DecisionType,
  Goal,
  GoalDomain,
  PriorityTier,
  Project,
  ProjectStatus,
  SystemSignal,
} from '@/features/personal-os/types';

type SystemTab = 'dashboard' | 'plan' | 'execute' | 'schedule' | 'decisions' | 'review' | 'analytics' | 'growth' | 'records';

const tabs: { id: SystemTab; label: string; description: string }[] = [
  { id: 'dashboard', label: 'System health', description: 'Signal before speed' },
  { id: 'plan', label: 'Direction', description: 'Identity, goals, projects' },
  { id: 'execute', label: 'Plan & execute', description: 'Week, priorities, capacity' },
  { id: 'schedule', label: 'Schedule', description: 'Protect time blocks' },
  { id: 'decisions', label: 'Decisions', description: 'Decide, test, learn' },
  { id: 'review', label: 'Review', description: 'Evidence, blockers, adaptation' },
  { id: 'analytics', label: 'Analytics', description: 'Evidence over guesses' },
  { id: 'growth', label: 'Growth', description: 'Learning, people, principles' },
  { id: 'records', label: 'Records', description: 'Edit and restore history' },
];

const signalClasses: Record<SystemSignal, string> = {
  stable: 'border-signal/40 bg-signal/10 text-signal',
  attention: 'border-caution/40 bg-caution/10 text-caution',
  intervene: 'border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300',
  unknown: 'border-line-strong bg-panel-strong text-ink-muted',
};

const signalLabels: Record<SystemSignal, string> = {
  stable: 'Stable',
  attention: 'Attention',
  intervene: 'Intervene',
  unknown: 'Need data',
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  core: 'Core',
  support: 'Support',
  experiment: 'Experiment',
  parked: 'Parked',
};

const decisionTypeHelp: Record<DecisionType, string> = {
  A: 'Reversible — decide quickly; do not rent headspace to a low-cost choice.',
  B: 'Important but reversible — timebox research, then choose a testable direction.',
  C: 'High-cost or difficult to reverse — run a pre-mortem and get a second perspective.',
};

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function RatingInput({
  id,
  label,
  value,
  onChange,
  inverse = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  inverse?: boolean;
}) {
  const detail = inverse ? '1 = light, 5 = high' : '1 = low, 5 = high';
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        <span className="mono-meta">{detail}</span>
      </div>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={`grid h-9 w-9 place-items-center rounded-full border text-sm font-medium transition-colors ${
              rating === value
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-panel text-ink-muted hover:border-accent/60 hover:text-ink'
            }`}
            role="radio"
            aria-checked={rating === value}
            aria-label={`${label}: ${rating} out of 5`}
            onClick={() => onChange(rating)}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
  className = '',
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className={eyebrow ? 'mt-2 text-xl font-semibold tracking-tight text-ink' : 'text-xl font-semibold tracking-tight text-ink'}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="text-ink-muted">{label}</span>
        <span className="font-mono text-ink">{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-pill bg-panel-strong">
        <div
          className="h-full rounded-pill bg-accent transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function SystemPage() {
  usePageMeta({
    title: 'Personal Operating System',
    description:
      'A private, local-first 90-day system for direction, decisions, energy, project execution, and reflection.',
    path: '/system',
    noIndex: true,
  });

  const { data, update, replace, reset, persistenceIssue, recoveryPayload } = usePersonalSystem();
  const [activeTab, setActiveTab] = useState<SystemTab>('dashboard');
  const [exportScope, setExportScope] = useState<ExportScope>('full');
  const [redactExport, setRedactExport] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [transferStatus, setTransferStatus] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const encryptedInputRef = useRef<HTMLInputElement>(null);
  const health = useMemo(() => systemHealth(data), [data]);
  const overallSignal = useMemo(() => computeOverallSignal(data), [data]);
  const cycleWeek = currentCycleWeek(data.cycleStart);
  const progress = cycleProgress(data.cycleStart);
  const energy = energyScore(data.energyLogs);

  const downloadJson = (payload: string, filename: string) => {
    const file = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportSystem = () => {
    downloadJson(JSON.stringify(data, null, 2), `personal-os-backup-${today()}.json`);
  };

  const exportScoped = () => {
    const payload = createScopedExport(data, exportScope, redactExport);
    downloadJson(JSON.stringify(payload, null, 2), `personal-os-${exportScope}${redactExport ? '-redacted' : ''}-${today()}.json`);
    setTransferStatus('Scoped export downloaded. Scoped files are for sharing or inspection, not workspace restore.');
  };

  const exportEncrypted = async () => {
    try {
      const payload = createScopedExport(data, exportScope, redactExport);
      const encrypted = await encryptExport(payload, exportPassphrase);
      downloadJson(JSON.stringify(encrypted, null, 2), `personal-os-encrypted-${exportScope}-${today()}.json`);
      setExportPassphrase('');
      setTransferStatus('Encrypted transfer file downloaded. Keep its passphrase separately; it cannot be recovered by this app.');
    } catch (caught) {
      setTransferStatus(caught instanceof Error ? caught.message : 'Could not encrypt the export.');
    }
  };

  const importSystem = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) return;
    try {
      const candidate: unknown = JSON.parse(await file.text());
      const restored = hydratePersonalSystem(candidate);
      if (!restored) throw new Error('Unexpected file format');
      replace(restored);
    } catch {
      window.alert('That file is not a valid Personal Operating System export. Your current data was not changed.');
    } finally {
      event.target.value = '';
    }
  };

  const importEncryptedSystem = async (event: ChangeEvent<HTMLInputElement>) => {
    const [file] = Array.from(event.target.files ?? []);
    if (!file) return;
    const passphrase = window.prompt('Enter the passphrase for this encrypted Personal OS transfer file.');
    if (!passphrase) {
      event.target.value = '';
      return;
    }
    try {
      const encrypted: unknown = JSON.parse(await file.text());
      const decrypted = await decryptExport(encrypted, passphrase);
      const wrapper = decrypted as { scope?: string; payload?: unknown };
      if (wrapper.scope !== 'full') throw new Error('Only a full encrypted backup can restore a workspace. Scoped exports are intentionally read-only.');
      const restored = hydratePersonalSystem(wrapper.payload);
      if (!restored) throw new Error('The decrypted payload is not a valid workspace backup.');
      replace(restored);
      setTransferStatus('Encrypted full backup restored. It remains local to this browser.');
    } catch (caught) {
      setTransferStatus(caught instanceof Error ? caught.message : 'Could not restore this encrypted export. Your current workspace was not changed.');
    } finally {
      event.target.value = '';
    }
  };

  const startNewCycle = () => {
    if (
      window.confirm(
        'Archive the current cycle and start a fresh 12-week clock? Its goals, projects, actions, reviews, meaning records, blockers, and energy checks will remain in the cycle archive. Export first for an additional backup.',
      )
    ) {
      update((previous) => ({
        ...previous,
        cycleArchives: [
          createCycleArchive(previous, {
            intended: '', achieved: '', leverage: '', recurringBlockers: '', stop: '', nextEmphasis: '',
          }, makeId('cycle')),
          ...previous.cycleArchives,
        ],
        cycleStart: today(),
        cycleName: 'New 90-day cycle',
        cycleTheme: '',
      }));
    }
  };

  return (
    <div className="pb-16">
      <section data-tone="contrast" className="relative overflow-hidden border-b border-line bg-surface text-ink">
        <div className="motif-grid absolute inset-0" aria-hidden="true" />
        <div className="shell relative py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[1.45fr_0.75fr] lg:items-end">
            <div>
              <p className="eyebrow">Private workspace · stored in this browser</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
                The system turns self-knowledge into a weekly operating rhythm.
              </h1>
              <p className="prose-lead mt-5 max-w-2xl text-base sm:text-lg">
                Orient around a 90-day direction, match work to available energy,
                make decisions before they become background noise, and change the
                system when the evidence says to.
              </p>
            </div>
            <div className="rounded-card border border-line bg-panel/70 p-5 backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{data.cycleName || 'Current cycle'}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight">Week {cycleWeek} / 12</p>
                  <p className="mt-1 text-xs text-ink-muted">{data.cycleStart} → {cycleEndDate(data.cycleStart)}</p>
                </div>
                <span className="rounded-pill border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
                  {progress}% elapsed
                </span>
              </div>
              <div className="mt-5"><Meter value={progress} label="90-day arc" /></div>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                The aim is not to maximise activity. It is to keep foundations
                stable while producing one meaningful, visible stream of work.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="shell mt-8">
        {persistenceIssue && (
          <div role="alert" className="mb-5 rounded-card border border-red-500/40 bg-red-500/10 p-4 text-sm leading-relaxed text-ink">
            <p className="font-semibold">Your workspace is in recovery mode.</p>
            <p className="mt-1 text-ink-muted">{persistenceIssue}</p>
            {recoveryPayload && <button type="button" className="btn btn-secondary mt-3" onClick={() => downloadJson(recoveryPayload, `personal-os-recovery-${today()}.json`)}>Download preserved payload</button>}
          </div>
        )}
        <div className="overflow-x-auto border-b border-line" role="tablist" aria-label="Personal operating system sections">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={activeTab === tab.id ? `system-panel-${tab.id}` : undefined}
                id={`system-tab-${tab.id}`}
                className={`rounded-t-card border-x border-t px-4 py-3 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'border-line bg-panel text-ink'
                    : 'border-transparent text-ink-muted hover:bg-panel-strong hover:text-ink'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="block text-sm font-semibold">{tab.label}</span>
                <span className="mt-0.5 block font-mono text-2xs uppercase tracking-[0.08em] opacity-75">
                  {tab.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-8">
          {activeTab === 'dashboard' && (
            <Dashboard
              health={health}
              overallSignal={overallSignal}
              energy={energy}
              cycleWeek={cycleWeek}
              data={data}
              goTo={(tab) => setActiveTab(tab)}
            />
          )}
          {activeTab === 'plan' && <Direction data={data} update={update} />}
          {activeTab === 'execute' && <ExecutionSpace data={data} update={update} cycleWeek={cycleWeek} />}
          {activeTab === 'schedule' && <ScheduleSpace data={data} update={update} />}
          {activeTab === 'decisions' && <DecisionBoard data={data} update={update} />}
          {activeTab === 'review' && <ReviewSpace data={data} update={update} cycleWeek={cycleWeek} />}
          {activeTab === 'analytics' && <AnalyticsSpace data={data} />}
          {activeTab === 'growth' && <GrowthSpace data={data} update={update} />}
          {activeTab === 'records' && <RecordStudio data={data} update={update} />}
        </div>

        <section className="mt-8 border-t border-line pt-8" aria-labelledby="system-tools-heading">
          <div className="rounded-card border border-line bg-panel-strong p-5">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <p className="eyebrow">Data stewardship</p>
                <h2 id="system-tools-heading" className="mt-1 text-base font-semibold text-ink">Your system belongs to you</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">This workspace is local-first: data stays in this browser unless you download it. A full JSON backup is the only export that can restore the complete workspace. Manual file exchange is not cloud sync, and this browser cannot lock files at operating-system level.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary" onClick={exportSystem}>Full backup</button>
                <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>Restore backup</button>
                <button type="button" className="btn btn-secondary" onClick={() => encryptedInputRef.current?.click()}>Restore encrypted backup</button>
                <button type="button" className="btn btn-ghost" onClick={startNewCycle}>New 90-day clock</button>
                <button type="button" className="btn btn-ghost text-red-600 dark:text-red-300" onClick={() => { if (window.confirm('Reset this browser workspace to the starter system? Export first if you need the current data.')) reset(); }}>Reset workspace</button>
                <input ref={inputRef} type="file" accept="application/json" className="sr-only" onChange={importSystem} />
                <input ref={encryptedInputRef} type="file" accept="application/json" className="sr-only" onChange={importEncryptedSystem} />
              </div>
            </div>
            <div className="mt-6 grid gap-4 border-t border-line pt-5 lg:grid-cols-[1fr_1fr_auto]">
              <label className="system-field"><span>Share scope</span><select value={exportScope} onChange={(event) => setExportScope(event.target.value as ExportScope)}><option value="full">Full workspace</option><option value="current-cycle">Current cycle</option><option value="planning">Planning only</option><option value="review">Review evidence only</option></select></label>
              <div className="grid gap-3"><label className="system-field"><span>Encryption passphrase <small>10+ characters; never saved</small></span><input type="password" autoComplete="new-password" value={exportPassphrase} onChange={(event) => setExportPassphrase(event.target.value)} placeholder="Only for encrypted transfer" /></label><label className="flex items-center gap-2 text-sm text-ink-muted"><input type="checkbox" checked={redactExport} onChange={(event) => setRedactExport(event.target.checked)} /> Redact narrative/private-text fields</label></div>
              <div className="flex flex-wrap items-end gap-2"><button type="button" className="btn btn-secondary" onClick={exportScoped}>Download scoped copy</button><button type="button" className="btn btn-primary" onClick={exportEncrypted}>Download encrypted copy</button></div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-subtle">Encrypted copies use browser Web Crypto (AES-GCM with PBKDF2-SHA-256). Keep the passphrase separately: there is no account, recovery service, bank connection, or live multi-device conflict handling in this local app.</p>
            {transferStatus && <p role="status" className="mt-3 text-sm text-ink-muted">{transferStatus}</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Dashboard({
  health,
  overallSignal,
  energy,
  cycleWeek,
  data,
  goTo,
}: {
  health: ReturnType<typeof systemHealth>;
  overallSignal: ReturnType<typeof computeOverallSignal>;
  energy: number | null;
  cycleWeek: number;
  data: ReturnType<typeof usePersonalSystem>['data'];
  goTo: (tab: SystemTab) => void;
}) {
  const coreProject = data.projects.find((project) => project.status === 'core');
  const pendingDecisions = data.decisions.filter((decision) => !decision.chosenOption);
  const latestReview = [...data.weeklyReviews]
    .filter((review) => review.cycleStart === data.cycleStart)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const mostRecentEnergy = [...data.energyLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const priorities = todayActions(data);

  return (
    <div id="system-panel-dashboard" role="tabpanel" aria-labelledby="system-tab-dashboard" className="grid gap-6">
      <section className={`rounded-card border p-5 sm:p-6 ${signalClasses[overallSignal.signal]}`} aria-label="Authoritative system signal">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">System signal · single source of truth</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{overallSignal.label}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">{overallSignal.detail}</p>
          </div>
          <span className="rounded-pill border border-current/30 px-3 py-1 font-mono text-2xs uppercase tracking-[0.1em]">{signalLabels[overallSignal.signal]}</span>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="System health indicators">
        {health.map((item) => (
          <article key={item.id} className="card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-ink">{item.label}</h2>
              <span className={`rounded-pill border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.08em] ${signalClasses[item.signal]}`}>
                {signalLabels[item.signal]}
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{item.detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel eyebrow="Weekly orientation" title="Use today’s capacity, not an imaginary ideal day">
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-line bg-panel-strong p-4">
              <p className="eyebrow">Energy</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{energy === null ? '—' : `${energy.toFixed(1)} / 5`}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                {mostRecentEnergy ? `Last check-in: ${mostRecentEnergy.date}` : 'No check-in yet.'}
              </p>
            </div>
            <div className="rounded-card border border-line bg-panel-strong p-4">
              <p className="eyebrow">Core project</p>
              <p className="mt-2 text-base font-semibold text-ink">{coreProject?.name ?? 'Not selected'}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">{coreProject?.nextMilestone ?? 'Define one before opening a second project.'}</p>
            </div>
            <div className="rounded-card border border-line bg-panel-strong p-4">
              <p className="eyebrow">Cycle review</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{latestReview?.week === cycleWeek ? 'Done' : 'Due'}</p>
              <p className="mt-2 text-xs leading-relaxed text-ink-muted">Week {cycleWeek}: observe what moved, then adjust the system.</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className="btn btn-primary" onClick={() => goTo('review')}>Log today’s energy</button>
            <button type="button" className="btn btn-secondary" onClick={() => goTo('plan')}>Set direction</button>
          </div>
        </Panel>

        <Panel eyebrow="Current protocol" title="The next decision is more useful than more planning">
          <ol className="mt-5 grid gap-3">
            {[
              ['01', 'Orient', 'Name the energy state and the single priority that fits it.'],
              ['02', 'Execute', 'Take a visible next action on one Tier 1 or Tier 2 commitment.'],
              ['03', 'Connect', 'Make one genuine relationship or feedback move each week.'],
              ['04', 'Adapt', 'Record the friction; change the environment or rule, not your self-worth.'],
            ].map(([number, title, detail]) => (
              <li key={number} className="flex gap-4 rounded-card border border-line bg-panel-strong p-3">
                <span className="font-mono text-xs text-accent">{number}</span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <Panel eyebrow="Today’s priorities" title="What is the next visible action?">
        {priorities.length ? (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {priorities.slice(0, 4).map((action) => (
              <li key={action.id} className="rounded-card border border-line bg-panel-strong p-4">
                <div className="flex items-center justify-between gap-3"><span className="rounded-pill border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-2xs text-accent">Tier {action.tier}</span><span className="font-mono text-2xs text-ink-subtle">{action.estimateHours} h · {action.cognitiveDemand}</span></div>
                <p className="mt-3 text-sm font-semibold text-ink">{action.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{action.nextAction || 'Choose a physical first step in Plan & execute.'}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm leading-relaxed text-ink-muted">No action is scheduled for today. Add one commitment that fits your current capacity; the system deliberately does not invent a task for you.</p>}
        <button type="button" className="btn btn-secondary mt-5" onClick={() => goTo('execute')}>Plan today’s actions</button>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Open loops" title={`${pendingDecisions.length} pending decision${pendingDecisions.length === 1 ? '' : 's'}`}>
          {pendingDecisions.length ? (
            <ul className="mt-4 grid gap-2">
              {pendingDecisions.slice(0, 4).map((decision) => (
                <li key={decision.id} className="flex items-start justify-between gap-4 rounded-card border border-line bg-panel-strong p-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{decision.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">Type {decision.type} · {decision.deadline ? `deadline ${decision.deadline}` : 'no deadline yet'}</p>
                  </div>
                  <span className="shrink-0 rounded-pill bg-accent/10 px-2 py-1 font-mono text-2xs text-accent">Choose</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">No decisions are waiting for a choice. That is room for focused execution, not an invitation to manufacture more options.</p>
          )}
          <button type="button" className="btn btn-secondary mt-5" onClick={() => goTo('decisions')}>Open decision engine</button>
        </Panel>

        <Panel eyebrow="Meaning anchor" title="Routine is infrastructure for the future you chose">
          <blockquote className="mt-4 border-l-2 border-accent pl-4 text-lg leading-relaxed text-ink">
            “{latestReview?.meaningAnchor || data.identity.currentIdentityFocus}”
          </blockquote>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            In the weekly review, make one causal link between a mundane action and the long-term life it supports. Meaning is a practice, not a mood.
          </p>
          <button type="button" className="btn btn-secondary mt-5" onClick={() => goTo('review')}>Write weekly reflection</button>
        </Panel>
      </div>
    </div>
  );
}

function Direction({
  data,
  update,
}: {
  data: ReturnType<typeof usePersonalSystem>['data'];
  update: ReturnType<typeof usePersonalSystem>['update'];
}) {
  const [goalDraft, setGoalDraft] = useState({
    domain: 'Projects' as GoalDomain,
    title: '',
    outcome: '',
    proof: '',
    baseline: '',
    target: '',
    measurementMethod: '',
    deadline: '',
    definitionOfDone: '',
    tier: 2 as PriorityTier,
  });
  const [projectDraft, setProjectDraft] = useState({
    name: '', purpose: '', audience: '', mvp: '', nextMilestone: '', deadline: '', hoursBudget: '12', status: 'experiment' as ProjectStatus, stopCondition: '',
  });

  const saveGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!goalDraft.title.trim()) return;
    const goal: Goal = {
      id: makeId('goal'),
      domain: goalDraft.domain,
      title: goalDraft.title.trim(),
      outcome: goalDraft.outcome.trim(),
      proof: goalDraft.proof.trim(),
      tier: goalDraft.tier,
      status: 'active',
      parentGoalId: '',
      baseline: goalDraft.baseline.trim(),
      target: goalDraft.target.trim(),
      measurementMethod: goalDraft.measurementMethod.trim(),
      startDate: today(),
      deadline: goalDraft.deadline,
      definitionOfDone: goalDraft.definitionOfDone.trim(),
      reviewDate: '',
    };
    update((previous) => ({ ...previous, goals: [...previous.goals, goal] }));
    setGoalDraft({ domain: 'Projects', title: '', outcome: '', proof: '', baseline: '', target: '', measurementMethod: '', deadline: '', definitionOfDone: '', tier: 2 });
  };

  const saveProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectDraft.name.trim()) return;
    const project: Project = {
      id: makeId('project'),
      name: projectDraft.name.trim(),
      purpose: projectDraft.purpose.trim(),
      audience: projectDraft.audience.trim(),
      mvp: projectDraft.mvp.trim(),
      currentStage: 'Define v0.1',
      nextMilestone: projectDraft.nextMilestone.trim(),
      nextAction: projectDraft.nextMilestone.trim(),
      deadline: projectDraft.deadline,
      hoursBudget: Math.max(0, Number(projectDraft.hoursBudget) || 0),
      actualHours: 0,
      status: projectDraft.status,
      shipped: false,
      stopCondition: projectDraft.stopCondition.trim(),
      definitionOfDone: '',
      excludedFromV1: '',
      repositoryUrl: '',
      deploymentUrl: '',
      evidence: '',
    };
    update((previous) => ({ ...previous, projects: [...previous.projects, project] }));
    setProjectDraft({ name: '', purpose: '', audience: '', mvp: '', nextMilestone: '', deadline: '', hoursBudget: '12', status: 'experiment', stopCondition: '' });
  };

  const updateIdentity = (field: keyof typeof data.identity, value: string | string[]) => {
    update((previous) => ({
      ...previous,
      identity: { ...previous.identity, [field]: value },
    }));
  };

  return (
    <div id="system-panel-plan" role="tabpanel" aria-labelledby="system-tab-plan" className="grid gap-6">
      <Panel eyebrow="Identity → action" title="Direction that survives a difficult week">
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
          These are working assumptions, not a performance of certainty. Keep them short enough to review and concrete enough to guide a real trade-off.
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <label className="system-field">
            <span>Cycle name</span>
            <input value={data.cycleName} onChange={(event) => update((previous) => ({ ...previous, cycleName: event.target.value }))} placeholder="A short, honest cycle name" />
          </label>
          <label className="system-field">
            <span>Cycle theme</span>
            <input value={data.cycleTheme} onChange={(event) => update((previous) => ({ ...previous, cycleTheme: event.target.value }))} placeholder="What this cycle is principally for" />
          </label>
          <label className="system-field lg:col-span-2">
            <span>90-day vision</span>
            <textarea value={data.identity.visionStatement} rows={3} onChange={(event) => updateIdentity('visionStatement', event.target.value)} />
          </label>
          <label className="system-field lg:col-span-2">
            <span>Identity statement</span>
            <textarea value={data.identity.identityStatement} rows={3} onChange={(event) => updateIdentity('identityStatement', event.target.value)} />
          </label>
          <label className="system-field lg:col-span-2">
            <span>Personal mission</span>
            <textarea value={data.identity.missionStatement} rows={2} onChange={(event) => updateIdentity('missionStatement', event.target.value)} placeholder="What contribution or responsibility guides your current direction?" />
          </label>
          <label className="system-field">
            <span>Current identity focus</span>
            <input value={data.identity.currentIdentityFocus} onChange={(event) => updateIdentity('currentIdentityFocus', event.target.value)} />
          </label>
          <label className="system-field">
            <span>Core values <small>one per line</small></span>
            <textarea value={data.identity.coreValues.join('\n')} rows={3} onChange={(event) => updateIdentity('coreValues', splitLines(event.target.value))} />
          </label>
          <label className="system-field">
            <span>Desired traits <small>one per line</small></span>
            <textarea value={data.identity.desiredTraits.join('\n')} rows={3} onChange={(event) => updateIdentity('desiredTraits', splitLines(event.target.value))} />
          </label>
          <label className="system-field">
            <span>Non-negotiables <small>one per line</small></span>
            <textarea value={data.identity.nonNegotiables.join('\n')} rows={3} onChange={(event) => updateIdentity('nonNegotiables', splitLines(event.target.value))} />
          </label>
          <label className="system-field lg:col-span-2">
            <span>Patterns I intend to stop repeating <small>one per line</small></span>
            <textarea value={data.identity.neverAgain.join('\n')} rows={2} onChange={(event) => updateIdentity('neverAgain', splitLines(event.target.value))} />
          </label>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(['minimum', 'standard', 'exceptional'] as const).map((level) => (
            <label key={level} className="system-field rounded-card border border-line bg-panel-strong p-4">
              <span className="capitalize">{level} definition of done</span>
              <textarea
                value={data.identity.standards[level]}
                rows={3}
                onChange={(event) => update((previous) => ({
                  ...previous,
                  identity: { ...previous.identity, standards: { ...previous.identity.standards, [level]: event.target.value } },
                }))}
              />
            </label>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel eyebrow="Priority stack" title="Goals need proof, not just aspiration">
          <div className="mt-5 grid gap-3">
            {data.goals.map((goal) => (
              <article key={goal.id} className="rounded-card border border-line bg-panel-strong p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-pill border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-2xs text-accent">Tier {goal.tier}</span>
                      <span className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-subtle">{goal.domain}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-ink">{goal.title}</h3>
                  </div>
                  <select
                    className="system-select w-auto"
                    value={goal.status}
                    aria-label={`Status for ${goal.title}`}
                    onChange={(event) => update((previous) => ({
                      ...previous,
                      goals: previous.goals.map((item) => item.id === goal.id ? { ...item, status: event.target.value as Goal['status'] } : item),
                    }))}
                  >
                    <option value="active">Active</option>
                    <option value="complete">Complete</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-muted">{goal.outcome || 'Add a concrete outcome.'}</p>
                <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-muted"><span className="font-semibold text-ink">Proof:</span> {goal.proof || 'Define observable evidence.'}</p>
                <button type="button" className="mt-3 text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, goals: previous.goals.filter((item) => item.id !== goal.id) }))}>Remove goal</button>
              </article>
            ))}
          </div>
          <form className="mt-5 border-t border-line pt-5" onSubmit={saveGoal}>
            <p className="eyebrow">Add a measurable goal</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="system-field"><span>Domain</span><select value={goalDraft.domain} onChange={(event) => setGoalDraft((current) => ({ ...current, domain: event.target.value as GoalDomain }))}>{goalDomains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
              <label className="system-field"><span>Priority tier</span><select value={goalDraft.tier} onChange={(event) => setGoalDraft((current) => ({ ...current, tier: Number(event.target.value) as PriorityTier }))}><option value={1}>Tier 1 — foundations</option><option value={2}>Tier 2 — strategic growth</option><option value={3}>Tier 3 — experiments</option></select></label>
              <label className="system-field sm:col-span-2"><span>Goal title</span><input required value={goalDraft.title} onChange={(event) => setGoalDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What is the concrete outcome?" /></label>
              <label className="system-field sm:col-span-2"><span>Outcome</span><textarea rows={2} value={goalDraft.outcome} onChange={(event) => setGoalDraft((current) => ({ ...current, outcome: event.target.value }))} placeholder="What will be different by the end of the cycle?" /></label>
              <label className="system-field sm:col-span-2"><span>Proof of progress</span><input value={goalDraft.proof} onChange={(event) => setGoalDraft((current) => ({ ...current, proof: event.target.value }))} placeholder="What evidence would count?" /></label>
              <label className="system-field"><span>Baseline</span><input value={goalDraft.baseline} onChange={(event) => setGoalDraft((current) => ({ ...current, baseline: event.target.value }))} placeholder="Where are you now?" /></label>
              <label className="system-field"><span>Target</span><input value={goalDraft.target} onChange={(event) => setGoalDraft((current) => ({ ...current, target: event.target.value }))} placeholder="What threshold matters?" /></label>
              <label className="system-field"><span>Measurement method</span><input value={goalDraft.measurementMethod} onChange={(event) => setGoalDraft((current) => ({ ...current, measurementMethod: event.target.value }))} placeholder="How will you check?" /></label>
              <label className="system-field"><span>Deadline / review</span><input type="date" value={goalDraft.deadline} onChange={(event) => setGoalDraft((current) => ({ ...current, deadline: event.target.value }))} /></label>
              <label className="system-field sm:col-span-2"><span>Definition of done</span><input value={goalDraft.definitionOfDone} onChange={(event) => setGoalDraft((current) => ({ ...current, definitionOfDone: event.target.value }))} placeholder="What does completed mean in practice?" /></label>
            </div>
            <button className="btn btn-primary mt-4" type="submit">Add goal</button>
          </form>
        </Panel>

        <Panel eyebrow="Trade-off rule" title="Tier 1 protects Tier 2">
          <div className="mt-5 grid gap-3">
            {[
              ['Tier 1', 'Foundations', 'Sleep, health, academic obligations, and core responsibilities.'],
              ['Tier 2', 'Strategic growth', 'One core project, one skill focus, and deliberate relationship maintenance.'],
              ['Tier 3', 'Experiments', 'Interesting extras that do not destabilise the first two layers.'],
            ].map(([tier, title, detail]) => (
              <div key={tier} className="rounded-card border border-line bg-panel-strong p-4">
                <p className="font-mono text-2xs uppercase tracking-[0.1em] text-accent">{tier}</p>
                <h3 className="mt-1 text-sm font-semibold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-card border border-caution/30 bg-caution/10 p-4 text-sm leading-relaxed text-ink-muted">
            When a Tier 1 and Tier 2 demand conflict, Tier 1 wins. When Tier 2 and Tier 3 conflict, Tier 2 wins. The purpose is conscious trade-offs, not a fuller list.
          </p>
        </Panel>
      </div>

      <Panel eyebrow="Portfolio" title="One core project, bounded experiments, a visible next milestone">
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.projects.map((project) => (
            <ProjectCard key={project.id} project={project} update={update} />
          ))}
        </div>
        <form className="mt-6 border-t border-line pt-5" onSubmit={saveProject}>
          <p className="eyebrow">Add a project</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="system-field"><span>Name</span><input required value={projectDraft.name} onChange={(event) => setProjectDraft((current) => ({ ...current, name: event.target.value }))} placeholder="A concrete project name" /></label>
            <label className="system-field"><span>Portfolio state</span><select value={projectDraft.status} onChange={(event) => setProjectDraft((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="system-field"><span>Purpose</span><textarea rows={2} value={projectDraft.purpose} onChange={(event) => setProjectDraft((current) => ({ ...current, purpose: event.target.value }))} /></label>
            <label className="system-field"><span>Audience</span><textarea rows={2} value={projectDraft.audience} onChange={(event) => setProjectDraft((current) => ({ ...current, audience: event.target.value }))} placeholder="Who needs to see or use it?" /></label>
            <label className="system-field md:col-span-2"><span>MVP</span><textarea rows={2} value={projectDraft.mvp} onChange={(event) => setProjectDraft((current) => ({ ...current, mvp: event.target.value }))} placeholder="One outcome, one audience, one sufficient version." /></label>
            <label className="system-field"><span>Next milestone</span><input value={projectDraft.nextMilestone} onChange={(event) => setProjectDraft((current) => ({ ...current, nextMilestone: event.target.value }))} /></label>
            <label className="system-field"><span>Stop condition</span><input value={projectDraft.stopCondition} onChange={(event) => setProjectDraft((current) => ({ ...current, stopCondition: event.target.value }))} placeholder="When will you pause it?" /></label>
            <label className="system-field"><span>Review / deadline</span><input type="date" value={projectDraft.deadline} onChange={(event) => setProjectDraft((current) => ({ ...current, deadline: event.target.value }))} /></label>
            <label className="system-field"><span>Hours budget</span><input type="number" min="0" value={projectDraft.hoursBudget} onChange={(event) => setProjectDraft((current) => ({ ...current, hoursBudget: event.target.value }))} /></label>
          </div>
          <button type="submit" className="btn btn-primary mt-4">Add project</button>
        </form>
      </Panel>
    </div>
  );
}

function ProjectCard({
  project,
  update,
}: {
  project: Project;
  update: ReturnType<typeof usePersonalSystem>['update'];
}) {
  const updateProject = (change: Partial<Project>) => update((previous) => ({
    ...previous,
    projects: previous.projects.map((item) => item.id === project.id ? { ...item, ...change } : item),
  }));

  return (
    <article className="rounded-card border border-line bg-panel-strong p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.1em] text-accent">{projectStatusLabels[project.status]}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{project.name}</h3>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <input type="checkbox" checked={project.shipped} onChange={(event) => updateProject({ shipped: event.target.checked })} />
          Shipped
        </label>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{project.purpose || 'No purpose written yet.'}</p>
      <dl className="mt-4 grid gap-3 border-t border-line pt-4 text-sm">
        <div><dt className="font-mono text-2xs uppercase tracking-[0.08em] text-ink-subtle">MVP</dt><dd className="mt-1 leading-relaxed text-ink-muted">{project.mvp || 'Define a minimum viable version.'}</dd></div>
        <div><dt className="font-mono text-2xs uppercase tracking-[0.08em] text-ink-subtle">Next milestone</dt><dd className="mt-1 leading-relaxed text-ink">{project.nextMilestone || 'Choose one visible next move.'}</dd></div>
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="system-field"><span>Current stage</span><input value={project.currentStage} onChange={(event) => updateProject({ currentStage: event.target.value })} /></label>
        <label className="system-field"><span>Portfolio state</span><select value={project.status} onChange={(event) => updateProject({ status: event.target.value as ProjectStatus })}>{Object.entries(projectStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <button type="button" className="mt-4 text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, projects: previous.projects.filter((item) => item.id !== project.id) }))}>Remove project</button>
    </article>
  );
}

function DecisionBoard({
  data,
  update,
}: {
  data: ReturnType<typeof usePersonalSystem>['data'];
  update: ReturnType<typeof usePersonalSystem>['update'];
}) {
  const [draft, setDraft] = useState({
    title: '', context: '', options: '', type: 'B' as DecisionType, deadline: '', expectedUpside: '', majorRisk: '', opportunityCost: '', strongestCounterargument: '', expectedOutcome: '', reviewDate: '',
  });

  const addDecision = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    const decision: Decision = {
      id: makeId('decision'),
      title: draft.title.trim(),
      context: draft.context.trim(),
      options: splitLines(draft.options),
      type: draft.type,
      deadline: draft.deadline,
      chosenOption: '',
      confidence: null,
      expectedUpside: draft.expectedUpside.trim(),
      majorRisk: draft.majorRisk.trim(),
      opportunityCost: draft.opportunityCost.trim(),
      strongestCounterargument: draft.strongestCounterargument.trim(),
      expectedOutcome: draft.expectedOutcome.trim(),
      actualOutcome: '',
      lesson: '',
      reviewDate: draft.reviewDate,
      createdAt: new Date().toISOString(),
    };
    update((previous) => ({ ...previous, decisions: [decision, ...previous.decisions] }));
    setDraft({ title: '', context: '', options: '', type: 'B', deadline: '', expectedUpside: '', majorRisk: '', opportunityCost: '', strongestCounterargument: '', expectedOutcome: '', reviewDate: '' });
  };

  return (
    <div id="system-panel-decisions" role="tabpanel" aria-labelledby="system-tab-decisions" className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel eyebrow="Decision engine" title="Certainty is not a requirement for reversible action">
          <div className="mt-5 grid gap-3">
            {(['A', 'B', 'C'] as DecisionType[]).map((type) => (
              <div key={type} className="rounded-card border border-line bg-panel-strong p-4">
                <p className="font-mono text-xs text-accent">TYPE {type}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{decisionTypeHelp[type]}</p>
              </div>
            ))}
          </div>
          <ol className="mt-6 grid gap-2 border-t border-line pt-5 text-sm text-ink-muted">
            {['Define the actual decision.', 'Classify reversibility.', 'Set a decision deadline.', 'Name 2–4 realistic options.', 'Check opportunity cost and the strongest argument against your preferred option.', 'Choose, record confidence, and schedule a review.'].map((step, index) => <li key={step} className="flex gap-3"><span className="font-mono text-accent">{String(index + 1).padStart(2, '0')}</span>{step}</li>)}
          </ol>
        </Panel>

        <Panel eyebrow="New decision" title="Put an end point on the analysis">
          <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={addDecision}>
            <label className="system-field md:col-span-2"><span>Decision title</span><input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What do I actually need to choose?" /></label>
            <label className="system-field md:col-span-2"><span>Context</span><textarea rows={2} value={draft.context} onChange={(event) => setDraft((current) => ({ ...current, context: event.target.value }))} /></label>
            <label className="system-field"><span>Type</span><select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as DecisionType }))}><option value="A">A — reversible</option><option value="B">B — important, reversible</option><option value="C">C — high-cost / hard to reverse</option></select></label>
            <label className="system-field"><span>Decision deadline</span><input type="date" value={draft.deadline} onChange={(event) => setDraft((current) => ({ ...current, deadline: event.target.value }))} /></label>
            <label className="system-field md:col-span-2"><span>Options <small>one per line</small></span><textarea rows={3} value={draft.options} onChange={(event) => setDraft((current) => ({ ...current, options: event.target.value }))} placeholder="Option one&#10;Option two" /></label>
            <label className="system-field"><span>Expected upside</span><textarea rows={2} value={draft.expectedUpside} onChange={(event) => setDraft((current) => ({ ...current, expectedUpside: event.target.value }))} /></label>
            <label className="system-field"><span>Major risk</span><textarea rows={2} value={draft.majorRisk} onChange={(event) => setDraft((current) => ({ ...current, majorRisk: event.target.value }))} /></label>
            <label className="system-field"><span>Opportunity cost</span><textarea rows={2} value={draft.opportunityCost} onChange={(event) => setDraft((current) => ({ ...current, opportunityCost: event.target.value }))} /></label>
            <label className="system-field"><span>Strongest case against your preference</span><textarea rows={2} value={draft.strongestCounterargument} onChange={(event) => setDraft((current) => ({ ...current, strongestCounterargument: event.target.value }))} /></label>
            <label className="system-field"><span>Expected outcome</span><textarea rows={2} value={draft.expectedOutcome} onChange={(event) => setDraft((current) => ({ ...current, expectedOutcome: event.target.value }))} /></label>
            <label className="system-field"><span>Review date</span><input type="date" value={draft.reviewDate} onChange={(event) => setDraft((current) => ({ ...current, reviewDate: event.target.value }))} /></label>
            <div className="md:col-span-2"><button className="btn btn-primary" type="submit">Add decision</button></div>
          </form>
        </Panel>
      </div>

      <Panel eyebrow="Decision register" title="Decisions become data only after they are reviewed">
        {data.decisions.length ? (
          <div className="mt-5 grid gap-4">
            {data.decisions.map((decision) => <DecisionCard key={decision.id} decision={decision} update={update} />)}
          </div>
        ) : <p className="mt-4 text-sm text-ink-muted">No decisions recorded yet. Add choices that are using too much background thinking.</p>}
      </Panel>
    </div>
  );
}

function DecisionCard({
  decision,
  update,
}: {
  decision: Decision;
  update: ReturnType<typeof usePersonalSystem>['update'];
}) {
  const [choice, setChoice] = useState(decision.chosenOption);
  const [confidence, setConfidence] = useState(decision.confidence?.toString() ?? '');
  useEffect(() => { setChoice(decision.chosenOption); setConfidence(decision.confidence?.toString() ?? ''); }, [decision.chosenOption, decision.confidence]);
  const choose = () => update((previous) => ({
    ...previous,
    decisions: previous.decisions.map((item) => item.id === decision.id ? { ...item, chosenOption: choice.trim(), confidence: confidence ? Math.min(100, Math.max(0, Number(confidence))) : null } : item),
  }));

  return (
    <article className="rounded-card border border-line bg-panel-strong p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-2xs uppercase tracking-[0.1em] text-accent">Type {decision.type} {decision.deadline ? `· deadline ${decision.deadline}` : ''}</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">{decision.title}</h3>
        </div>
        <span className={`rounded-pill border px-2.5 py-1 font-mono text-2xs ${decision.chosenOption ? signalClasses.stable : signalClasses.attention}`}>{decision.chosenOption ? 'Chosen' : 'Open'}</span>
      </div>
      {decision.context && <p className="mt-3 text-sm leading-relaxed text-ink-muted">{decision.context}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {([
          ['Expected upside', decision.expectedUpside],
          ['Major risk', decision.majorRisk],
          ['Opportunity cost', decision.opportunityCost],
        ] as const).map(([label, detail]) => (
          <div key={label} className="rounded-card border border-line bg-panel p-3"><p className="eyebrow">{label}</p><p className="mt-2 text-sm leading-relaxed text-ink-muted">{detail || 'Not recorded.'}</p></div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-[1fr_150px_auto]">
        <label className="system-field"><span>Chosen option</span><select value={choice} onChange={(event) => setChoice(event.target.value)}><option value="">Choose when ready</option>{decision.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label className="system-field"><span>Confidence %</span><input type="number" min="0" max="100" value={confidence} onChange={(event) => setConfidence(event.target.value)} /></label>
        <div className="flex items-end"><button type="button" className="btn btn-secondary w-full" onClick={choose}>Record choice</button></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-ink-muted">{decision.reviewDate ? `Review on ${decision.reviewDate}` : 'Add a review date for outcome learning.'}</p><button type="button" className="text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, decisions: previous.decisions.filter((item) => item.id !== decision.id) }))}>Remove decision</button></div>
    </article>
  );
}

function ReviewSpace({
  data,
  update,
  cycleWeek,
}: {
  data: ReturnType<typeof usePersonalSystem>['data'];
  update: ReturnType<typeof usePersonalSystem>['update'];
  cycleWeek: number;
}) {
  const [energy, setEnergy] = useState({
    sleepQuality: 3, physicalEnergy: 3, cognitiveEnergy: 3, emotionalLoad: 3,
    recoveryQuality: 3, stress: 3, primaryConstraint: '', priority: '', notes: '',
  });
  const [review, setReview] = useState({ moved: '', friction: '', adjustment: '', meaningAnchor: '', relationshipAction: '', calibrationQuestion: '' });
  const [failure, setFailure] = useState({ domain: 'Projects' as GoalDomain, intendedOutcome: '', actualOutcome: '', systemicCause: '', lesson: '', systemChange: '' });
  const [timer, setTimer] = useState(180);
  const [running, setRunning] = useState(false);
  const [timerAction, setTimerAction] = useState('');

  useEffect(() => {
    if (!running || timer <= 0) return undefined;
    const handle = window.setInterval(() => setTimer((seconds) => seconds - 1), 1000);
    return () => window.clearInterval(handle);
  }, [running, timer]);

  useEffect(() => {
    if (timer === 0) setRunning(false);
  }, [timer]);

  const logEnergy = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update((previous) => ({
      ...previous,
      energyLogs: [{ id: makeId('energy'), date: today(), ...energy }, ...previous.energyLogs.filter((item) => item.date !== today())],
    }));
  };

  const saveReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    update((previous) => ({
      ...previous,
      weeklyReviews: [{ id: makeId('review'), cycleStart: previous.cycleStart, week: cycleWeek, createdAt: new Date().toISOString(), ...review }, ...previous.weeklyReviews.filter((item) => item.cycleStart !== previous.cycleStart || item.week !== cycleWeek)],
    }));
    setReview({ moved: '', friction: '', adjustment: '', meaningAnchor: '', relationshipAction: '', calibrationQuestion: '' });
  };

  const saveFailure = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!failure.intendedOutcome.trim() && !failure.actualOutcome.trim()) return;
    update((previous) => ({ ...previous, failures: [{ id: makeId('failure'), date: today(), followUpDate: '', ...failure }, ...previous.failures] }));
    setFailure({ domain: 'Projects', intendedOutcome: '', actualOutcome: '', systemicCause: '', lesson: '', systemChange: '' });
  };

  const minutes = String(Math.floor(timer / 60)).padStart(2, '0');
  const seconds = String(timer % 60).padStart(2, '0');
  const currentReview = data.weeklyReviews.find(
    (item) => item.cycleStart === data.cycleStart && item.week === cycleWeek,
  );

  return (
    <div id="system-panel-review" role="tabpanel" aria-labelledby="system-tab-review" className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Panel eyebrow="Daily orientation" title="Capacity first, then task selection">
          <form className="mt-5 grid gap-5" onSubmit={logEnergy}>
            <div className="grid gap-5 sm:grid-cols-2">
              <RatingInput id="sleep-quality" label="Sleep quality" value={energy.sleepQuality} onChange={(value) => setEnergy((current) => ({ ...current, sleepQuality: value }))} />
              <RatingInput id="physical-energy" label="Physical energy" value={energy.physicalEnergy} onChange={(value) => setEnergy((current) => ({ ...current, physicalEnergy: value }))} />
              <RatingInput id="cognitive-energy" label="Cognitive energy" value={energy.cognitiveEnergy} onChange={(value) => setEnergy((current) => ({ ...current, cognitiveEnergy: value }))} />
              <RatingInput id="emotional-load" label="Emotional load" value={energy.emotionalLoad} onChange={(value) => setEnergy((current) => ({ ...current, emotionalLoad: value }))} inverse />
              <RatingInput id="recovery-quality" label="Recovery quality" value={energy.recoveryQuality} onChange={(value) => setEnergy((current) => ({ ...current, recoveryQuality: value }))} />
              <RatingInput id="perceived-stress" label="Perceived stress" value={energy.stress} onChange={(value) => setEnergy((current) => ({ ...current, stress: value }))} inverse />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="system-field"><span>Primary constraint</span><input value={energy.primaryConstraint} onChange={(event) => setEnergy((current) => ({ ...current, primaryConstraint: event.target.value }))} placeholder="What is most limiting today?" /></label>
              <label className="system-field"><span>One fitting priority</span><input value={energy.priority} onChange={(event) => setEnergy((current) => ({ ...current, priority: event.target.value }))} placeholder="What task fits this capacity?" /></label>
              <label className="system-field sm:col-span-2"><span>Context note <small>optional</small></span><input value={energy.notes} onChange={(event) => setEnergy((current) => ({ ...current, notes: event.target.value }))} placeholder="Context makes trends easier to interpret; it is not required." /></label>
            </div>
            <div className="flex flex-wrap items-center gap-3"><button type="submit" className="btn btn-primary">Save today’s check-in</button><p className="text-xs text-ink-muted">High: deep work · Medium: implementation/review · Low: maintenance/recovery.</p></div>
          </form>
        </Panel>

        <Panel eyebrow="Cognitive blocker" title="Three minutes to break the loop">
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">When the next step is obvious but you keep thinking, set the timer and take one physical, irreversible action: send the message, open the document, make the commit, or begin the first line.</p>
          <div className="mt-6 grid place-items-center rounded-card border border-accent/30 bg-accent/10 p-6 text-center">
            <label className="system-field w-full max-w-md text-left"><span>One physical action before the timer begins</span><input value={timerAction} onChange={(event) => setTimerAction(event.target.value)} placeholder="Open the assignment and solve question one." /></label>
            <p className="mt-5 font-mono text-5xl font-semibold tracking-tight text-ink">{minutes}:{seconds}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.12em] text-ink-muted">Se activation timer</p>
            {timer === 0 && <p role="status" className="mt-3 max-w-md text-sm leading-relaxed text-ink">Time is complete. Record whether “{timerAction || 'the action'}” happened in the blocker log below, then name the next step.</p>}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => {
                if (timer === 0) setTimer(180);
                setRunning((value) => !value || timer === 0);
              }}>{running ? 'Pause' : timer === 0 ? 'Restart' : 'Start 3 minutes'}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setTimer(180); setRunning(false); }}>Reset</button>
            </div>
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <p className="eyebrow">Predictive patterns</p>
            <ul className="mt-3 grid gap-3">
              {data.blockerPatterns.map((pattern) => <li key={pattern.id} className="rounded-card border border-line bg-panel-strong p-3"><p className="text-sm font-semibold text-ink">{pattern.blocker}</p><p className="mt-1 text-xs leading-relaxed text-ink-muted"><span className="font-medium text-ink">Trigger:</span> {pattern.trigger}</p><p className="mt-1 text-xs leading-relaxed text-ink-muted"><span className="font-medium text-ink">Response:</span> {pattern.intervention}</p></li>)}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel eyebrow={`Week ${cycleWeek} review`} title="Observe → learn → redesign">
        {currentReview && <p className="mt-3 rounded-card border border-signal/30 bg-signal/10 p-3 text-sm text-ink-muted">A review is already recorded for this week. Saving again replaces it, so the latest adjustment remains clear.</p>}
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveReview}>
          <label className="system-field"><span>What moved?</span><textarea required rows={3} value={review.moved} onChange={(event) => setReview((current) => ({ ...current, moved: event.target.value }))} placeholder="Evidence of progress, not just effort." /></label>
          <label className="system-field"><span>What created friction?</span><textarea required rows={3} value={review.friction} onChange={(event) => setReview((current) => ({ ...current, friction: event.target.value }))} placeholder="Energy, environment, ambiguity, skill, communication…" /></label>
          <label className="system-field"><span>What will you adjust?</span><textarea required rows={3} value={review.adjustment} onChange={(event) => setReview((current) => ({ ...current, adjustment: event.target.value }))} placeholder="A changed rule, schedule, scope, or environment." /></label>
          <label className="system-field"><span>Meaning anchor</span><textarea required rows={3} value={review.meaningAnchor} onChange={(event) => setReview((current) => ({ ...current, meaningAnchor: event.target.value }))} placeholder="How did routine work connect to the long-term vision?" /></label>
          <label className="system-field"><span>Relationship action</span><input value={review.relationshipAction} onChange={(event) => setReview((current) => ({ ...current, relationshipAction: event.target.value }))} placeholder="One authentic contact, follow-up, or request for feedback." /></label>
          <label className="system-field"><span>Calibration question</span><input value={review.calibrationQuestion} onChange={(event) => setReview((current) => ({ ...current, calibrationQuestion: event.target.value }))} placeholder="What am I missing?" /></label>
          <div className="md:col-span-2"><button className="btn btn-primary" type="submit">Save weekly review</button></div>
        </form>
      </Panel>

      <ReflectionRecords data={data} update={update} />

      <Panel eyebrow="Post-mortem" title="A failure should change the system, not just the story you tell about yourself">
        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={saveFailure}>
          <label className="system-field"><span>Domain</span><select value={failure.domain} onChange={(event) => setFailure((current) => ({ ...current, domain: event.target.value as GoalDomain }))}>{goalDomains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
          <div className="hidden md:block" aria-hidden="true" />
          <label className="system-field"><span>Intended outcome</span><textarea rows={2} value={failure.intendedOutcome} onChange={(event) => setFailure((current) => ({ ...current, intendedOutcome: event.target.value }))} /></label>
          <label className="system-field"><span>Actual outcome</span><textarea rows={2} value={failure.actualOutcome} onChange={(event) => setFailure((current) => ({ ...current, actualOutcome: event.target.value }))} /></label>
          <label className="system-field"><span>Systemic cause</span><textarea rows={2} value={failure.systemicCause} onChange={(event) => setFailure((current) => ({ ...current, systemicCause: event.target.value }))} placeholder="Planning? Environment? Skill? Energy? Communication?" /></label>
          <label className="system-field"><span>Lesson</span><textarea rows={2} value={failure.lesson} onChange={(event) => setFailure((current) => ({ ...current, lesson: event.target.value }))} /></label>
          <label className="system-field md:col-span-2"><span>System change that prevents recurrence</span><textarea rows={2} value={failure.systemChange} onChange={(event) => setFailure((current) => ({ ...current, systemChange: event.target.value }))} placeholder="Change the rule, environment, schedule, expectation, or skill plan." /></label>
          <div className="md:col-span-2"><button className="btn btn-secondary" type="submit">Log post-mortem</button></div>
        </form>
        {data.failures.length > 0 && <ul className="mt-6 grid gap-3 border-t border-line pt-5">{data.failures.slice(0, 3).map((item) => <li key={item.id} className="rounded-card border border-line bg-panel-strong p-4"><p className="font-mono text-2xs uppercase tracking-[0.1em] text-accent">{item.domain} · {item.date}</p><p className="mt-2 text-sm font-semibold text-ink">{item.systemChange || item.lesson || 'Post-mortem logged'}</p><p className="mt-1 text-sm text-ink-muted">{item.actualOutcome}</p></li>)}</ul>}
      </Panel>

      <CycleCompletion data={data} update={update} cycleWeek={cycleWeek} />
    </div>
  );
}
