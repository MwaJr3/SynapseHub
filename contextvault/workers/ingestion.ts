import { loadEnvConfig } from '@next/env';
import { database } from '../lib/db';
import { runPendingForUser } from '../lib/documents/processor';
loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) { console.error('The standalone worker requires DATABASE_URL; embedded demo uses its in-process worker.'); process.exit(1); }
async function main() {
  console.log(JSON.stringify({event:'worker.started'}));
  while (true) {
    try {
      const users = (await (await database()).query('SELECT id FROM users')).rows;
      for (const user of users) await runPendingForUser(user.id);
    } catch { console.error(JSON.stringify({event:'worker.poll_failed'})); }
    await new Promise(resolve => setTimeout(resolve,2000));
  }
}
main();
