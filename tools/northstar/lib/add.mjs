/**
 * `northstar add <set> [names…] <srcDir>` — copy decorative components into an app.
 *
 *   northstar add decor <srcDir>              the dependency-free kit (default set)
 *   northstar add magicui <name…> <srcDir>    vendored magicui components (optional set)
 *   northstar add magicui --list              the names that can be added
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAGICUI = path.join(here, '..', 'vendor', 'magicui');
const DECOR = path.resolve(here, '..', '..', '..', 'packages', 'decor');

export function magicuiNames() {
  return fs.readdirSync(MAGICUI).filter((f) => f.endsWith('.tsx')).map((f) => f.replace(/\.tsx$/, '')).sort();
}

const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };

export function add(args, log = (m) => process.stdout.write(`${m}\n`)) {
  const [set, ...rest] = args;
  if (set === 'decor') {
    const dir = rest[0];
    if (!dir) { log('usage: northstar add decor <srcDir>'); return 2; }
    for (const f of ['index.tsx', 'decor.css']) copy(path.join(DECOR, f), path.join(dir, 'decor', f));
    log(`copied the decor kit to ${path.join(dir, 'decor')}`);
    log(`import './decor/decor.css';   // once, in your entry file`);
    return 0;
  }
  if (set === 'magicui') {
    const known = magicuiNames();
    if (rest.includes('--list')) { known.forEach((n) => log(n)); return 0; }
    const dir = rest[rest.length - 1];
    const names = rest.slice(0, -1);
    if (!dir || names.length === 0) { log('usage: northstar add magicui <name…> <srcDir>   (--list shows names)'); return 2; }
    const unknown = names.filter((n) => !known.includes(n));
    if (unknown.length) { log(`unknown component: ${unknown.join(', ')}. Known: ${known.join(', ')}`); return 2; }
    const out = path.join(dir, 'components', 'magicui');
    for (const n of names) copy(path.join(MAGICUI, `${n}.tsx`), path.join(out, `${n}.tsx`));
    for (const f of ['utils.ts', 'magicui.css', 'LICENSE']) copy(path.join(MAGICUI, f), path.join(out, f));
    log(`copied ${names.join(', ')} to ${out}`);
    log('npm i motion clsx tailwind-merge     # peer packages these components use');
    log(`@import "./components/magicui/magicui.css";   /* in your Tailwind 4 stylesheet, after @import "tailwindcss" */`);
    return 0;
  }
  log('usage: northstar add <decor|magicui> …');
  return 2;
}
