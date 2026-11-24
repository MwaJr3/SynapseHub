#!/usr/bin/env node
/**
 * Copies packages/decor (the canonical source) into every app that uses it.
 * Each app stays self-contained — no cross-package imports, no install changes — and
 * packages/decor/sync.test.ts fails if a copy drifts from the source.
 *
 *   node scripts/sync-decor.mjs            copy into every app listed by `targets()`
 *   node scripts/sync-decor.mjs <srcDir>…  copy into the given src directories only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FILES = ['index.tsx', 'decor.css'];
const source = path.join(root, 'packages', 'decor');

/** Every app that opts in by already having a `src/decor` folder, plus the explicit extras. */
export function targets() {
  const found = [];
  for (const group of ['companies/velaqori', 'companies/tamuzi']) {
    const base = path.join(root, group);
    for (const app of fs.readdirSync(base)) {
      const dir = path.join(base, app, 'frontend', 'src', 'decor');
      if (fs.existsSync(dir)) found.push(dir);
    }
  }
  for (const extra of ['src/components/decor', 'company-platform/src/components/decor', 'contextvault/components/decor', 'challenges/src/components/decor', 'vocal-separator/web/src/decor', 'sites/portfolio/src/decor', 'companies/velaqori/frontpage/frontend/src/decor']) {
    const dir = path.join(root, extra);
    if (fs.existsSync(dir)) found.push(dir);
  }
  return found;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const explicit = process.argv.slice(2).map((p) => path.resolve(p));
  for (const dir of explicit.length ? explicit : targets()) {
    fs.mkdirSync(dir, { recursive: true });
    for (const file of FILES) fs.copyFileSync(path.join(source, file), path.join(dir, file));
    console.log('synced', path.relative(root, dir));
  }
}
