import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const pools = vi.hoisted(() => [] as EventEmitter[]);
vi.mock('pg', async () => {
  const { EventEmitter } = await import('node:events');
  return { Pool: class extends EventEmitter {
    constructor() { super(); pools.push(this); }
  } };
});
import { database } from '../lib/db';

describe('PostgreSQL connection resilience', () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete globalThis.__contextvaultDb;
    vi.restoreAllMocks();
    pools.length = 0;
  });

  it('handles an idle pool disconnect without crashing or logging connection details', async () => {
    process.env.DATABASE_URL = 'postgresql://private-user:private-password@database/example';
    delete globalThis.__contextvaultDb;
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await database();
    expect(pools).toHaveLength(1);
    expect(() => pools[0].emit('error', new Error('private-password'))).not.toThrow();
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toContain('private-password');
  });
});
