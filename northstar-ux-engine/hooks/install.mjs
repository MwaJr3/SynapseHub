/**
 * Install the gate that makes the engine part of the workflow instead of a tool
 * someone remembers.
 *
 * Two rules about installing a git hook, both learned the hard way:
 *
 * * **Never silently replace someone's hook.** If `.git/hooks/pre-commit` exists and
 *   was not written by this engine, it is renamed to `pre-commit.pre-northstar` and
 *   the new hook chains to it, so the reviewer that was already there still runs.
 * * **Never install into a repository nobody asked about.** The repository root is
 *   the one containing `.git`; if there is none, say so and stop.
 */

import fs from 'node:fs';
import path from 'node:path';

const MARKER = '# managed by the Northstar UX engine';

function gitRoot(start) {
  let directory = path.resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
    if (fs.existsSync(path.join(directory, '.git'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return null;
}

export function installHooks(cwd, target = '.') {
  const root = gitRoot(target === '.' ? cwd : path.resolve(cwd, target));
  if (!root) {
    process.stderr.write('northstar: no .git directory above this path; there is nothing to install into\n');
    return 2;
  }
  const hooksDirectory = path.join(root, '.git', 'hooks');
  fs.mkdirSync(hooksDirectory, { recursive: true });

  const hookPath = path.join(hooksDirectory, 'pre-commit');
  const backupPath = path.join(hooksDirectory, 'pre-commit.pre-northstar');
  let chain = false;

  if (fs.existsSync(hookPath)) {
    const existing = fs.readFileSync(hookPath, 'utf8');
    if (existing.includes(MARKER)) {
      process.stdout.write(`northstar: the pre-commit hook is already installed in ${root}\n`);
      return 0;
    }
    if (!fs.existsSync(backupPath)) {
      fs.renameSync(hookPath, backupPath);
      chain = true;
    }
  }

  const script = `#!/bin/sh
${MARKER}
# It fixes what is provably mechanical in the files being committed, re-stages them,
# then refuses the commit if anything at P1 or above is still there. Skip with
# NORTHSTAR_SKIP=1 for one commit when you know what you are doing.
${
  chain
    ? `"$(dirname "$0")/pre-commit.pre-northstar" "$@" || exit $?\n`
    : ''
}exec node "$(git rev-parse --show-toplevel)/northstar-ux-engine/hooks/pre-commit.mjs" "$@"
`;
  fs.writeFileSync(hookPath, script, 'utf8');
  fs.chmodSync(hookPath, 0o755);

  process.stdout.write(
    `northstar: installed the pre-commit gate in ${path.relative(cwd, hookPath) || hookPath}` +
      `${chain ? ' (the previous hook is kept and runs first)' : ''}\n`,
  );
  return 0;
}
