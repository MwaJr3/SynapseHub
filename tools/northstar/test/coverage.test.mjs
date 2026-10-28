/**
 * Coverage tests.
 *
 * Three artefacts have to agree with each other: the pattern library says which
 * checks prove which pattern, the rules implement those check ids, and the skills
 * own the patterns no check can settle. A dangling reference in any direction means
 * a finding quotes a pattern nobody can look up, or a pattern claims coverage that
 * does not exist.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PATTERNS, patternById, unautomated } from '../patterns.mjs';
import { RULES } from '../rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const skills = fs
  .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

test('the pattern library has 76 stable ids with no gaps or duplicates', () => {
  assert.equal(PATTERNS.length, 76);
  const ids = PATTERNS.map((pattern) => pattern.id);
  assert.equal(new Set(ids).size, 76, 'no duplicate ids');
  for (let index = 1; index <= 76; index += 1) {
    assert.ok(ids.includes(`P${String(index).padStart(2, '0')}`), `P${index} exists`);
  }
});

test('every pattern names a skill that exists', () => {
  for (const pattern of PATTERNS) {
    assert.ok(skills.includes(pattern.skill), `${pattern.id} → ${pattern.skill}`);
  }
});

test('every check a pattern claims is implemented by a rule', () => {
  const ruleIds = new Set(RULES.map((rule) => rule.id));
  for (const pattern of PATTERNS) {
    for (const check of pattern.checks) {
      assert.ok(ruleIds.has(check), `${pattern.id} claims ${check}, but no rule has that id`);
    }
  }
});

test('every rule is reachable from the pattern library', () => {
  const claimed = new Set(PATTERNS.flatMap((pattern) => pattern.checks));
  for (const rule of RULES) {
    assert.ok(claimed.has(rule.id), `rule ${rule.id} is not referenced by any pattern`);
    assert.ok(
      PATTERNS.some((pattern) => pattern.id === rule.pattern),
      `rule ${rule.id} quotes pattern ${rule.pattern}, which does not exist`,
    );
  }
});

test('every rule declares the fields a report needs', () => {
  const severities = new Set(['P0', 'P1', 'P2', 'P3']);
  const confidences = new Set(['high', 'medium', 'low']);
  for (const rule of RULES) {
    assert.match(rule.id, /^[a-z][a-z0-9-]+$/, `${rule.id} is kebab-case`);
    assert.ok(severities.has(rule.severity), `${rule.id} has a severity`);
    assert.ok(confidences.has(rule.confidence), `${rule.id} has a confidence`);
    assert.ok(rule.title.length > 10, `${rule.id} has a title`);
    assert.ok(rule.why.length > 40, `${rule.id} explains the user consequence`);
    assert.ok(rule.fix.length > 20, `${rule.id} says what to do`);
    assert.equal(typeof rule.check, 'function');
  }
});

test('patterns without a check are declared, not hidden', () => {
  const without = unautomated();
  assert.ok(without.length > 20, 'a lot of UX cannot be settled from source — that is the honest position');
  const doc = fs.readFileSync(path.join(root, 'PATTERNS.md'), 'utf8');
  for (const id of without) {
    assert.ok(doc.includes(id), `${id} is listed as manual in PATTERNS.md`);
  }
});

test('a pattern lookup never returns the wrong thing', () => {
  assert.equal(patternById('P70').name, 'Contrast and colour legibility');
  assert.equal(patternById('P05').name, 'Disabled buttons');
  assert.equal(patternById('P99'), null);
});
