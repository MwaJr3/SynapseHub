/**
 * Schema migrations.
 *
 * The statements are baked into `migrations.generated.ts` rather than read from
 * `drizzle/*.sql` at runtime: this code runs inside a serverless function whose
 * working directory is the function bundle, where the SQL files are not
 * guaranteed to have been traced. Reading them failed in exactly the environment
 * that needed them — and nothing ran the migrations at build time either, so a
 * fresh database reached production with no tables at all.
 *
 * Applied migrations are recorded in `platform._migrations`, one row per file, so
 * this is idempotent: the second call is a single SELECT.
 */
import { sql } from 'drizzle-orm';

import { MIGRATIONS, MIGRATION_SCHEMA } from './migrations.generated';
import { getDb, rowsOf, waitDbReady } from './index';

/**
 * Advisory lock key. Two function instances booting at the same moment would
 * otherwise both try to create the same tables; the loser would crash on
 * `relation already exists`. Any constant works as long as it is stable.
 */
const MIGRATION_LOCK_KEY = 8_412_006;

/** Apply every migration that has not been applied yet. Returns their names. */
export async function runMigrations(): Promise<string[]> {
  await waitDbReady();
  const db = getDb();

  // A transaction, so the advisory lock and the DDL share one connection and the
  // lock is released at commit even if a statement throws. PostgreSQL has
  // transactional DDL, so a failed migration leaves nothing half-applied.
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`);

    // The generated statements name the schema, so it must exist first. This is
    // also why the embed step drops drizzle's bare `CREATE SCHEMA`: on a shared
    // database the schema may already be there, and `IF NOT EXISTS` is the only
    // form that is safe to run twice.
    await tx.execute(sql.raw(`CREATE SCHEMA IF NOT EXISTS "${MIGRATION_SCHEMA}"`));
    await tx.execute(
      sql.raw(
        `CREATE TABLE IF NOT EXISTS "${MIGRATION_SCHEMA}"."_migrations" (` +
          'name text PRIMARY KEY, ' +
          'applied_at timestamptz NOT NULL DEFAULT now())',
      ),
    );

    const appliedRows = rowsOf(
      await tx.execute(sql.raw(`SELECT name FROM "${MIGRATION_SCHEMA}"."_migrations"`)),
    );
    const applied = new Set(appliedRows.map((row) => String(row.name)));

    const newlyApplied: string[] = [];
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.name)) continue;
      for (const statement of migration.statements) {
        await tx.execute(sql.raw(statement));
      }
      await tx.execute(
        sql.raw(
          `INSERT INTO "${MIGRATION_SCHEMA}"."_migrations" (name) VALUES ('${migration.name.replace(/'/g, "''")}')`,
        ),
      );
      newlyApplied.push(migration.name);
    }
    return newlyApplied;
  });
}

/**
 * Run the migrations once per process, and remember the result.
 *
 * Everything that touches the database calls this first (see `instrumentation.ts`
 * and the query helpers), so a cold start against a fresh database builds its own
 * schema instead of failing every page. A failed attempt is forgotten rather than
 * cached, so the next request retries instead of inheriting one transient error
 * for the life of the instance.
 */
let ready: Promise<string[]> | undefined;

export function ensureSchema(): Promise<string[]> {
  if (!ready) {
    ready = runMigrations().catch((error: unknown) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

/** Test hook: forget the memoised result. */
export function resetSchemaPromiseForTests(): void {
  ready = undefined;
}
