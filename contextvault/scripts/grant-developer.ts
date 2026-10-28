import { loadEnvConfig } from '@next/env';
import { database } from '../lib/db';
loadEnvConfig(process.cwd());
const email=process.argv[2]?.trim().toLowerCase();
if (!email) { console.error('Usage: npm run grant:developer -- user@example.com'); process.exit(1); }
(async()=>{const rows=(await (await database()).query("UPDATE users SET role='developer' WHERE email=$1 RETURNING id,email",[email])).rows;if(!rows.length)throw new Error('User not found.');console.log(`Developer access granted to ${rows[0].email}.`);})().then(()=>process.exit(0)).catch(e=>{console.error(e.message);process.exit(1)});
