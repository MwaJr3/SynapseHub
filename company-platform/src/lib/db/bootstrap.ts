/**
 * First-run bootstrap: schema, then content, exactly once.
 *
 * The deployed site has no deploy step that can run `npm run db:migrate`, so a
 * fresh database reached production empty on 2026-10-29 and every page 500'd. This
 * is the code that closes that gap: `instrumentation.ts` calls it once per server
 * instance, before the first request is served.
 *
 * Two properties matter:
 *
 * - **Idempotent.** The schema step is memoised by `ensureSchema`; the content step
 *   is skipped entirely unless the `companies` table is empty. A warm instance pays
 *   one `SELECT count(*)`.
 * - **Serialised.** Two instances cold-starting together would otherwise both seed.
 *   The empty check is repeated inside a transaction that holds an advisory lock,
 *   so the second one sees the first one's rows and does nothing.
 */
import { sql } from 'drizzle-orm';

import { getDb, rowsOf, type Db } from './index';
import { ensureSchema } from './migrate';

/** Lock key for the content step. Distinct from the migration runner's. */
const SEED_LOCK_KEY = 8_412_007;

/** True when the catalogue has been written. */
async function hasCatalogue(db: Db): Promise<boolean> {
  const rows = rowsOf(await db.execute(sql.raw('SELECT count(*)::int AS n FROM platform.companies')));
  return Number(rows[0]?.n ?? 0) > 0;
}

/**
 * Ensure the schema exists and the catalogue is populated.
 *
 * Returns what it did, which is what the log line reports: `[]` on a warm start.
 */
export async function bootstrapDatabase(): Promise<{ seeded: boolean }> {
  await ensureSchema();

  const db = getDb();
  if (await hasCatalogue(db)) return { seeded: false };

  // Imported lazily: the seed module pulls in every content file (about 4,000
  // lines), and a warm instance should not pay for that on the module graph.
  const { seedDatabase } = await import('../../../scripts/seed');

  let seeded = false;
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(${SEED_LOCK_KEY})`);
    // Re-check under the lock: the instance that won the race has already written.
    if (await hasCatalogue(tx as unknown as Db)) return;

    // `includeDemoAccounts: false` — the demo logins have published passwords and
    // an EDITOR can edit company content. A public deployment does not get them.
    await seedDatabase({ includeDemoAccounts: false, db: tx as unknown as Db });
    seeded = true;
  });

  return { seeded };
}
