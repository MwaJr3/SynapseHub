/**
 * Command contract tests.
 *
 * Each command promises a particular shape of output and a particular boundary of
 * authority. Those promises are the product; if `/ux-review` can edit files or
 * `/ux-design` skips its approval gate, the plugin is dangerous regardless of how
 * good its advice is. These tests read the command files and check the promise is
 * still in them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (file) => fs.readFileSync(path.join(root, 'commands', file), 'utf8');

const EDITS = /\b(Edit|Write|MultiEdit|NotebookEdit)\b/;

test('/ux-review is read-only and says so', () => {
  const text = read('ux-review.md');
  assert.match(text, /read-only/i);
  assert.ok(!EDITS.test(text.split('---')[2] ?? ''), 'the allowed-tools list grants no edit tool');
  assert.match(text, /MUST FIX/);
  assert.match(text, /SHOULD FIX/);
  assert.match(text, /NICE TO HAVE/);
  assert.match(text, /Not checked/i, 'a review states what it did not verify');
});

test('/ux-design stops at an approval gate', () => {
  const text = read('ux-design.md');
  assert.match(text, /approval gate/i);
  assert.match(text, /Approve to implement/);
  assert.match(text, /does not scaffold|not scaffold|no implementation/i);
  for (const section of ['## Job', '## Flow', '## Hierarchy', '## States', '## Copy', '## Out of scope']) {
    assert.ok(text.includes(section), `the spec template contains ${section}`);
  }
  assert.match(text, /\| Empty \(never used\) \|/);
  assert.match(text, /Open questions/);
});

test('/ux-audit ranks P0–P3, leads with three, and defaults to not fixing', () => {
  const text = read('ux-audit.md');
  for (const severity of ['P0', 'P1', 'P2', 'P3']) assert.match(text, new RegExp(severity));
  assert.match(text, /Top three/);
  assert.match(text, /Audit\*\* \(default\) — report only/);
  assert.match(text, /Only after the user says which findings to fix/);
  assert.match(text, /no API changes, no routing changes, no auth changes, no test\s+deletions/i);
  assert.match(text, /Re-run the engine and report the before\/after counts/);
});

test('/restyle works axis by axis, writes DESIGN.md, and does not change behaviour', () => {
  const text = read('restyle.md');
  const order = text.indexOf('tokens → colour → type → space → surface');
  assert.ok(order > 0, 'the axis order is explicit');
  assert.match(text, /DESIGN\.md/);
  assert.match(text, /before\/after/i);
  assert.match(text, /one axis at a time/i);
  assert.match(text, /never "improve" copy, layout or interaction/i);
});

test('every command names the engine command it runs', () => {
  for (const file of ['ux-review.md', 'ux-audit.md']) {
    assert.match(read(file), /northstar\.mjs/, `${file} runs the engine rather than improvising`);
  }
});

test('commands reference only skills that exist', () => {
  const skills = fs.readdirSync(path.join(root, 'skills'));
  const mentioned = new Set();
  for (const file of fs.readdirSync(path.join(root, 'commands'))) {
    const text = read(file);
    for (const match of text.matchAll(/`([a-z][a-z-]+)`/g)) {
      if (skills.includes(match[1])) mentioned.add(match[1]);
    }
  }
  assert.ok(mentioned.size >= 5, 'the commands delegate to the skills');
  for (const skill of mentioned) assert.ok(skills.includes(skill), `${skill} exists`);
});
