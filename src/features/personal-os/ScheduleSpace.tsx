import { useMemo, useState, type FormEvent } from 'react';
import { scheduleToIcs } from './calendar';
import { goalDomains, today } from './data';
import type { GoalDomain, PersonalSystemData, ScheduleBlock } from './types';
import type { PersonalSystemUpdater } from './ExecutionSpace';

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function downloadIcs(content: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ScheduleSpace({ data, update }: { data: PersonalSystemData; update: PersonalSystemUpdater }) {
  const [date, setDate] = useState(today());
  const [draft, setDraft] = useState({ title: '', startTime: '09:00', endTime: '10:00', domain: 'Projects' as GoalDomain, actionId: '', location: '', notes: '' });
  const blocks = useMemo(
    () => data.scheduleBlocks.filter((block) => block.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [data.scheduleBlocks, date],
  );

  const addBlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || draft.endTime <= draft.startTime) return;
    const next: ScheduleBlock = { id: makeId('block'), date, ...draft, title: draft.title.trim(), location: draft.location.trim(), notes: draft.notes.trim() };
    update((previous) => ({ ...previous, scheduleBlocks: [...previous.scheduleBlocks, next] }));
    setDraft((current) => ({ ...current, title: '', location: '', notes: '' }));
  };

  return (
    <div id="system-panel-schedule" role="tabpanel" aria-labelledby="system-tab-schedule" className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Time-block scheduler</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Protect the work before the week fills itself</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">This is a local schedule, not a live external calendar connection. Export a standard ICS file to import selected blocks into a calendar you control; no account credentials or calendar data leave the browser.</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="system-field w-full max-w-[220px]"><span>Schedule date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <button type="button" className="btn btn-secondary" onClick={() => downloadIcs(scheduleToIcs(data.scheduleBlocks), `personal-os-schedule-${today()}.ics`)}>Export calendar (.ics)</button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="card p-5 sm:p-6">
          <p className="eyebrow">New time block</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Allocate a real place for an action</h2>
          <form className="mt-5 grid gap-3 sm:grid-cols-2" onSubmit={addBlock}>
            <label className="system-field sm:col-span-2"><span>Title</span><input required value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Deep work: project milestone" /></label>
            <label className="system-field"><span>Start</span><input required type="time" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} /></label>
            <label className="system-field"><span>End</span><input required type="time" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} /></label>
            <label className="system-field"><span>Domain</span><select value={draft.domain} onChange={(event) => setDraft((current) => ({ ...current, domain: event.target.value as GoalDomain }))}>{goalDomains.map((domain) => <option key={domain}>{domain}</option>)}</select></label>
            <label className="system-field"><span>Related action <small>optional</small></span><select value={draft.actionId} onChange={(event) => setDraft((current) => ({ ...current, actionId: event.target.value }))}><option value="">No action link</option>{data.actionItems.map((action) => <option key={action.id} value={action.id}>{action.title}</option>)}</select></label>
            <label className="system-field"><span>Location <small>optional</small></span><input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} /></label>
            <label className="system-field"><span>Note <small>optional</small></span><input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
            <div className="sm:col-span-2"><button type="submit" className="btn btn-primary">Reserve block</button></div>
          </form>
        </section>

        <section className="card p-5 sm:p-6">
          <p className="eyebrow">{date}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Daily timeline</h2>
          {blocks.length ? <ol className="mt-5 grid gap-3">{blocks.map((block) => <li key={block.id} className="flex gap-4 rounded-card border border-line bg-panel-strong p-4"><time className="w-24 shrink-0 font-mono text-xs text-accent">{block.startTime}<br />{block.endTime}</time><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-ink">{block.title}</p><p className="mt-1 text-xs text-ink-muted">{block.domain}{block.location ? ` · ${block.location}` : ''}</p>{block.notes && <p className="mt-2 text-xs leading-relaxed text-ink-muted">{block.notes}</p>}</div><button type="button" className="text-xs font-medium text-red-600 underline underline-offset-4 dark:text-red-300" onClick={() => update((previous) => ({ ...previous, scheduleBlocks: previous.scheduleBlocks.filter((item) => item.id !== block.id) }))}>Remove</button></li>)}</ol> : <p className="mt-4 text-sm leading-relaxed text-ink-muted">No blocks for this date. Reserve only the work that benefits from a real boundary; this is not a requirement to schedule every minute.</p>}
        </section>
      </div>
    </div>
  );
}
