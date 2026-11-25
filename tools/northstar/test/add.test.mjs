import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { add, magicuiNames } from '../lib/add.mjs';

const quiet = () => {};

test('add magicui copies the named components with licence, utils and keyframes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-add-'));
  assert.equal(add(['magicui', 'blur-fade', 'marquee', dir], quiet), 0);
  const out = path.join(dir, 'components', 'magicui');
  for (const f of ['blur-fade.tsx', 'marquee.tsx', 'utils.ts', 'magicui.css', 'LICENSE']) assert.ok(fs.existsSync(path.join(out, f)), f);
  assert.ok(!fs.readFileSync(path.join(out, 'marquee.tsx'), 'utf8').includes('@/lib/utils'), 'imports are rewritten to ./utils');
});

test('add magicui refuses unknown names and writes nothing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-add-'));
  assert.equal(add(['magicui', 'not-a-thing', dir], quiet), 2);
  assert.ok(!fs.existsSync(path.join(dir, 'components')));
});

test('every vendored component is MIT-licensed, listed, and relies only on known keyframes', () => {
  const css = fs.readFileSync(new URL('../vendor/magicui/magicui.css', import.meta.url), 'utf8');
  assert.match(fs.readFileSync(new URL('../vendor/magicui/LICENSE', import.meta.url), 'utf8'), /MIT License/);
  for (const name of magicuiNames()) {
    const src = fs.readFileSync(new URL(`../vendor/magicui/${name}.tsx`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/animate-([a-z-]+)/g)) {
      if (['marquee', 'marquee-vertical', 'shiny-text', 'shine'].includes(m[1])) assert.ok(css.includes(`--animate-${m[1]}`), `${name} needs --animate-${m[1]}`);
    }
  }
});

test('add decor copies the dependency-free kit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-add-'));
  assert.equal(add(['decor', dir], quiet), 0);
  assert.ok(fs.existsSync(path.join(dir, 'decor', 'index.tsx')));
});
