import type {
  ItemKind,
  Item,
  Workspace,
} from '../../../packages/synapse-client/types';
export type {
  ItemKind,
  Item,
  Workspace,
  Task,
  Note,
  Source,
  Relation,
} from '../../../packages/synapse-client/types';
export const STORAGE_KEY = 'synapsehub.workspace.v1';
export const emptyWorkspace = (): Workspace => ({
  version: 1,
  revision: 0,
  items: [],
  relations: [],
});
export interface Capture {
  kind: ItemKind;
  title: string;
  body: string;
  url: string;
  due: string;
  priority: 'normal' | 'high';
  origin: string;
}
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null;
const validDate = (v: string) =>
  v === '' ||
  (/^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(v).toISOString().slice(0, 10) === v);
export function safeUrl(value: string): boolean {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export function decodeWorkspace(raw: string | null): Workspace {
  if (raw === null) return emptyWorkspace();
  const v: unknown = JSON.parse(raw);
  if (
    !isRecord(v) ||
    v.version !== 1 ||
    !Number.isSafeInteger(v.revision) ||
    Number(v.revision) < 0 ||
    !Array.isArray(v.items) ||
    !Array.isArray(v.relations)
  )
    throw new Error(
      'Unsupported workspace format. Stored data has not been changed.',
    );
  const ids = new Set<string>();
  for (const item of v.items) {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.title !== 'string' ||
      !item.title.trim() ||
      typeof item.body !== 'string' ||
      typeof item.createdAt !== 'string' ||
      Number.isNaN(Date.parse(item.createdAt))
    )
      throw new Error(
        'Invalid workspace record. Stored data has not been changed.',
      );
    ids.add(item.id);
    if (item.kind === 'task') {
      if (
        typeof item.completed !== 'boolean' ||
        !['normal', 'high'].includes(String(item.priority)) ||
        typeof item.due !== 'string' ||
        !validDate(item.due)
      )
        throw new Error('Invalid task.');
    } else if (item.kind === 'source') {
      if (
        typeof item.url !== 'string' ||
        (item.url !== '' && !safeUrl(item.url))
      )
        throw new Error('Invalid source URL.');
    } else if (item.kind !== 'note') throw new Error('Unknown record type.');
  }
  const edges = new Set<string>();
  for (const r of v.relations) {
    if (
      !isRecord(r) ||
      typeof r.from !== 'string' ||
      typeof r.to !== 'string' ||
      r.from === r.to ||
      !ids.has(r.from) ||
      !ids.has(r.to) ||
      r.type !== 'derived-from' ||
      edges.has(`${r.from}:${r.to}`)
    )
      throw new Error('Invalid knowledge relationship.');
    edges.add(`${r.from}:${r.to}`);
  }
  return v as unknown as Workspace;
}
export function captureItem(state: Workspace, input: Capture): Workspace {
  const title = input.title.trim();
  if (!title || title.length > 200 || input.body.length > 50000)
    throw new Error(
      'Enter a title (up to 200 characters) and content up to 50,000 characters.',
    );
  if (input.origin && !state.items.some((i) => i.id === input.origin))
    throw new Error('The linked item no longer exists.');
  if (input.kind === 'source' && input.url && !safeUrl(input.url))
    throw new Error('Use a complete http or https URL.');
  if (input.kind === 'task' && !validDate(input.due))
    throw new Error('Choose a valid due date.');
  const base = {
    id: crypto.randomUUID(),
    title,
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
  };
  let item: Item;
  if (input.kind === 'task')
    item = {
      ...base,
      kind: 'task',
      completed: false,
      priority: input.priority,
      due: input.due,
    };
  else if (input.kind === 'source')
    item = { ...base, kind: 'source', url: input.url.trim() };
  else item = { ...base, kind: 'note' };
  return {
    ...state,
    items: [...state.items, item],
    relations: input.origin
      ? [
          ...state.relations,
          { from: item.id, to: input.origin, type: 'derived-from' },
        ]
      : state.relations,
  };
}
export function updateItem(state: Workspace, item: Item): Workspace {
  if (!state.items.some((i) => i.id === item.id && i.kind === item.kind))
    throw new Error('Record not found.');
  const next = {
    ...state,
    items: state.items.map((i) => (i.id === item.id ? item : i)),
  };
  return decodeWorkspace(JSON.stringify(next));
}
/** Write before updating the UI; reject stale tabs and preserve the previous snapshot on failure. */
export function persistWorkspace(
  previous: Workspace,
  next: Workspace,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  key: string = STORAGE_KEY,
): Workspace {
  const current = decodeWorkspace(storage.getItem(key));
  if (current.revision !== previous.revision)
    throw new Error(
      'This workspace changed in another tab. Reload before saving to avoid overwriting changes.',
    );
  const saved = decodeWorkspace(
    JSON.stringify({ ...next, revision: previous.revision + 1 }),
  );
  storage.setItem(key, JSON.stringify(saved));
  return saved;
}
