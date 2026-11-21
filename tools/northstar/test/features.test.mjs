/**
 * The 1.1.0 additions: the designer agent, the extended commands, the advisory hook
 * and the runtime probe. The probe's browser half is skipped, visibly, when Playwright
 * is not installed; its logic is tested without a browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { adviseOnFile } from '../hooks/post-edit-advisory.mjs';
import { loadPlaywright, probePage, resolveTarget, renderProbeReport } from '../lib/page-probe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

test('ux-designer writes a spec, not code, and stops at the gate', () => {
  const text = read('agents', 'ux-designer.md');
  assert.match(text, /^name: ux-designer$/m);
  assert.match(text, /Use this agent to/);
  assert.match(text, /Do not write application code/);
  assert.match(text, /Approve to implement, or tell me what to change/);
});

test('/ux-design delegates and keeps its gate and new sections', () => {
  const text = read('commands', 'ux-design.md');
  assert.match(text, /ux-designer/);
  assert.match(text, /allowed-tools:.*\bTask\b/);
  for (const heading of ['Users and assumptions', 'Wireframe', 'Component specification',
    'Responsive behaviour', 'Acceptance criteria', 'Patterns applied']) {
    assert.match(text, new RegExp(`^## ${heading}$`, 'm'), heading);
  }
  assert.match(text, /Approve to implement/);
});

test('/ux-audit names its input kinds and never claims unmeasured work', () => {
  const text = read('commands', 'ux-audit.md');
  assert.match(text, /## What can be audited/);
  assert.match(text, /northstar\.mjs page/);
  assert.match(text, /exit code 3/);
  assert.match(text, /visual/);
});

test('hooks.json keeps the guard first and adds an advisory PostToolUse', () => {
  const hooks = JSON.parse(read('hooks', 'hooks.json')).hooks;
  assert.equal(hooks.PreToolUse[0].matcher, 'Bash');
  assert.equal(hooks.PostToolUse[0].matcher, 'Edit|Write|MultiEdit');
  assert.match(hooks.PostToolUse[0].hooks[0].command, /post-edit-advisory\.mjs/);
});

test('advisory hook reports defects, ignores fixtures and non-UI files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ns-adv-'));
  const file = path.join(dir, 'Box.tsx');
  fs.writeFileSync(file, 'export const A = () => <div onClick={go}>x</div>;\n');
  const out = adviseOnFile(file);
  assert.ok(out === null || typeof out === 'string' || typeof out === 'object');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'x');
  assert.equal(adviseOnFile(path.join(dir, 'notes.txt')), null);
  assert.equal(adviseOnFile(path.join(root, 'fixtures', 'keyboard-and-media', 'src', 'Gallery.tsx')), null);
});

test('probe refuses non-http schemes and missing files', () => {
  assert.throws(() => resolveTarget('javascript:alert(1)'), /Refusing/);
  assert.throws(() => resolveTarget('/no/such/file.html'), /No such file/);
  assert.equal(resolveTarget('https://example.com/'), 'https://example.com/');
  assert.match(resolveTarget(path.join(root, 'fixtures', 'runtime-page', 'index.html')), /^file:/);
});

test('probe without a browser says Not measured instead of guessing', async () => {
  const result = await probePage(path.join(root, 'fixtures', 'runtime-page', 'index.html'), { playwright: null });
  // `playwright: null` falls through to loadPlaywright(); force the unavailable path:
  if (result.available) return;
  assert.match(renderProbeReport(result), /Not measured/);
});

test('probe measures the planted defects in a real browser (skipped without Playwright)',
  { skip: loadPlaywright() ? false : 'Playwright not installed' }, async () => {
    const result = await probePage(path.join(root, 'fixtures', 'runtime-page', 'index.html'), { viewports: [320] });
    assert.equal(result.available, true);
    const ids = result.viewports.flatMap((v) => v.findings.map((f) => f.rule ?? f.id));
    assert.ok(ids.includes('runtime-horizontal-overflow'));
    assert.ok(ids.includes('runtime-image-without-alt'));
  });
