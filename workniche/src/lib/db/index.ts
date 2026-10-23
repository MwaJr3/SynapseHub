/**
 * Database access.
 *
 * Production points DATABASE_URL at a PostgreSQL 14+ service and gets a
 * node-postgres connection pool. Without it, WorkNiche runs on PGlite — an
 * embedded build of PostgreSQL itself — persisted under ./data/, so local
 * development and tests exercise the same schema and SQL with no services.
 */
import { mkdirSync } from 'node:fs';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';

import * as schema from './schema';

type Schema = typeof schema;

/**
 * The shared PostgreSQL query interface both drivers satisfy. Typed as the
 * common supertype (not a union) so method calls like `.returning()` resolve;
 * results are normalized in `rowsOf`.
 */
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

function createDatabase(): { db: Db; pglite?: PGlite } {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const pool = new Pool({
      connectionString,
      max: 10,
      // Fail fast in CI rather than hanging on a bad connection string.
      connectionTimeoutMillis: 5_000,
    });
    return { db: drizzleNodePg(pool, { schema }) as unknown as Db };
  }
  const dataDir = process.env.PGLITE_DATA_DIR ?? './data/workniche.db';
  // PGlite's datadir is a directory; create it before opening (PGlite's own
  // mkdir is non-recursive).
  mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return {
    db: drizzlePglite(client, { schema }) as unknown as Db,
    pglite: client,
  };
}

/**
 * A single connection per process. Cached on globalThis so Next.js dev-mode
 * hot reloads do not reopen the embedded database file.
 */
const globalForDb = globalThis as unknown as {
  __worknicheDb?: Db;
  __worknichePglite?: PGlite;
};

export function getDb(): Db {
  if (!globalForDb.__worknicheDb) {
    const created = createDatabase();
    globalForDb.__worknicheDb = created.db;
    globalForDb.__worknichePglite = created.pglite;
  }
  return globalForDb.__worknicheDb;
}

/** Await the embedded engine's readiness (no-op for a server pool). */
export async function waitDbReady(): Promise<void> {
  getDb();
  const client = globalForDb.__worknichePglite;
  if (client) await client.waitReady;
}

export function getPgLite(): PGlite | undefined {
  getDb();
  return globalForDb.__worknichePglite;
}
