/**
 * Safety and scope tests.
 *
 * The plugin runs inside someone's repository with their credentials in the
 * environment. Three promises have to be mechanically true, not merely written
 * down: it does not commit or deploy, it does not phone home, and it does not read
 * or write secrets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const run = (command, env = {}) =>
  spawnSync(process.execPath, [path.join(root, 'hooks', 'guard-writes.mjs')], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
    env: { ...process.env, NORTHSTAR_ALLOW_GIT: '', ...env },
  });

test('the guard blocks commits, pushes and deploys', () => {
  for (const command of [
    'git commit -m "ux fixes"',
    'git push origin main',
    'git reset --hard HEAD~3',
    'npm publish --access public',
    'vercel deploy --prod',
  ]) {
    const result = run(command);
    assert.equal(result.status, 2, `${command} is blocked`);
    assert.match(result.stderr, /authorisation/);
  }
});

test('the guard allows the reads a review needs', () => {
  for (const command of ['git status --porcelain', 'git diff HEAD', 'node northstar-ux-engine/bin/northstar.mjs audit .']) {
    assert.equal(run(command).status, 0, `${command} is allowed`);
  }
});

test('the guard is bypassable on purpose, and says so', () => {
  const result = run('git commit -m intentionally', { NORTHSTAR_ALLOW_GIT: '1' });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /NORTHSTAR_ALLOW_GIT=1/);
});

test('the guard ignores tools it does not police, and malformed input', () => {
  const readCall = spawnSync(process.execPath, [path.join(root, 'hooks', 'guard-writes.mjs')], {
    input: JSON.stringify({ tool_name: 'Read', tool_input: { file_path: 'README.md' } }),
    encoding: 'utf8',
  });
  assert.equal(readCall.status, 0);
  const junk = spawnSync(process.execPath, [path.join(root, 'hooks', 'guard-writes.mjs')], {
    input: 'not json',
    encoding: 'utf8',
  });
  assert.equal(junk.status, 0, 'a broken payload must not block the user');
  const empty = spawnSync(process.execPath, [path.join(root, 'hooks', 'guard-writes.mjs')], {
    input: '',
    encoding: 'utf8',
  });
  assert.equal(empty.status, 0);
});

test('nothing in the plugin makes a network call', () => {
  const offenders = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(mjs|js|json|md|tsx?|css)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, 'utf8');
      // `fetch(` in prose is fine; importing a network client is not.
      if (/\bfrom\s+['"](node:)?(https?|net|dgram|tls)['"]/.test(text)) offenders.push(full);
      if (/\brequire\(['"](https?|net)['"]\)/.test(text)) offenders.push(full);
      if (/\bhttps?:\/\/[^\s)]+\/api\/[^\s)]*/.test(text) && !/example\.(com|test)/.test(text)) {
        offenders.push(`${full} (hard-coded API URL)`);
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], `no network use: ${offenders.join(', ')}`);
});

test('nothing in the plugin reads credentials or environment secrets', () => {
  const walk = (directory, found = []) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        // The tests themselves set the override in a child process environment.
        if (entry.name === 'test' || entry.name === 'fixtures') continue;
        walk(full, found);
        continue;
      }
      if (!/\.(mjs|js)$/.test(entry.name)) continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const match of text.matchAll(/process\.env\.([A-Z_]+)/g)) found.push(match[1]);
      if (/\.ssh|\.aws|id_rsa|\.netrc|credentials/i.test(text)) found.push(`path-like secret access in ${full}`);
    }
    return found;
  };
  const variables = new Set(walk(root));
  assert.deepEqual([...variables], ['NORTHSTAR_ALLOW_GIT'], 'the only environment variable read is the documented override');
});

test('the engine never writes outside the paths it is asked to write', () => {
  const cli = fs.readFileSync(path.join(root, 'bin', 'northstar.mjs'), 'utf8');
  const writes = [...cli.matchAll(/writeFileSync\(([^,]+),/g)].map((match) => match[1].trim());
  assert.ok(writes.length >= 1);
  for (const target of writes) assert.match(target, /file|options/, `write target ${target} comes from the caller`);
  assert.ok(!/rmSync|unlinkSync|renameSync/.test(cli), 'the CLI never deletes or moves anything');
});

test('the audit command cannot be triggered into editing files', () => {
  const text = fs.readFileSync(path.join(root, 'commands', 'ux-audit.md'), 'utf8');
  assert.match(text, /report only/i);
  const allowed = /allowed-tools:(.*)/.exec(text)?.[1] ?? '';
  assert.ok(!/\bEdit\b|\bWrite\b/.test(allowed), 'audit mode grants no write tool');
});

test('license and changelog exist so a team can adopt this and know its terms', () => {
  const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8');
  assert.match(license, /MIT License/);
  assert.match(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), /Unreleased/);
});
