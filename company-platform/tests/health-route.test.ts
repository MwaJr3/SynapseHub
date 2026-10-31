/**
 * `GET /api/health`.
 *
 * The route exists so that "did the settings I saved reach the running
 * deployment?" is answerable from a terminal, without signing in. Two properties
 * are tested and both are negative ones:
 *
 * - no secret value is ever in the response, only variable names;
 * - the status code tells the truth — 503 while a required item is missing, 200
 *   once every required item is present.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GET } from '@/app/api/health/route';

const original = { ...process.env };

const COMPLETE: Record<string, string> = {
  DATABASE_URL: 'postgresql://user:pass@db.example.com/app',
  AUTH_SECRET: 'auth-secret-that-must-not-be-printed',
  BREVO_API_KEY: 'xkeysib-a-secret-key-value',
  CONTACT_FROM_EMAIL: 'noreply@example.com',
  STORAGE_PROVIDER: 'postgres',
};

beforeEach(() => {
  process.env = { ...original };
  for (const name of [
    ...Object.keys(COMPLETE),
    'CONTACT_VELAQORI_EMAIL',
    'CONTACT_TAMUZI_EMAIL',
    'S3_BUCKET',
    'S3_REGION',
  ]) {
    delete process.env[name];
  }
});

afterEach(() => {
  process.env = { ...original };
});

async function call() {
  const response = await GET();
  const json = (await response.json()) as {
    ready: boolean;
    blockers: number;
    checks: { id: string; state: string; missing: string[] }[];
  };
  return { response, json, raw: JSON.stringify(json) };
}

describe('GET /api/health', () => {
  it('reports 200 and no blockers once the required settings are present', async () => {
    Object.assign(process.env, COMPLETE);
    const { response, json } = await call();
    expect(response.status).toBe(200);
    expect(json.ready).toBe(true);
    expect(json.blockers).toBe(0);
  });

  it('reports 503 and names the missing variables, not their values', async () => {
    process.env.DATABASE_URL = COMPLETE.DATABASE_URL;
    const { response, json } = await call();
    expect(response.status).toBe(503);
    expect(json.ready).toBe(false);
    const missing = json.checks.flatMap((check) => check.missing);
    expect(missing).toContain('BREVO_API_KEY');
    expect(missing).toContain('AUTH_SECRET');
  });

  it('shows the storage provider switch taking effect', async () => {
    Object.assign(process.env, COMPLETE);
    const postgres = await call();
    expect(postgres.json.checks.find((c) => c.id === 'resume-storage')?.state).toBe('ready');

    process.env.STORAGE_PROVIDER = 'local';
    const local = await call();
    // Local disk on a deployment is a misconfiguration, and it is reported as
    // optional rather than ready so it never reads as "configured correctly".
    expect(local.json.checks.find((c) => c.id === 'resume-storage')?.state).toBe('optional');
  });

  it('never contains a secret value', async () => {
    Object.assign(process.env, COMPLETE);
    const { raw } = await call();
    for (const secret of [
      COMPLETE.BREVO_API_KEY,
      COMPLETE.AUTH_SECRET,
      COMPLETE.DATABASE_URL,
      'user:pass@db.example.com',
    ]) {
      expect(raw).not.toContain(secret);
    }
  });

  it('is never cached', async () => {
    Object.assign(process.env, COMPLETE);
    const { response } = await call();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
