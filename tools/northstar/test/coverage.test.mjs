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
import { PATTERNS, engineId, patternById, patternByLegacyId, unautomated } from '../patterns.mjs';
import { renderPatternsDoc } from '../lib/patterns-doc.mjs';
import { RULES } from '../rules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const skills = fs
  .readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

test('the pattern library has 76 canonical ids with no gaps or duplicates, plus the extensions', () => {
  const ids = PATTERNS.map((pattern) => pattern.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicate ids');
  assert.equal(ids.filter((id) => /^P\d\d$/.test(id)).length, 76);
  assert.ok(ids.filter((id) => /^X\d\d$/.test(id)).length >= 12, 'extensions are numbered X01…');
  assert.equal(ids.length, 76 + ids.filter((id) => id.startsWith('X')).length, 'nothing else is in the catalogue');
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
  assert.equal(patternById('P70').name, 'Color Accessibility');
  assert.equal(patternById('P05').name, 'Disabled Buttons');
  assert.equal(patternById('P99'), null);
});

/** The write-ups the engine was built from, read out of the generated TypeScript module. */
function knowledge() {
  const source = fs.readFileSync(path.join(root, 'engine', 'patternKnowledge.ts'), 'utf8');
  return JSON.parse(source.slice(source.indexOf('= [') + 2, source.lastIndexOf('];') + 1));
}

test('the CLI catalogue and the engine catalogue are the same 76 patterns', () => {
  const entries = knowledge();
  assert.equal(entries.length, 76);
  for (const entry of entries) {
    const id = `P${String(entry.number).padStart(2, '0')}`;
    assert.equal(patternById(id)?.name, entry.title, `${id} is "${entry.title}" in both`);
    assert.equal(engineId(id), `P${entry.number}`);
  }
});

test('every pattern keeps the id it had before the numbering was unified', () => {
  const legacy = PATTERNS.filter((pattern) => pattern.legacyId);
  assert.equal(legacy.length, 76, 'all 76 v1.0.x ids are traceable');
  assert.equal(new Set(legacy.map((pattern) => pattern.legacyId)).size, 76);
  assert.equal(patternByLegacyId('P11').id, 'P50', 'old P11 was validation timing; it is P50 now');
  assert.equal(patternByLegacyId('P75').id, 'P01', 'old P75 was modern CSS; it is the :has() pattern now');
  assert.equal(patternByLegacyId('P99'), null);
});

test('PATTERNS.md is exactly what the catalogue renders', () => {
  const onDisk = fs.readFileSync(path.join(root, 'PATTERNS.md'), 'utf8');
  assert.equal(onDisk, renderPatternsDoc(), 'run: node bin/northstar.mjs patterns --markdown > PATTERNS.md');
});

test('severities and pattern ids cannot be confused in a report', () => {
  for (const pattern of PATTERNS) {
    assert.doesNotMatch(pattern.id, /^P[0-3]$/, `${pattern.id} would read as a severity`);
  }
});
