/** Applies the SQL migrations in ./drizzle to the configured database. */
import { runMigrations, describeDatabase } from '../src/lib/db/migrate';
import { waitDbReady, getPgLite } from '../src/lib/db';

async function main(): Promise<void> {
  await waitDbReady();
  const applied = await runMigrations();
  console.log(
    `${describeDatabase()}: ${applied.length} migration(s) applied` +
      (applied.length > 0 ? `: ${applied.join(', ')}` : ' (already up to date)'),
  );
  const client = getPgLite();
  if (client) await client.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
