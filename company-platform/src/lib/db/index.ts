/**
 * Database access: PostgreSQL via node-postgres in production, embedded
 * PGlite locally — one schema, one SQL, no services required to develop.
 */
import { mkdirSync } from 'node:fs';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';

import * as schema from './schema';

type Schema = typeof schema;

export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

export function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: Array<Record<string, unknown>> })?.rows;
  return rows ?? [];
}

export function isEmbeddedDatabase(): boolean {
  return !process.env.DATABASE_URL;
}

/**
 * Thrown when a deployed environment has no database configured.
 *
 * The embedded PGlite fallback is right for a laptop and wrong for production: its
 * data directory lives in the function's ephemeral filesystem, so every cold start
 * would serve an empty catalogue and every write would be lost. Failing loudly
 * turns that into one readable error instead of a Next.js digest on every page.
 */
export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'DATABASE_URL is not set. The embedded PGlite database is a development ' +
        'fallback only — in production it is an empty, ephemeral directory. Set ' +
        'DATABASE_URL (PostgreSQL 14+) on this deployment and run `npm run db:migrate`.',
    );
    this.name = 'DatabaseNotConfiguredError';
  }
}

/**
 * TLS for a managed database.
 *
 * Encrypt, but do not verify the chain unless asked. That is libpq's `require`,
 * and it is deliberate: Supabase's pooler presents a chain rooted in a
 * certificate Node's trust store does not contain, so a verifying connection
 * fails at `SELF_SIGNED_CERT_IN_CHAIN` — which is what the first deployment of
 * this app did, from Vercel's build container, on 2026-10-29.
 *
 * The honest consequence: the traffic is encrypted, and a passive observer
 * learns nothing, but an active attacker on the path could present their own
 * certificate. Closing that means pinning the provider's CA (`ssl.ca`, fed from
 * `PGSSLROOTCERT`) and asking for `?sslmode=verify-full` — the URL is the switch,
 * so no code change is needed once the certificate is available to the deploy.
 *
 * `sslmode=disable` and a local socket/localhost stay unencrypted; there is
 * nothing to protect between a process and itself.
 */
export function sslFor(connectionString: string): false | { rejectUnauthorized: boolean } {
  let host: string;
  let sslMode: string | null;
  try {
    const url = new URL(connectionString);
    host = url.hostname;
    sslMode = url.searchParams.get('sslmode');
  } catch {
    // libpq's socket form (`postgresql://user@/db?host=/var/run/postgresql`) is not
    // a URL Node can parse. It is a local socket, so it gets no TLS.
    return /[?&]host=\//.test(connectionString) ? false : { rejectUnauthorized: false };
  }
  if (sslMode === 'disable' || /^(localhost|127\.0\.0\.1|::1|\[::1\]|)$/.test(host)) return false;
  if (sslMode === 'verify-full' || sslMode === 'verify-ca') return { rejectUnauthorized: true };
  return { rejectUnauthorized: false };
}

/** True when this process is serving a real deployment rather than a build or a test. */
function isDeployedRuntime(): boolean {
  // `next build` also runs with NODE_ENV=production, and it must not open a
  // database; every page is dynamic, so no data is read at build time.
  if (process.env.NEXT_PHASE === 'phase-production-build') return false;
  if (process.env.VERCEL_ENV === 'production') return true;
  return process.env.NODE_ENV === 'production';
}

function createDatabase(): { db: Db; pglite?: PGlite } {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5_000,
      ssl: sslFor(connectionString),
    });
    return { db: drizzleNodePg(pool, { schema }) as unknown as Db };
  }
  if (isDeployedRuntime()) throw new DatabaseNotConfiguredError();
  const dataDir = process.env.PGLITE_DATA_DIR ?? './data/platform.db';
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return {
    db: drizzlePglite(client, { schema }) as unknown as Db,
    pglite: client,
  };
}

const globalForDb = globalThis as unknown as {
  __platformDb?: Db;
  __platformPglite?: PGlite;
};

export function getDb(): Db {
  if (!globalForDb.__platformDb) {
    const created = createDatabase();
    globalForDb.__platformDb = created.db;
    globalForDb.__platformPglite = created.pglite;
  }
  return globalForDb.__platformDb;
}

export async function waitDbReady(): Promise<void> {
  getDb();
  const client = globalForDb.__platformPglite;
  if (client) await client.waitReady;
}

export function getPgLite(): PGlite | undefined {
  getDb();
  return globalForDb.__platformPglite;
}
