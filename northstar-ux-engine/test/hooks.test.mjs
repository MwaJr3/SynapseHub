/**
 * Installing the gate.
 *
 * The hook is the difference between an engine that is available and an engine that
 * is used, so the install has to be safe enough to run without reading it first:
 * idempotent, never destructive, and honest when there is no repository to install
 * into. Anything else gets disabled by the second person who meets it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { installHooks } from '../hooks/install.mjs';

function repo() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'northstar-hooks-'));
  execFileSync('git', ['init', '-q', '.'], { cwd: directory });
  return directory;
}

const hookPath = (directory) => path.join(directory, '.git', 'hooks', 'pre-commit');

test('installing writes an executable pre-commit hook that shells out to the engine', () => {
  const directory = repo();
  assert.equal(installHooks(directory, '.'), 0);

  const script = fs.readFileSync(hookPath(directory), 'utf8');
  assert.match(script, /managed by the Northstar UX engine/);
  assert.match(script, /northstar-ux-engine\/hooks\/pre-commit\.mjs/);
  assert.match(script, /NORTHSTAR_SKIP/);
  assert.ok(fs.statSync(hookPath(directory)).mode & 0o111, 'the hook is executable');

  // A shell that cannot parse the hook runs nothing at all, silently.
  execFileSync('sh', ['-n', hookPath(directory)]);
});

test('installing twice is a no-op, not a second hook', () => {
  const directory = repo();
  installHooks(directory, '.');
  const first = fs.readFileSync(hookPath(directory), 'utf8');
  assert.equal(installHooks(directory, '.'), 0);
  assert.equal(fs.readFileSync(hookPath(directory), 'utf8'), first);
  assert.equal(fs.existsSync(`${hookPath(directory)}.pre-northstar`), false);
});

test("someone else's hook is kept and still runs first", () => {
  const directory = repo();
  fs.writeFileSync(hookPath(directory), '#!/bin/sh\necho "the old hook ran"\n');
  fs.chmodSync(hookPath(directory), 0o755);

  installHooks(directory, '.');

  assert.equal(
    fs.readFileSync(`${hookPath(directory)}.pre-northstar`, 'utf8'),
    '#!/bin/sh\necho "the old hook ran"\n',
    'the original is preserved byte for byte',
  );
  const script = fs.readFileSync(hookPath(directory), 'utf8');
  const chainLine = script.indexOf('pre-commit.pre-northstar');
  const engineLine = script.indexOf('pre-commit.mjs');
  assert.ok(chainLine !== -1 && chainLine < engineLine, 'the old hook runs before the gate');
  assert.match(script, /pre-northstar" "\$@" \|\| exit \$\?/, 'a failing old hook still fails the commit');
});

test('no repository means no install, and it says why', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'northstar-nogit-'));
  assert.equal(installHooks(directory, '.'), 2);
  assert.equal(fs.existsSync(path.join(directory, '.git')), false);
});
