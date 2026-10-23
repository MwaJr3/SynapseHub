import { runMigrations } from '../src/lib/db/migrate';

async function main(): Promise<void> {
  const applied = await runMigrations();
  if (applied.length === 0) {
    console.log('Database already up to date.');
  } else {
    console.log(`Applied migrations: ${applied.join(', ')}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
