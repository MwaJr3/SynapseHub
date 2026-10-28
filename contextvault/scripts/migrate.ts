import { loadEnvConfig } from '@next/env';
import { migrate } from '../lib/db';
loadEnvConfig(process.cwd());
migrate().then(() => { console.log('ContextVault schema applied.'); process.exit(0); }).catch((error) => { console.error(error); process.exit(1); });
