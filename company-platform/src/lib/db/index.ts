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

function createDatabase(): { db: Db; pglite?: PGlite } {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    const pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 5_000,
    });
    return { db: drizzleNodePg(pool, { schema }) as unknown as Db };
  }
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
