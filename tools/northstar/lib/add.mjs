/**
 * `northstar add <set> [names…] <srcDir>` — copy decorative components into an app.
 *
 *   northstar add decor <srcDir>              the dependency-free kit (default set)
 *   northstar add magicui <name…> <srcDir>    vendored magicui components (optional set)
 *   northstar add cult-ui <name…> <srcDir>   vendored cult-ui components (optional set)
 *   northstar add <magicui|cult-ui> --list    the names that can be added
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.join(here, '..', 'vendor');
const DECOR = path.resolve(here, '..', '..', '..', 'packages', 'decor');

/** Optional vendored sets: folder under vendor/, extra files copied with them, and the peer packages. */
const SETS = {
  magicui: { extra: ['utils.ts', 'magicui.css', 'LICENSE'], deps: 'motion clsx tailwind-merge', css: true },
  'cult-ui': { extra: ['utils.ts', 'LICENSE'], deps: 'motion clsx tailwind-merge class-variance-authority @radix-ui/react-slot react-use-measure', css: false },
};

export function vendoredNames(set) {
  return fs.readdirSync(path.join(VENDOR, set)).filter((f) => f.endsWith('.tsx')).map((f) => f.replace(/\.tsx$/, '')).sort();
}
export const magicuiNames = () => vendoredNames('magicui');

const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
/** Third-party source keeps its own style, so the copy is marked for the app's linter (the code is otherwise unchanged). */
const HEADER = '/* eslint-disable -- vendored third-party component (MIT); see LICENSE in this folder */\n';
const copySource = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, HEADER + fs.readFileSync(from, 'utf8'));
};

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
  const config = SETS[set];
  if (config) {
    const known = vendoredNames(set);
    if (rest.includes('--list')) { known.forEach((n) => log(n)); return 0; }
    const dir = rest[rest.length - 1];
    const names = rest.slice(0, -1);
    if (!dir || names.length === 0) { log(`usage: northstar add ${set} <name…> <srcDir>   (--list shows names)`); return 2; }
    const unknown = names.filter((n) => !known.includes(n));
    if (unknown.length) { log(`unknown component: ${unknown.join(', ')}. Known: ${known.join(', ')}`); return 2; }
    const out = path.join(dir, 'components', set);
    for (const n of names) copySource(path.join(VENDOR, set, `${n}.tsx`), path.join(out, `${n}.tsx`));
    for (const f of config.extra) copy(path.join(VENDOR, set, f), path.join(out, f));
    log(`copied ${names.join(', ')} to ${out}`);
    log(`npm i ${config.deps}     # peer packages these components use`);
    if (config.css) log(`@import "./components/${set}/${set}.css";   /* in your Tailwind 4 stylesheet, after @import "tailwindcss" */`);
    return 0;
  }
  log('usage: northstar add <decor|magicui|cult-ui> …');
  return 2;
}
