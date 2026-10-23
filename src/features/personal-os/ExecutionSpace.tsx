import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { goalDomains, today } from './data';
import { flexibleWeeklyHours, weeklyPlannedHours } from './system';
import type {
  CognitiveDemand,
  GoalDomain,
  PersonalSystemData,
  PriorityTier,
  WeeklyPlan,
} from './types';

export type PersonalSystemUpdater = (
  updater: (previous: PersonalSystemData) => PersonalSystemData,
  options?: { restored?: boolean },
) => void;

const demands: { value: CognitiveDemand; label: string; guidance: string }[] = [
  { value: 'deep', label: 'Deep analytical work', guidance: 'Best protected for high cognitive energy.' },
  { value: 'focused', label: 'Focused implementation', guidance: 'Useful when energy is adequate but not exceptional.' },
  { value: 'routine', label: 'Routine / admin', guidance: 'Suitable for lower-capacity maintenance periods.' },
  { value: 'recovery', label: 'Recovery / reflection', guidance: 'A deliberate support action, not unearned idleness.' },
];

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function ExecutionSpace({
  data,
  update,
  cycleWeek,
}: {
  data: PersonalSystemData;
  update: PersonalSystemUpdater;
  cycleWeek: number;
}) {
  const plan = data.weeklyPlans.find(
    (item) => item.cycleStart === data.cycleStart && item.week === cycleWeek,
  );
  const [planDraft, setPlanDraft] = useState({
    availableHours: plan?.availableHours.toString() ?? '',
    fixedCommitmentHours: plan?.fixedCommitmentHours.toString() ?? '',
    recoveryHours: plan?.recoveryHours.toString() ?? '',
    relationshipAction: plan?.relationshipAction ?? '',
    reflectionPractice: plan?.reflectionPractice ?? '',
    explicitTradeoff: plan?.explicitTradeoff ?? '',
  });
  const [actionDraft, setActionDraft] = useState({
    title: '',
    domain: 'Projects' as GoalDomain,
    tier: 2 as PriorityTier,
    goalId: '',
    projectId: '',
    scheduledFor: today(),
    estimateHours: '1',
    cognitiveDemand: 'focused' as CognitiveDemand,
    nextAction: '',
  });

  useEffect(() => {
    setPlanDraft({
      availableHours: plan?.availableHours.toString() ?? '',
      fixedCommitmentHours: plan?.fixedCommitmentHours.toString() ?? '',
      recoveryHours: plan?.recoveryHours.toString() ?? '',
      relationshipAction: plan?.relationshipAction ?? '',
      reflectionPractice: plan?.reflectionPractice ?? '',
      explicitTradeoff: plan?.explicitTradeoff ?? '',
    });
  }, [
    plan?.availableHours,
    plan?.fixedCommitmentHours,
    plan?.recoveryHours,
    plan?.relationshipAction,
    plan?.reflectionPractice,
    plan?.explicitTradeoff,
  ]);

  const plannedHours = weeklyPlannedHours(data);
  const flexibleHours = flexibleWeeklyHours(plan);
  const currentActions = useMemo(
    () => data.actionItems
      .filter((action) => action.cycleStart === data.cycleStart && action.week === cycleWeek)
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor) || a.tier - b.tier),
    [cycleWeek, data.actionItems, data.cycleStart],
  );

  const savePlan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPlan: WeeklyPlan = {
      id: plan?.id ?? makeId('week'),
      cycleStart: data.cycleStart,
      week: cycleWeek,
      availableHours: Math.max(0, Number(planDraft.availableHours) || 0),
      fixedCommitmentHours: Math.max(0, Number(planDraft.fixedCommitmentHours) || 0),
      recoveryHours: Math.max(0, Number(planDraft.recoveryHours) || 0),
      relationshipAction: planDraft.relationshipAction.trim(),
      reflectionPractice: planDraft.reflectionPractice.trim(),
      explicitTradeoff: planDraft.explicitTradeoff.trim(),
      createdAt: plan?.createdAt ?? new Date().toISOString(),
    };
    update((previous) => ({
      ...previous,
      weeklyPlans: [
        nextPlan,
        ...previous.weeklyPlans.filter(
          (item) => item.cycleStart !== previous.cycleStart || item.week !== cycleWeek,
        ),
      ],
    }));
  };

  const addAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!actionDraft.title.trim()) return;
    update((previous) => ({
      ...previous,
      actionItems: [
        {
          id: makeId('action'),
          cycleStart: previous.cycleStart,
          week: cycleWeek,
          title: actionDraft.title.trim(),
          domain: actionDraft.domain,
          tier: actionDraft.tier,
          goalId: actionDraft.goalId,
          projectId: actionDraft.projectId,
          scheduledFor: actionDraft.scheduledFor,
          estimateHours: Math.max(0, Number(actionDraft.estimateHours) || 0),
          cognitiveDemand: actionDraft.cognitiveDemand,
          nextAction: actionDraft.nextAction.trim(),
          status: 'planned',
          completedAt: '',
        },
        ...previous.actionItems,
      ],
    }));
    setActionDraft((current) => ({ ...current, title: '', estimateHours: '1', nextAction: '' }));
  };

  return (
    <div id="system-panel-execute" role="tabpanel" aria-labelledby="system-tab-execute" className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Week {cycleWeek} planning</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Plan for capacity, then choose visible actions</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
          Available time is not all usable time. Declare fixed commitments and recovery first; this leaves a transparent flexible capacity for goals and projects.
        </p>
        <form className="mt-5 grid gap-4 md:grid-cols-3" onSubmit={savePlan}>
          <label className="system-field"><span>Available hours</span><input required min="0" type="number" value={planDraft.availableHours} onChange={(event) => setPlanDraft((current) => ({ ...current, availableHours: event.target.value }))} placeholder="e.g. 70" /></label>
          <label className="system-field"><span>Fixed commitments</span><input required min="0" type="number" value={planDraft.fixedCommitmentHours} onChange={(event) => setPlanDraft((current) => ({ ...current, fixedCommitmentHours: event.target.value }))} placeholder="Academic, work, care" /></label>
          <label className="system-field"><span>Recovery hours</span><input required min="0" type="number" value={planDraft.recoveryHours} onChange={(event) => setPlanDraft((current) => ({ ...current, recoveryHours: event.target.value }))} placeholder="Sleep is not entered here" /></label>
          <label className="system-field"><span>Relationship action</span><input value={planDraft.relationshipAction} onChange={(event) => setPlanDraft((current) => ({ ...current, relationshipAction: event.target.value }))} placeholder="One authentic contact" /></label>
          <label className="system-field"><span>Reflective / spiritual practice</span><input value={planDraft.reflectionPractice} onChange={(event) => setPlanDraft((current) => ({ ...current, reflectionPractice: event.target.value }))} placeholder="Optional, specific practice" /></label>
          <label className="system-field"><span>Explicit trade-off</span><input value={planDraft.explicitTradeoff} onChange={(event) => setPlanDraft((current) => ({ ...current, explicitTradeoff: event.target.value }))} placeholder="What will be reduced or deferred?" /></label>
          <div className="md:col-span-3"><button type="submit" className="btn btn-primary">Save weekly capacity</button></div>
        </form>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-card border border-line bg-panel-strong p-4"><p className="eyebrow">Flexible capacity</p><p className="mt-2 text-2xl font-semibold text-ink">{flexibleHours === null ? '—' : `${flexibleHours.toFixed(1)} h`}</p></div>
          <div className="rounded-card border border-line bg-panel-strong p-4"><p className="eyebrow">Action load</p><p className="mt-2 text-2xl font-semibold text-ink">{plannedHours.toFixed(1)} h</p></div>
          <div className={`rounded-card border p-4 ${flexibleHours !== null && plannedHours > flexibleHours ? 'border-red-500/40 bg-red-500/10' : 'border-line bg-panel-strong'}`}><p className="eyebrow">Capacity check</p><p className="mt-2 text-sm font-semibold text-ink">{flexibleHours === null ? 'Set capacity first' : plannedHours > flexibleHours ? 'Reduce optional commitments' : 'Plan fits stated capacity'}</p></div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5 sm:p-6">
          <p className="eyebrow">Daily execution</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Add the smallest observable next action</h2>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addAction}>
            <label className="system-field sm:col-span-2"><span>Action</span><input required value={actionDraft.title} onChange={(event) => setActionDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What can be completed or moved visibly?" /></label>
            <label className="system-field"><span>Domain</span><select value={actionDraft.domain} onChange={(event) => setActionDraft((current) => ({ ...current, domain: event.target.value as GoalDomain }))}>{goalDomains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
            <label className="system-field"><span>Priority</span><select value={actionDraft.tier} onChange={(event) => setActionDraft((current) => ({ ...current, tier: Number(event.target.value) as PriorityTier }))}><option value={1}>Tier 1 — foundation</option><option value={2}>Tier 2 — strategic</option><option value={3}>Tier 3 — experiment</option></select></label>
            <label className="system-field"><span>Scheduled for</span><input type="date" value={actionDraft.scheduledFor} onChange={(event) => setActionDraft((current) => ({ ...current, scheduledFor: event.target.value }))} /></label>
            <label className="system-field"><span>Estimate (hours)</span><input min="0" step="0.25" type="number" value={actionDraft.estimateHours} onChange={(event) => setActionDraft((current) => ({ ...current, estimateHours: event.target.value }))} /></label>
            <label className="system-field"><span>Cognitive demand</span><select value={actionDraft.cognitiveDemand} onChange={(event) => setActionDraft((current) => ({ ...current, cognitiveDemand: event.target.value as CognitiveDemand }))}>{demands.map((demand) => <option key={demand.value} value={demand.value}>{demand.label}</option>)}</select></label>
            <label className="system-field"><span>Related goal <small>optional</small></span><select value={actionDraft.goalId} onChange={(event) => setActionDraft((current) => ({ ...current, goalId: event.target.value }))}><option value="">No goal link</option>{data.goals.filter((goal) => goal.status === 'active').map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
            <label className="system-field sm:col-span-2"><span>First physical next action</span><input value={actionDraft.nextAction} onChange={(event) => setActionDraft((current) => ({ ...current, nextAction: event.target.value }))} placeholder="Open the repository and write the first failing test." /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Add action</button></div>
          </form>
        </div>
        <aside className="card p-5 sm:p-6">
          <p className="eyebrow">Energy compatibility</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Work can fit the day you actually have</h2>
          <ul className="mt-5 grid gap-3">
            {demands.map((demand) => <li key={demand.value} className="rounded-card border border-line bg-panel-strong p-3"><p className="text-sm font-semibold text-ink">{demand.label}</p><p className="mt-1 text-xs leading-relaxed text-ink-muted">{demand.guidance}</p></li>)}
          </ul>
        </aside>
      </section>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">This week’s commitments</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Actions are evidence, not a guilt ledger</h2>
        {currentActions.length ? (
          <ul className="mt-5 grid gap-3">
            {currentActions.map((action) => (
              <li key={action.id} className="flex flex-col justify-between gap-4 rounded-card border border-line bg-panel-strong p-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap gap-2"><span className="rounded-pill border border-accent/30 bg-accent/10 px-2 py-1 font-mono text-2xs text-accent">Tier {action.tier}</span><span className="rounded-pill border border-line px-2 py-1 font-mono text-2xs text-ink-muted">{action.cognitiveDemand}</span><span className="font-mono text-2xs text-ink-subtle">{action.scheduledFor} · {action.estimateHours} h</span></div>
                  <p className={`mt-2 text-sm font-semibold ${action.status === 'complete' ? 'text-ink-muted line-through' : 'text-ink'}`}>{action.title}</p>
                  {action.nextAction && <p className="mt-1 text-xs leading-relaxed text-ink-muted">Next: {action.nextAction}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2"><button type="button" className="btn btn-secondary px-3 py-2 text-xs" onClick={() => update((previous) => ({ ...previous, actionItems: previous.actionItems.map((item) => item.id === action.id ? { ...item, status: item.status === 'complete' ? 'planned' : 'complete', completedAt: item.status === 'complete' ? '' : new Date().toISOString() } : item) }))}>{action.status === 'complete' ? 'Reopen' : 'Complete'}</button><button type="button" className="btn btn-ghost px-3 py-2 text-xs" onClick={() => update((previous) => ({ ...previous, actionItems: previous.actionItems.map((item) => item.id === action.id ? { ...item, status: 'skipped' } : item) }))}>Skip</button><button type="button" className="btn btn-ghost px-3 py-2 text-xs text-red-600 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, actionItems: previous.actionItems.filter((item) => item.id !== action.id) }))}>Remove</button></div>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-sm leading-relaxed text-ink-muted">No actions have been planned for this week. Add one Tier 1 obligation or one visible project action rather than building a long backlog.</p>}
      </section>
    </div>
  );
}
