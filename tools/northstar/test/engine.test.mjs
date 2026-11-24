/**
 * Engine behaviour tests, calibrated on the fixtures.
 *
 * The important test here is not "the engine finds things". It is the pair:
 *
 *   - the deliberately broken fixture must produce exactly the planted defects;
 *   - the nearly-correct fixture must produce exactly one.
 *
 * A checker that fires on everything scores 100% on the first and fails the second.
 * Both are asserted, together with the contrast maths against published values, so
 * a regression in the colour parser shows up as a wrong ratio rather than as a
 * quietly different report.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rank, scanProject, summarise } from '../engine.mjs';
import { contrast, ratio } from '../lib/contrast.mjs';
import { coloursIn, resolveUtility } from '../lib/palette.mjs';
import { detectSurface } from '../lib/project.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const scan = (name) =>
  scanProject({ name: `fixtures/${name}`, root: path.join(root, 'fixtures', name), kind: 'react-spa', surface: detectSurface(path.join(root, 'fixtures', name)) });

const ids = (project) => project.findings.map((finding) => finding.id).sort();
const countOf = (project, id) => project.findings.filter((finding) => finding.id === id).length;

test('contrast reproduces the published WCAG reference values', () => {
  assert.equal(ratio('#767676', '#ffffff'), 4.54, 'the canonical 4.54:1 pair');
  assert.equal(ratio('#000000', '#ffffff'), 21);
  assert.equal(ratio('#ffffff', '#ffffff'), 1);
  assert.equal(contrast('#ffffff', '#0891b2').toFixed(2), '3.68');
  // Symmetry: the order of the arguments cannot change the ratio.
  assert.equal(ratio('#0891b2', '#ffffff'), ratio('#ffffff', '#0891b2'));
});

test('the palette resolves the utilities this repository actually uses', () => {
  assert.deepEqual(resolveUtility('text-slate-500'), { kind: 'text', colour: '#64748b', alpha: 1 });
  assert.deepEqual(resolveUtility('bg-slate-900/70'), { kind: 'bg', colour: '#0f172a', alpha: 0.7 });
  assert.equal(resolveUtility('bg-brand-600'), null, 'theme colours are not guessed');
  assert.equal(resolveUtility('text-sm'), null, 'a size is not a colour');
  const colours = coloursIn('rounded-lg bg-white/5 text-slate-200 hover:text-white');
  assert.equal(colours.text.length, 1, 'the hover variant is ignored, the resting one is not');
  assert.equal(colours.background[0].alpha, 0.05);
});

test('a dark product is not measured against a white page', () => {
  assert.equal(detectSurface(path.join(root, 'fixtures', 'dashboard-missing-states')), '#0b1220');
  assert.equal(detectSurface(path.join(root, 'fixtures', 'accessible-markup-with-defect')), '#0b1220');
  assert.equal(detectSurface(path.join(root, 'fixtures', 'bad-form')), '#ffffff');
});

test('the bad-form fixture produces exactly its planted defects', () => {
  const project = scan('bad-form');
  assert.deepEqual(ids(project), [
    'bare-loading',
    'disabled-without-reason',
    'native-alert',
    'no-focus-style',
    'password-autocomplete',
    'text-contrast',
    'unlabelled-input',
  ]);
  assert.equal(project.summary.bySeverity.P0, 0, 'nothing here blocks the task outright');
  assert.equal(project.summary.bySeverity.P1, 2, 'two inputs with no accessible name, one stylesheet with no focus style');
  const contrast = project.findings.find((finding) => finding.id === 'text-contrast');
  assert.equal(contrast.detail, '#ffffff on #0891b2 = 3.68:1');
});

test('the accessible fixture produces exactly one finding', () => {
  const project = scan('accessible-markup-with-defect');
  assert.equal(project.findings.length, 1, 'a nearly-correct screen must not be flooded');
  const [finding] = project.findings;
  assert.equal(finding.id, 'text-contrast');
  assert.equal(finding.detail, '#64748b on #0b1220 = 3.93:1');
  assert.equal(finding.file, 'src/Reports.tsx');
  assert.equal(finding.pattern, 'P70');
});

test('the dashboard fixture finds the states the component never wrote', () => {
  const project = scan('dashboard-missing-states');
  assert.deepEqual(ids(project), ['bare-loading', 'numeric-cells', 'swallowed-error', 'table-semantics']);
  assert.equal(countOf(project, 'table-semantics'), 1, 'two unscoped headers are one finding with a count');
  assert.equal(project.findings.find((f) => f.id === 'table-semantics').occurrences, 2);
});

test('the overflow fixture finds the fixed width rather than guessing at layout', () => {
  const project = scan('overflow-layout');
  const fixed = project.findings.find((finding) => finding.id === 'fixed-width-container');
  assert.ok(fixed, 'the 520px panel is reported');
  assert.equal(fixed.detail, '520px');
  assert.equal(fixed.file, 'src/styles.css');
});

test('the token fixture finds the scale drift and the literals', () => {
  const project = scan('inconsistent-tokens');
  assert.equal(countOf(project, 'raw-colour-in-class'), 2);
  const radius = project.findings.find((finding) => finding.id === 'radius-off-scale');
  assert.match(radius.detail, /6 values/);
  assert.ok(project.findings.some((finding) => finding.id === 'zindex-arms-race'));
});

test('findings are ordered by severity and stable between runs', () => {
  const first = scan('bad-form');
  const second = scan('bad-form');
  assert.deepEqual(first.findings, second.findings, 'the same tree produces the same report');
  const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
  const severities = first.findings.map((finding) => order[finding.severity]);
  assert.deepEqual(severities, [...severities].sort((a, b) => a - b));
});

test('aggregation counts occurrences without duplicating the defect', () => {
  const project = scan('dashboard-missing-states');
  const raw = { total: 5, bySeverity: { P0: 0, P1: 0, P2: 3, P3: 2 }, byRule: {}, byPattern: {} };
  assert.equal(project.findings.length, 4, 'two headers collapse into one row');
  assert.ok(project.occurrences >= project.findings.length);
  assert.deepEqual(summarise([]), { ...raw, total: 0, bySeverity: { P0: 0, P1: 0, P2: 0, P3: 0 } });
});

test('ranking is deterministic and keeps the project in the key', () => {
  const a = { id: 'x', file: 'src/App.tsx', line: 1, project: 'one', severity: 'P2', aggregate: 'file' };
  const b = { id: 'x', file: 'src/App.tsx', line: 1, project: 'two', severity: 'P2', aggregate: 'file' };
  const ranked = rank([a, b, { ...a }]);
  assert.equal(ranked.length, 2, 'the same path in two products is two files');
  assert.equal(ranked.find((finding) => finding.project === 'one').occurrences, 2);
});

test('the keyboard-and-media fixture finds exactly the planted defects and spares the correct twins', () => {
  const project = scan('keyboard-and-media');
  assert.deepEqual(ids(project), [
    'click-on-non-interactive',
    'image-without-dimensions',
    'input-type-generic',
    'tabindex-positive',
  ]);
  const byId = (id) => project.findings.find((finding) => finding.id === id);
  assert.equal(byId('click-on-non-interactive').detail, '<div onClick>');
  assert.equal(byId('click-on-non-interactive').occurrences ?? 1, 1, 'the backdrop and stopPropagation wrappers are not reported');
  assert.equal(byId('tabindex-positive').detail, 'tabindex=3', 'tabIndex={0} is fine; only the positive value is reported');
  assert.equal(byId('input-type-generic').detail, 'looks like type="email"');
  assert.equal(byId('image-without-dimensions').occurrences ?? 1, 1, 'the sized image is not reported');
  assert.equal(byId('tabindex-positive').pattern, 'P46');
  assert.equal(byId('click-on-non-interactive').pattern, 'X13');
});

test('the auth-and-motion fixture finds the planted defects and spares the correct twins', () => {
  const project = scan('auth-and-motion');
  assert.deepEqual(ids(project), [
    'accordion-without-expanded',
    'linear-easing',
    'no-reduced-motion',
    'otp-autocomplete',
    'password-autocomplete',
    'transition-all',
  ]);
  const byId = (id) => project.findings.find((finding) => finding.id === id);
  assert.match(byId('password-autocomplete').detail, /no autocomplete/);
  assert.equal(byId('password-autocomplete').occurrences ?? 1, 1, 'the new-password field is fine');
  assert.equal(byId('otp-autocomplete').occurrences ?? 1, 1, 'the one-time-code field is fine');
  assert.equal(byId('linear-easing').occurrences ?? 1, 1, 'a linear spinner animation is not a transition');
  assert.equal(byId('accordion-without-expanded').pattern, 'P62');
});

test('the video-patterns fixture finds the planted defects and spares the correct twins', () => {
  const project = scan('video-patterns');
  assert.deepEqual(ids(project), [
    'ai-cliche-copy',
    'dark-pure-black',
    'dark-pure-black',
    'file-input-accept',
    'gradient-opposed-hues',
    'invalid-on-load',
    'invalid-without-description',
    'paste-blocked',
    'progress-without-value',
    'switch-without-checked',
    'truncated-bar-axis',
    'validate-on-every-keystroke',
    'zindex-without-position',
  ]);
  const byId = (id) => project.findings.find((finding) => finding.id === id);
  assert.equal(byId('truncated-bar-axis').occurrences ?? 1, 1, 'the zero-based chart is fine');
  assert.equal(byId('switch-without-checked').occurrences ?? 1, 1, 'the switch with aria-checked is fine');
  assert.equal(byId('invalid-on-load').occurrences ?? 1, 1, ':user-invalid is fine');
});

test('the second-pass fixture finds icon buttons, silent toasts and mouse-only drag', () => {
  const project = scan('second-pass');
  assert.deepEqual(ids(project), ['draggable-no-keyboard', 'icon-button-unnamed', 'toast-no-live-region']);
  const byId = (id) => project.findings.find((finding) => finding.id === id);
  assert.equal(byId('icon-button-unnamed').occurrences ?? 1, 1, 'the labelled icon button is fine');
  assert.equal(byId('toast-no-live-region').occurrences ?? 1, 1, 'the role=status toast is fine');
});
