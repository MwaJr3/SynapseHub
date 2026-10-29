/**
 * A missing `DATABASE_URL` in production must fail as itself, not as a crash.
 *
 * The embedded PGlite fallback exists for a laptop. In a deployed function its data
 * directory is ephemeral, so silently falling back produces a site that looks
 * configured, serves nothing, and loses every write — which is exactly what the
 * first deployment did. This pins the guard that turns that into one readable error.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

/**
 * `process.env` types `NODE_ENV` as readonly; the guard under test reads it, and a
 * test is the one place that has to change it.
 */
function setEnv(key: string, value: string): void {
  (process.env as Record<string, string>)[key] = value;
}

/**
 * `getDb` memoises the connection on `globalThis` so a hot reload does not open a
 * second pool. `vi.resetModules()` does not touch that, so the test clears it —
 * otherwise it would assert against the connection `tests/setup.ts` already made.
 */
function forgetCachedConnection(): void {
  const globals = globalThis as unknown as {
    __platformDb?: unknown;
    __platformPglite?: unknown;
  };
  delete globals.__platformDb;
  delete globals.__platformPglite;
}

beforeEach(() => {
  vi.resetModules();
  forgetCachedConnection();
  delete process.env.DATABASE_URL;
  delete process.env.PGLITE_DATA_DIR;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('database configuration', () => {
  it('refuses to fall back to embedded PGlite in a deployed runtime', async () => {
    setEnv('NODE_ENV', 'production');
    process.env.VERCEL_ENV = 'production';

    const { getDb, DatabaseNotConfiguredError } = await import('@/lib/db');

    expect(() => getDb()).toThrow(DatabaseNotConfiguredError);
    // The message has to say what to set; an operator reads it in the function log.
    expect(() => getDb()).toThrow(/DATABASE_URL is not set/);
  });

  it('still allows the embedded fallback while a production build is running', async () => {
    // `next build` runs with NODE_ENV=production and must not need a database —
    // every page is dynamic, so nothing is read at build time. Throwing here would
    // break the build that deploys the fix.
    setEnv('NODE_ENV', 'production');
    process.env.NEXT_PHASE = 'phase-production-build';
    process.env.PGLITE_DATA_DIR = `${process.env.TMPDIR ?? '/tmp'}/company-platform-build-guard`;

    const { getDb } = await import('@/lib/db');

    expect(() => getDb()).not.toThrow();
    // Leave nothing open behind us; the next file gets its own process.
    forgetCachedConnection();
  });

  // The first deployment failed every build with SELF_SIGNED_CERT_IN_CHAIN: the
  // pooler's chain is rooted in a certificate Node does not trust. These pin the
  // decision so it cannot be "tidied" back into a verifying default by accident.
  it('encrypts a remote connection without demanding a trusted chain', async () => {
    const { sslFor } = await import('@/lib/db');

    expect(sslFor('postgresql://user:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres')).toEqual({
      rejectUnauthorized: false,
    });
    expect(sslFor('postgresql://user:pass@db.example.com/app?sslmode=require')).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('verifies the chain when the URL asks for it', async () => {
    const { sslFor } = await import('@/lib/db');

    expect(sslFor('postgresql://user:pass@db.example.com/app?sslmode=verify-full')).toEqual({
      rejectUnauthorized: true,
    });
  });

  it('does not use TLS for a local socket or localhost', async () => {
    const { sslFor } = await import('@/lib/db');

    expect(sslFor('postgresql://user@/app?host=/var/run/postgresql')).toBe(false);
    expect(sslFor('postgresql://user@localhost:5432/app')).toBe(false);
    expect(sslFor('postgresql://user@db.example.com/app?sslmode=disable')).toBe(false);
  });
});
