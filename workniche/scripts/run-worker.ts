/** Entry point for the notification worker: one tick per run. */
import { runWorkerTick } from './worker';
import { runMigrations } from '../src/lib/db/migrate';
import { waitDbReady, getPgLite } from '../src/lib/db';

async function main(): Promise<void> {
  await waitDbReady();
  await runMigrations();
  const result = await runWorkerTick();
  console.log(
    `worker tick: ${result.alertNotifications} alert notification(s), ${result.deadlineReminders} deadline reminder(s)`,
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
