import { useState, type FormEvent } from 'react';
import { today } from './data';
import { createCycleArchive } from './system';
import type { PersonalSystemData } from './types';
import type { PersonalSystemUpdater } from './ExecutionSpace';

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function ReflectionRecords({
  data,
  update,
}: {
  data: PersonalSystemData;
  update: PersonalSystemUpdater;
}) {
  const [meaning, setMeaning] = useState({ activity: '', goalId: '', value: '', visionConnection: '', expectedContribution: '', reflection: '' });
  const [pattern, setPattern] = useState({ blocker: '', category: 'Mental and cognitive', trigger: '', earlyWarningSigns: '', defaultBehaviour: '', consequence: '', intervention: '', recoveryAction: '' });
  const [blocker, setBlocker] = useState({ blockerId: '', actionId: '', intensity: 3, trigger: '', behaviour: '', intervention: '', result: '', resolved: false });

  const addMeaning = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!meaning.activity.trim() || !meaning.visionConnection.trim()) return;
    update((previous) => ({
      ...previous,
      meaningEntries: [{ id: makeId('meaning'), date: today(), ...meaning, activity: meaning.activity.trim(), value: meaning.value.trim(), visionConnection: meaning.visionConnection.trim(), expectedContribution: meaning.expectedContribution.trim(), reflection: meaning.reflection.trim() }, ...previous.meaningEntries],
    }));
    setMeaning({ activity: '', goalId: '', value: '', visionConnection: '', expectedContribution: '', reflection: '' });
  };

  const addPattern = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pattern.blocker.trim() || !pattern.intervention.trim()) return;
    update((previous) => ({
      ...previous,
      blockerPatterns: [{ id: makeId('pattern'), ...pattern, blocker: pattern.blocker.trim(), category: pattern.category.trim(), trigger: pattern.trigger.trim(), earlyWarningSigns: pattern.earlyWarningSigns.trim(), defaultBehaviour: pattern.defaultBehaviour.trim(), consequence: pattern.consequence.trim(), intervention: pattern.intervention.trim(), recoveryAction: pattern.recoveryAction.trim() }, ...previous.blockerPatterns],
    }));
    setPattern({ blocker: '', category: 'Mental and cognitive', trigger: '', earlyWarningSigns: '', defaultBehaviour: '', consequence: '', intervention: '', recoveryAction: '' });
  };

  const addBlocker = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!blocker.blockerId && !blocker.trigger.trim()) return;
    const selected = data.blockerPatterns.find((item) => item.id === blocker.blockerId);
    update((previous) => ({
      ...previous,
      blockerLogs: [{
        id: makeId('blocker-log'),
        date: new Date().toISOString(),
        blockerId: blocker.blockerId,
        actionId: blocker.actionId,
        intensity: blocker.intensity,
        trigger: blocker.trigger.trim() || selected?.trigger || '',
        behaviour: blocker.behaviour.trim() || selected?.defaultBehaviour || '',
        intervention: blocker.intervention.trim() || selected?.intervention || '',
        interventionCompleted: false,
        result: blocker.result.trim(),
        resolved: blocker.resolved,
      }, ...previous.blockerLogs],
    }));
    setBlocker({ blockerId: '', actionId: '', intensity: 3, trigger: '', behaviour: '', intervention: '', result: '', resolved: false });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <p className="eyebrow">Meaning bridge</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Make the link between work and purpose explicit</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">Use this when an ordinary obligation needs a truthful connection to a goal, value, or contribution. If no honest connection exists, that is useful evidence for a future trade-off.</p>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addMeaning}>
            <label className="system-field sm:col-span-2"><span>Important action</span><input required value={meaning.activity} onChange={(event) => setMeaning((current) => ({ ...current, activity: event.target.value }))} placeholder="Complete an engineering problem set" /></label>
            <label className="system-field"><span>Related goal <small>optional</small></span><select value={meaning.goalId} onChange={(event) => setMeaning((current) => ({ ...current, goalId: event.target.value }))}><option value="">No direct goal link</option>{data.goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select></label>
            <label className="system-field"><span>Underlying value</span><input value={meaning.value} onChange={(event) => setMeaning((current) => ({ ...current, value: event.target.value }))} placeholder="Mastery, care, freedom…" /></label>
            <label className="system-field sm:col-span-2"><span>Connection to long-term vision</span><textarea required rows={2} value={meaning.visionConnection} onChange={(event) => setMeaning((current) => ({ ...current, visionConnection: event.target.value }))} placeholder="What capability, relationship, or freedom does this support?" /></label>
            <label className="system-field"><span>Expected contribution</span><input value={meaning.expectedContribution} onChange={(event) => setMeaning((current) => ({ ...current, expectedContribution: event.target.value }))} /></label>
            <label className="system-field"><span>Reflection <small>optional</small></span><input value={meaning.reflection} onChange={(event) => setMeaning((current) => ({ ...current, reflection: event.target.value }))} placeholder="Did it remain meaningful?" /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Add meaning entry</button></div>
          </form>
          {data.meaningEntries.length > 0 && <ul className="mt-5 grid gap-2 border-t border-line pt-5">{data.meaningEntries.slice(0, 3).map((entry) => <li key={entry.id} className="rounded-card border border-line bg-panel-strong p-3"><p className="text-sm font-semibold text-ink">{entry.activity}</p><p className="mt-1 text-xs leading-relaxed text-ink-muted">{entry.visionConnection}</p></li>)}</ul>}
        </section>

        <section className="card p-5 sm:p-6">
          <p className="eyebrow">Blocker occurrence</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Observe the sequence, then choose a response</h2>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addBlocker}>
            <label className="system-field sm:col-span-2"><span>Response map <small>optional if you describe the trigger below</small></span><select value={blocker.blockerId} onChange={(event) => setBlocker((current) => ({ ...current, blockerId: event.target.value }))}><option value="">Choose a known pattern</option>{data.blockerPatterns.map((item) => <option key={item.id} value={item.id}>{item.blocker}</option>)}</select></label>
            <label className="system-field"><span>Intensity</span><select value={blocker.intensity} onChange={(event) => setBlocker((current) => ({ ...current, intensity: Number(event.target.value) }))}>{[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level} / 5</option>)}</select></label>
            <label className="system-field"><span>Related action <small>optional</small></span><select value={blocker.actionId} onChange={(event) => setBlocker((current) => ({ ...current, actionId: event.target.value }))}><option value="">No action link</option>{data.actionItems.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="system-field sm:col-span-2"><span>Trigger</span><input value={blocker.trigger} onChange={(event) => setBlocker((current) => ({ ...current, trigger: event.target.value }))} placeholder="What condition appeared just before the blocker?" /></label>
            <label className="system-field"><span>What happened next?</span><textarea rows={2} value={blocker.behaviour} onChange={(event) => setBlocker((current) => ({ ...current, behaviour: event.target.value }))} /></label>
            <label className="system-field"><span>Intervention attempted</span><textarea rows={2} value={blocker.intervention} onChange={(event) => setBlocker((current) => ({ ...current, intervention: event.target.value }))} /></label>
            <label className="system-field sm:col-span-2"><span>Immediate result <small>optional</small></span><input value={blocker.result} onChange={(event) => setBlocker((current) => ({ ...current, result: event.target.value }))} /></label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink"><input type="checkbox" checked={blocker.resolved} onChange={(event) => setBlocker((current) => ({ ...current, resolved: event.target.checked }))} /> Resolved now</label>
            <div className="flex items-end"><button type="submit" className="btn btn-primary">Log blocker</button></div>
          </form>
          {data.blockerLogs.length > 0 && <ul className="mt-5 grid gap-2 border-t border-line pt-5">{data.blockerLogs.slice(0, 3).map((entry) => <li key={entry.id} className="flex justify-between gap-3 rounded-card border border-line bg-panel-strong p-3"><div><p className="text-sm font-semibold text-ink">{entry.trigger || 'Blocker occurrence'}</p><p className="mt-1 text-xs text-ink-muted">Intensity {entry.intensity} / 5 · {entry.intervention || 'No intervention recorded'}</p></div><button type="button" className="text-xs font-medium text-accent underline underline-offset-4" onClick={() => update((previous) => ({ ...previous, blockerLogs: previous.blockerLogs.map((item) => item.id === entry.id ? { ...item, resolved: !item.resolved, interventionCompleted: !item.interventionCompleted } : item) }))}>{entry.resolved ? 'Reopen' : 'Resolve'}</button></li>)}</ul>}
        </section>
      </div>

      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Response-map library</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Name the early warning before it becomes the default behaviour</h2>
        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={addPattern}>
          <label className="system-field"><span>Blocker name</span><input required value={pattern.blocker} onChange={(event) => setPattern((current) => ({ ...current, blocker: event.target.value }))} placeholder="Analysis paralysis" /></label>
          <label className="system-field"><span>Category</span><select value={pattern.category} onChange={(event) => setPattern((current) => ({ ...current, category: event.target.value }))}><option>Spiritual and existential</option><option>Physical and health-related</option><option>Emotional and psychological</option><option>Mental and cognitive</option><option>Social and relationship-related</option><option>Practical and environmental</option><option>Financial, business, or strategic</option><option>Other</option></select></label>
          <label className="system-field"><span>Trigger</span><input value={pattern.trigger} onChange={(event) => setPattern((current) => ({ ...current, trigger: event.target.value }))} /></label>
          <label className="system-field"><span>Early warning signs</span><input value={pattern.earlyWarningSigns} onChange={(event) => setPattern((current) => ({ ...current, earlyWarningSigns: event.target.value }))} /></label>
          <label className="system-field"><span>Default behaviour</span><input value={pattern.defaultBehaviour} onChange={(event) => setPattern((current) => ({ ...current, defaultBehaviour: event.target.value }))} /></label>
          <label className="system-field"><span>Likely consequence</span><input value={pattern.consequence} onChange={(event) => setPattern((current) => ({ ...current, consequence: event.target.value }))} /></label>
          <label className="system-field"><span>Primary intervention</span><input required value={pattern.intervention} onChange={(event) => setPattern((current) => ({ ...current, intervention: event.target.value }))} placeholder="Use the 3-minute timer and one physical action" /></label>
          <label className="system-field"><span>Recovery action</span><input value={pattern.recoveryAction} onChange={(event) => setPattern((current) => ({ ...current, recoveryAction: event.target.value }))} /></label>
          <div className="md:col-span-2"><button type="submit" className="btn btn-secondary">Add response map</button></div>
        </form>
      </section>
    </div>
  );
}

