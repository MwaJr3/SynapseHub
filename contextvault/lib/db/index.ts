import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { Pool, type PoolClient } from 'pg';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export type Row = Record<string, any>;
export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
}
type Database = Queryable & { transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>; exec(sql: string): Promise<void> };

declare global { var __contextvaultDb: Promise<Database> | undefined; }

async function createDatabase(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000 });
    // An idle PostgreSQL connection can fail during a restart or network outage.
    // Without a listener pg emits an unhandled error and can terminate the worker.
    // The pool removes the client and establishes a new one on the next query.
    pool.on('error', () => { console.error(JSON.stringify({ event: 'database.idle_connection_failed' })); });
    const wrap = (client: Pool | PoolClient): Queryable => ({ query: async <T extends Row>(sql: string, params: any[] = []) => {
      const result = await client.query(sql, params); return { rows: result.rows as T[] };
    }});
    return {
      ...wrap(pool),
      exec: async (sql) => { await pool.query(sql); },
      transaction: async <T>(fn: (tx: Queryable) => Promise<T>) => {
        const client = await pool.connect();
        try { await client.query('BEGIN'); const result = await fn(wrap(client)); await client.query('COMMIT'); return result; }
        catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
      },
    };
  }
  const location = process.env.PGLITE_PATH || path.join(process.cwd(), '.data', 'postgres');
  if (location !== 'memory://') await mkdir(path.dirname(location), { recursive: true });
  const pg = await PGlite.create(location, { extensions: { vector } });
  const wrap = (client: { query: (sql: string, params?: any[]) => Promise<any> }): Queryable => ({
    query: async <T extends Row>(sql: string, params: any[] = []) => {
      const result = await client.query(sql, params); return { rows: result.rows as T[] };
    },
  });
  const db: Database = {
    ...wrap(pg), exec: async (sql) => { await pg.exec(sql); },
    transaction: async <T>(fn: (tx: Queryable) => Promise<T>) => pg.transaction(async (tx) => fn(wrap(tx))),
  };
  const schema = await readFile(path.join(process.cwd(), 'lib/db/schema.sql'), 'utf8');
  await db.exec(schema);
  return db;
}
export function database(): Promise<Database> {
  if (!globalThis.__contextvaultDb) globalThis.__contextvaultDb = createDatabase();
  return globalThis.__contextvaultDb;
}
export async function withUser<T>(userId: string, fn: (tx: Queryable) => Promise<T>): Promise<T> {
  const db = await database();
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('app.user_id', $1, true)", [userId]);
    return fn(tx);
  });
}
export async function migrate() {
  const db = await database();
  const schema = await readFile(path.join(process.cwd(), 'lib/db/schema.sql'), 'utf8');
  await db.exec(schema);
}
