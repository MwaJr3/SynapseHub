// Copies the single-threaded lite Stockfish WASM build (npm "stockfish", GPL-3.0)
// into public/engine so the browser can load it in a Web Worker. The single-thread
// build needs no SharedArrayBuffer / COOP-COEP headers, so it works on Vercel.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, '..', 'package.json'));
const out = join(here, '..', 'public', 'engine');
let pkgDir;
try {
  pkgDir = dirname(require.resolve('stockfish/package.json'));
} catch {
  console.warn('[copy-engine] "stockfish" npm package not installed; browser engine will be unavailable.');
  process.exit(0);
}
mkdirSync(out, { recursive: true });
for (const f of ['stockfish-18-lite-single.js', 'stockfish-18-lite-single.wasm', 'Copying.txt']) {
  const src = join(pkgDir, f.endsWith('.txt') ? '' : 'bin', f);
  if (existsSync(src)) copyFileSync(src, join(out, f === 'Copying.txt' ? 'STOCKFISH-LICENSE-GPL3.txt' : f));
}
console.log('[copy-engine] engine files ready in public/engine');
