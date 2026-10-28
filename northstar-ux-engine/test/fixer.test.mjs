/**
 * The fixer's contract.
 *
 * A tool that edits source has one promise to keep: it must not report a fix it did
 * not make, and it must not make a change it cannot justify. Every test here is
 * either "it fixed the thing and the rule now passes" or "it refused, and the file
 * is byte-identical to what it was".
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { scanProject } from '../engine.mjs';
import { REFUSALS, contextFor, fixFile, isFixable, planFix } from '../fixer.mjs';

function scratch(files) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'northstar-fix-'));
  for (const [name, contents] of Object.entries(files)) {
    const target = path.join(directory, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, 'utf8');
  }
  return directory;
}

function projectAt(directory, kind = 'react-spa', surface = '#ffffff') {
  return { name: 'scratch', root: directory, kind, surface, exclude: [] };
}

function read(directory, name) {
  return fs.readFileSync(path.join(directory, name), 'utf8');
}

const CSS_NO_FOCUS = `.btn { background: #0e7490; color: #ffffff; padding: 8px 14px; }
input { border: 1px solid #cccccc; }
`;

test('a stylesheet with no focus style gets one, and the rule stops firing', () => {
  const directory = scratch({ 'src/styles.css': CSS_NO_FOCUS });
  const project = projectAt(directory);
  const before = scanProject(project);
  assert.equal(before.findings.filter((finding) => finding.id === 'no-focus-style').length, 1);

  const raw = read(directory, 'src/styles.css');
  const result = fixFile({
    absolute: path.join(directory, 'src/styles.css'),
    context: contextFor(project, 'src/styles.css', raw),
    findings: before.findings.filter((finding) => finding.id === 'no-focus-style'),
  });

  assert.equal(result.applied.length, 1);
  const after = scanProject(project);
  assert.equal(after.findings.filter((finding) => finding.id === 'no-focus-style').length, 0);
  assert.match(read(directory, 'src/styles.css'), /:focus-visible\s*\{/);
});

test('a failing button surface is darkened, not its white label', () => {
  const directory = scratch({
    'src/styles.css': `.btn-primary {\n  @apply bg-cyan-600 text-white hover:bg-cyan-500;\n}\n`,
  });
  const project = projectAt(directory);
  const findings = scanProject(project).findings.filter((finding) => finding.id === 'text-contrast');
  assert.ok(findings.length >= 1, 'the fixture really does fail the contrast rule');

  const raw = read(directory, 'src/styles.css');
  fixFile({
    absolute: path.join(directory, 'src/styles.css'),
    context: contextFor(project, 'src/styles.css', raw),
    findings,
  });

  const text = read(directory, 'src/styles.css');
  assert.match(text, /bg-cyan-700/, 'the surface moved a step darker');
  assert.match(text, /text-white/, 'the label did not move');
  assert.equal(scanProject(project).findings.filter((finding) => finding.id === 'text-contrast').length, 0);
});

test('on a dark surface the muted text is lightened', () => {
  const directory = scratch(
    { 'src/pages.tsx': `export function A() {\n  return <p className="text-xs text-slate-500">Note</p>;\n}\n` },
    'react-spa',
    '#0b1220',
  );
  const project = projectAt(directory, 'react-spa', '#0b1220');
  const findings = scanProject(project).findings.filter((finding) => finding.id === 'text-contrast');
  assert.equal(findings.length, 1);

  const raw = read(directory, 'src/pages.tsx');
  fixFile({
    absolute: path.join(directory, 'src/pages.tsx'),
    context: contextFor(project, 'src/pages.tsx', raw),
    findings,
  });
  assert.match(read(directory, 'src/pages.tsx'), /text-slate-400/);
  assert.equal(scanProject(project).findings.filter((finding) => finding.id === 'text-contrast').length, 0);
});

test('every occurrence of an aggregated finding is fixed, not just the reported one', () => {
  const line = `  return <p className="text-xs text-slate-500">Note</p>;\n`;
  const directory = scratch(
    { 'src/pages.tsx': `export function A() {\n${line}${line}${line}}\n` },
    'react-spa',
    '#0b1220',
  );
  const project = projectAt(directory, 'react-spa', '#0b1220');
  const findings = scanProject(project).findings.filter((finding) => finding.id === 'text-contrast');
  assert.equal(findings.length, 1, 'the report aggregates them into one finding');

  const raw = read(directory, 'src/pages.tsx');
  const result = fixFile({
    absolute: path.join(directory, 'src/pages.tsx'),
    context: contextFor(project, 'src/pages.tsx', raw),
    findings,
  });
  assert.equal(result.applied.length, 3, 'all three occurrences were fixed');
  assert.equal((read(directory, 'src/pages.tsx').match(/text-slate-500/g) ?? []).length, 0);
});

test('a defect that needs a human is refused, and the file is untouched', () => {
  const source = `export function A() {\n  return <button onClick={() => alert('Saved')}>Save</button>;\n}\n`;
  const directory = scratch({ 'src/pages.tsx': source });
  const project = projectAt(directory);
  const findings = scanProject(project).findings.filter((finding) => finding.id === 'native-alert');
  assert.equal(findings.length, 1);
  assert.equal(isFixable(findings[0]), false);

  const result = fixFile({
    absolute: path.join(directory, 'src/pages.tsx'),
    context: contextFor(project, 'src/pages.tsx', source),
    findings,
  });
  assert.equal(result.applied.length, 0);
  assert.equal(result.refused.length, 1);
  assert.equal(result.refused[0].reason, REFUSALS['native-alert']);
  assert.equal(read(directory, 'src/pages.tsx'), source);
});

test('a server-rendered page is refused wholesale, because its offsets live in Python', () => {
  const source = `HTML = """<html><style>.btn{color:#fff;background:#0891b2}</style><body><button class="btn">Go</button></body></html>"""\n`;
  const directory = scratch({ 'app/main.py': source });
  const project = projectAt(directory, 'server-rendered');
  const findings = scanProject(project).findings;
  assert.ok(findings.length > 0, 'the fixture has defects');

  const result = fixFile({
    absolute: path.join(directory, 'app/main.py'),
    context: contextFor(project, 'app/main.py', source),
    findings,
    kind: 'server-rendered',
  });
  assert.equal(result.applied.length, 0);
  assert.ok(result.refused.length >= findings.length - 1 || result.refused.length > 0);
  assert.equal(read(directory, 'app/main.py'), source);
});

test('a plan whose colour is not on the line is refused rather than guessed at', () => {
  const source = `export function A() {\n  return <p className="text-xs text-slate-500">Note</p>;\n}\n`;
  const context = { relPath: 'src/pages.tsx', kind: 'jsx', surface: '#ffffff', raw: source };
  const finding = {
    id: 'text-contrast',
    severity: 'P2',
    file: 'src/pages.tsx',
    line: 2,
    // A pair that is not on the line the finding points at.
    detail: '#123456 on #ffffff = 2.00:1',
  };
  const plan = planFix(finding, context, source);
  assert.ok(plan.refuse, 'it says why it cannot place the edit');
  assert.match(plan.refuse, /could not be moved|not be located|neither side/);
});

test('a dry run reports the fix and writes nothing', () => {
  const directory = scratch({ 'src/styles.css': CSS_NO_FOCUS });
  const project = projectAt(directory);
  const findings = scanProject(project).findings.filter((finding) => finding.id === 'no-focus-style');
  const result = fixFile({
    absolute: path.join(directory, 'src/styles.css'),
    context: contextFor(project, 'src/styles.css', CSS_NO_FOCUS),
    findings,
    dryRun: true,
  });
  assert.equal(result.applied.length, 1);
  assert.equal(result.changed, false);
  assert.equal(read(directory, 'src/styles.css'), CSS_NO_FOCUS);
});

test('the refusals table explains every rule it declines', () => {
  // A refusal with no reason is how "not fixed" silently becomes "not noticed".
  for (const [rule, reason] of Object.entries(REFUSALS)) {
    assert.ok(reason.length > 30, `${rule} explains itself`);
  }
});
