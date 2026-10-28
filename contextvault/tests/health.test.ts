import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/db', () => ({ database: vi.fn() }));
import { database } from '../lib/db';
import { GET as liveness } from '../app/api/health/live/route';
import { GET as readiness } from '../app/api/health/ready/route';

describe('operational health endpoints', () => {
  beforeEach(() => vi.resetAllMocks());

  it('reports liveness without requiring a database connection', async () => {
    const response = await liveness();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'live' });
    expect(database).not.toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('reports readiness only after the database schema is available', async () => {
    vi.mocked(database).mockResolvedValue({ query: vi.fn().mockResolvedValue({ rows: [{ ready: true }] }) } as never);
    const response = await readiness();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready' });
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('returns a generic 503 for an unavailable or unmigrated database', async () => {
    vi.mocked(database).mockRejectedValueOnce(new Error('sensitive database URL'));
    const unavailable = await readiness();
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toContain('sensitive');

    vi.mocked(database).mockResolvedValueOnce({ query: vi.fn().mockResolvedValue({ rows: [{ ready: false }] }) } as never);
    const unmigrated = await readiness();
    expect(unmigrated.status).toBe(503);
    expect(await unmigrated.json()).toEqual({ status: 'not ready' });
  });
});
