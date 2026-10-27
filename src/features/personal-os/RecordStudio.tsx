import { useEffect, useMemo, useState } from 'react';
import { restoreAuditEvent } from './system';
import type { AuditEvent, PersonalSystemData } from './types';
import type { PersonalSystemUpdater } from './ExecutionSpace';

type CollectionKey = Exclude<keyof PersonalSystemData, 'version' | 'cycleStart' | 'cycleName' | 'cycleTheme' | 'updatedAt' | 'history' | 'identity'> | 'identity';

const collections: { key: CollectionKey; label: string }[] = [
  { key: 'identity', label: 'Identity and values' },
  { key: 'goals', label: 'Goals' }, { key: 'projects', label: 'Projects' },
  { key: 'decisions', label: 'Decisions' }, { key: 'energyLogs', label: 'Energy logs' },
  { key: 'actionItems', label: 'Actions' }, { key: 'scheduleBlocks', label: 'Schedule blocks' },
  { key: 'weeklyPlans', label: 'Weekly plans' }, { key: 'meaningEntries', label: 'Meaning entries' },
  { key: 'blockerPatterns', label: 'Blocker response maps' }, { key: 'blockerLogs', label: 'Blocker occurrences' },
  { key: 'failures', label: 'Post-mortems' }, { key: 'weeklyReviews', label: 'Weekly reviews' },
  { key: 'doctrines', label: 'Personal doctrine' }, { key: 'learningPaths', label: 'Learning paths' },
  { key: 'relationships', label: 'Relationships' }, { key: 'financialEntries', label: 'Financial entries' },
  { key: 'cycleArchives', label: 'Cycle archives' },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function getRecords(data: PersonalSystemData, collection: CollectionKey): Array<Record<string, unknown>> {
  if (collection === 'identity') return [{ id: 'identity', ...data.identity }];
  return (data[collection] as unknown as Array<Record<string, unknown>>).map((record) => record);
}

function displayLabel(record: Record<string, unknown>): string {
  return String(record.title ?? record.name ?? record.skill ?? record.displayName ?? record.activity ?? record.id ?? 'Untitled record');
}

export function RecordStudio({ data, update }: { data: PersonalSystemData; update: PersonalSystemUpdater }) {
  const [collection, setCollection] = useState<CollectionKey>('goals');
  const records = useMemo(() => getRecords(data, collection), [collection, data]);
  const [recordId, setRecordId] = useState('');
  const selected = records.find((record) => record.id === recordId) ?? records[0];
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setRecordId(selected ? String(selected.id) : '');
    setDraft(selected ? JSON.stringify(selected, null, 2) : '');
    setError('');
  }, [collection, selected]);

  const save = () => {
    try {
      const parsed: unknown = JSON.parse(draft);
      if (!isRecord(parsed)) throw new Error('The record must be a JSON object.');
      if (collection !== 'identity' && typeof parsed.id !== 'string') throw new Error('Every record needs a string id.');
      update((previous) => {
        if (collection === 'identity') {
          const { id: _id, ...identity } = parsed;
          return { ...previous, identity: identity as unknown as PersonalSystemData['identity'] };
        }
        const existing = previous[collection] as unknown as Array<Record<string, unknown>>;
        const hasExisting = existing.some((record) => record.id === parsed.id);
        return { ...previous, [collection]: hasExisting ? existing.map((record) => record.id === parsed.id ? parsed : record) : [parsed, ...existing] } as PersonalSystemData;
      });
      setError('Saved. A previous version is available in history.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not parse this record.');
    }
  };

  const create = () => {
    const record = { id: makeId(collection), title: 'New record' };
    setRecordId(String(record.id));
    setDraft(JSON.stringify(record, null, 2));
    setError('Edit the fields, then save. Existing structured forms remain the fastest way to add common records.');
  };

  const remove = () => {
    if (!selected || collection === 'identity') return;
    if (!window.confirm(`Remove “${displayLabel(selected)}”? Its last version will remain available in history.`)) return;
    update((previous) => ({ ...previous, [collection]: (previous[collection] as unknown as Array<Record<string, unknown>>).filter((record) => record.id !== selected.id) } as PersonalSystemData));
    setRecordId('');
  };

  return (
    <div id="system-panel-records" role="tabpanel" aria-labelledby="system-tab-records" className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <p className="eyebrow">Complete record editor</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Edit every persisted record without losing its previous version</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">The guided forms cover frequent actions. This advanced editor exposes every persisted collection, including archives and schedules, for correction and recovery. Records are validated as JSON objects; saved prior values stay in local history.</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[240px_260px_1fr]">
          <label className="system-field"><span>Collection</span><select value={collection} onChange={(event) => setCollection(event.target.value as CollectionKey)}>{collections.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
          <label className="system-field"><span>Record</span><select value={recordId} onChange={(event) => setRecordId(event.target.value)}><option value="">Select a record</option>{records.map((record) => <option key={String(record.id)} value={String(record.id)}>{displayLabel(record)}</option>)}</select></label>
          <div className="flex flex-wrap items-end gap-2"><button type="button" className="btn btn-secondary" onClick={create}>New record</button>{collection !== 'identity' && selected && <button type="button" className="btn btn-ghost text-red-700 dark:text-red-300" onClick={remove}>Remove record</button>}</div>
        </div>
        <label className="system-field mt-5"><span>Record JSON</span><textarea rows={18} className="font-mono text-xs" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Select a record or create one." /></label>
        <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" className="btn btn-primary" onClick={save}>Save record</button>{error && <p role="status" className="text-sm text-ink-muted">{error}</p>}</div>
      </section>

      <HistoryPanel history={data.history} update={update} />
    </div>
  );
}

function HistoryPanel({ history, update }: { history: AuditEvent[]; update: PersonalSystemUpdater }) {
  return (
    <section className="card p-5 sm:p-6">
      <p className="eyebrow">Record history</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">Restore a prior version deliberately</h2>
      {history.length ? <ol className="mt-5 grid gap-3">{history.slice(0, 30).map((event) => <li key={event.id} className="flex flex-col justify-between gap-3 rounded-card border border-line bg-panel-strong p-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-ink">{event.label}</p><p className="mt-1 font-mono text-2xs uppercase tracking-[0.08em] text-ink-subtle">{event.action} · {event.collection} · {new Date(event.at).toLocaleString()}</p></div><button type="button" className="btn btn-secondary px-3 py-2 text-xs" disabled={event.before === null} onClick={() => update((previous) => restoreAuditEvent(previous, event), { restored: true })}>{event.before === null ? 'No earlier version' : 'Restore prior version'}</button></li>)}</ol> : <p className="mt-4 text-sm leading-relaxed text-ink-muted">History starts when you create, update, or remove a record. It is kept locally and capped at the 300 newest events to avoid turning the audit trail into a second data store.</p>}
    </section>
  );
}