export function CycleCompletion({
  data,
  update,
  cycleWeek,
}: {
  data: PersonalSystemData;
  update: PersonalSystemUpdater;
  cycleWeek: number;
}) {
  const [retrospective, setRetrospective] = useState({ intended: '', achieved: '', leverage: '', recurringBlockers: '', stop: '', nextEmphasis: '' });
  const [nextCycle, setNextCycle] = useState({ name: 'New 90-day cycle', theme: '' });
  const canComplete = cycleWeek >= 12;

  const complete = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canComplete) return;
    update((previous) => ({
      ...previous,
      cycleArchives: [createCycleArchive(previous, retrospective, makeId('cycle')), ...previous.cycleArchives],
      cycleStart: today(),
      cycleName: nextCycle.name.trim() || 'New 90-day cycle',
      cycleTheme: nextCycle.theme.trim(),
    }));
  };

  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Cycle lifecycle</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Archive evidence, then begin the next experiment</h2>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted" id="retrospective-hint">{canComplete ? 'Week 12 is active. Saving this retrospective freezes a copy of this cycle’s goals, projects, actions, reviews, meanings, blocker logs, and energy records before starting a new cycle.' : `This completion flow unlocks in week 12. You are currently in week ${cycleWeek}; the archive remains available when the cycle is ready.`}</p>
      <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={complete}>
        <label className="system-field"><span>What did you intend?</span><textarea required disabled={!canComplete} rows={2} value={retrospective.intended} onChange={(event) => setRetrospective((current) => ({ ...current, intended: event.target.value }))} /></label>
        <label className="system-field"><span>What did you actually achieve?</span><textarea required disabled={!canComplete} rows={2} value={retrospective.achieved} onChange={(event) => setRetrospective((current) => ({ ...current, achieved: event.target.value }))} /></label>
        <label className="system-field"><span>Highest-leverage actions</span><textarea disabled={!canComplete} rows={2} value={retrospective.leverage} onChange={(event) => setRetrospective((current) => ({ ...current, leverage: event.target.value }))} /></label>
        <label className="system-field"><span>Repeated blockers</span><textarea disabled={!canComplete} rows={2} value={retrospective.recurringBlockers} onChange={(event) => setRetrospective((current) => ({ ...current, recurringBlockers: event.target.value }))} /></label>
        <label className="system-field"><span>What should stop?</span><textarea disabled={!canComplete} rows={2} value={retrospective.stop} onChange={(event) => setRetrospective((current) => ({ ...current, stop: event.target.value }))} /></label>
        <label className="system-field"><span>Next-cycle emphasis</span><textarea disabled={!canComplete} rows={2} value={retrospective.nextEmphasis} onChange={(event) => setRetrospective((current) => ({ ...current, nextEmphasis: event.target.value }))} /></label>
        <label className="system-field"><span>Next cycle name</span><input disabled={!canComplete} value={nextCycle.name} onChange={(event) => setNextCycle((current) => ({ ...current, name: event.target.value }))} /></label>
        <label className="system-field"><span>Next cycle theme</span><input disabled={!canComplete} value={nextCycle.theme} onChange={(event) => setNextCycle((current) => ({ ...current, theme: event.target.value }))} /></label>
        <div className="md:col-span-2"><button type="submit" className="btn btn-primary" aria-describedby="retrospective-hint" disabled={!canComplete}>Archive cycle &amp; begin next</button></div>
      </form>
      {data.cycleArchives.length > 0 && <details className="mt-6 border-t border-line pt-5"><summary className="cursor-pointer text-sm font-medium text-ink">View {data.cycleArchives.length} archived cycle{data.cycleArchives.length === 1 ? '' : 's'}</summary><ul className="mt-4 grid gap-3">{data.cycleArchives.map((archive) => <li key={archive.id} className="rounded-card border border-line bg-panel-strong p-4"><p className="font-mono text-2xs uppercase tracking-[0.1em] text-accent">{archive.cycleStart} → {archive.cycleEnd}</p><p className="mt-1 text-sm font-semibold text-ink">{archive.name}</p><p className="mt-1 text-sm text-ink-muted">{archive.retrospective.achieved || 'No achievement note recorded.'}</p></li>)}</ul></details>}
    </section>
  );
}
