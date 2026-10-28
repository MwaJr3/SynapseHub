import { describe, expect, it } from 'vitest';
import {
  captureItem,
  decodeWorkspace,
  emptyWorkspace,
  persistWorkspace,
  STORAGE_KEY,
  updateItem,
} from './workspace';
import type { Capture } from './workspace';
const input = (overrides: Partial<Capture> = {}): Capture => ({
  kind: 'source',
  title: 'Circuit theory',
  body: 'Original excerpt',
  url: 'https://example.org/paper',
  origin: '',
  due: '',
  priority: 'normal',
  ...overrides,
});
describe('SynapseHub knowledge workspace', () => {
  it('creates source → note → task relationships with backlinks derivable from IDs', () => {
    let state = captureItem(emptyWorkspace(), input());
    const source = state.items[0]!;
    state = captureItem(
      state,
      input({ kind: 'note', title: 'My interpretation', origin: source.id }),
    );
    const note = state.items[1]!;
    state = captureItem(
      state,
      input({
        kind: 'task',
        title: 'Investigate',
        origin: note.id,
        due: '2026-10-30',
      }),
    );
    expect(state.relations).toEqual([
      { from: note.id, to: source.id, type: 'derived-from' },
      { from: state.items[2]!.id, to: note.id, type: 'derived-from' },
    ]);
    expect(decodeWorkspace(JSON.stringify(state))).toEqual(state);
  });
  it('persists edits and completion without breaking relationships', () => {
    let state = captureItem(emptyWorkspace(), input({ kind: 'task' }));
    const task = state.items[0]!;
    if (task.kind !== 'task') throw new Error('fixture');
    state = persistWorkspace(emptyWorkspace(), state);
    state = persistWorkspace(
      state,
      updateItem(state, { ...task, title: 'Renamed task', completed: true }),
    );
    expect(decodeWorkspace(localStorage.getItem(STORAGE_KEY))).toEqual(state);
    expect(state.items[0]).toMatchObject({
      title: 'Renamed task',
      completed: true,
    });
  });
  it('rejects missing origins, blank titles, impossible dates and unsafe links', () => {
    for (const change of [
      { origin: 'missing' },
      { title: '  ' },
      { url: 'javascript:alert(1)' },
      { kind: 'task' as const, due: '2026-02-30' },
    ])
      expect(() => captureItem(emptyWorkspace(), input(change))).toThrow();
  });
  it('rejects dangling relationships and unsupported schema versions', () => {
    expect(() =>
      decodeWorkspace(JSON.stringify({ ...emptyWorkspace(), version: 2 })),
    ).toThrow();
    expect(() =>
      decodeWorkspace(
        JSON.stringify({
          ...emptyWorkspace(),
          relations: [{ from: 'a', to: 'b', type: 'derived-from' }],
        }),
      ),
    ).toThrow();
  });
  it('preserves corrupt storage and blocks stale writes from another tab', () => {
    const previous = emptyWorkspace();
    persistWorkspace(previous, captureItem(previous, input()));
    const before = localStorage.getItem(STORAGE_KEY);
    expect(() =>
      persistWorkspace(previous, captureItem(previous, input())),
    ).toThrow(/another tab/);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
    localStorage.setItem(STORAGE_KEY, 'broken json');
    expect(() => persistWorkspace(previous, previous)).toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken json');
  });
  it('propagates quota failures without modifying the previous state', () => {
    const previous = emptyWorkspace();
    expect(() =>
      persistWorkspace(previous, captureItem(previous, input()), {
        getItem: () => null,
        setItem: () => {
          throw new Error('Quota exceeded');
        },
      }),
    ).toThrow('Quota exceeded');
    expect(previous.items).toEqual([]);
  });
});
