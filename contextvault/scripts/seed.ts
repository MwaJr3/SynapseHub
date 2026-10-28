import { loadEnvConfig } from '@next/env';
import { seedDemo } from '../lib/documents/seed';
loadEnvConfig(process.cwd());
seedDemo().then(id => { console.log(`Fictional demo workspace created: ${id}`); process.exit(0); }).catch(error => { console.error(error); process.exit(1); });
