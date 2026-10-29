/**
 * Create the schema and, on a fresh database, the catalogue.
 *
 * `npm run db:bootstrap` is what the deploy runs before `next build`, so the
 * database is ready before the first request — and the deploy fails, loudly and
 * visibly, if it cannot be. The same function also runs from `instrumentation.ts`
 * on every server start, which is what covers a database that appears later.
 *
 * Safe to run repeatedly: migrations are recorded, and the content step returns
 * without writing once `platform.companies` has a row.
 */
import { bootstrapDatabase } from '../src/lib/db/bootstrap';
import { isEmbeddedDatabase } from '../src/lib/db';

async function main(): Promise<void> {
  if (isEmbeddedDatabase()) {
    // The deploy must never bootstrap an embedded database: it would write to a
    // temporary directory inside the build container and report success.
    console.error(
      '[db] DATABASE_URL is not set — refusing to bootstrap. Set it on this ' +
        'environment; the embedded PGlite database is for local work only.',
    );
    process.exit(1);
  }

  const { seeded } = await bootstrapDatabase();
  console.log(seeded ? '[db] schema created, catalogue seeded' : '[db] schema and catalogue already current');
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('[db] bootstrap failed', error);
  process.exit(1);
});
