/**
 * The pre-commit gate.
 *
 * It runs on the files being committed, not on the repository, because a gate that
 * audits 41 projects on every commit is a gate people turn off. Three steps:
 *
 *   1. find the staged UI files and the projects they belong to;
 *   2. fix what the fixer can verify, and re-stage those files so the commit
 *      contains the fix rather than the defect;
 *   3. refuse the commit if a P1 or above remains in the staged files.
 *
 * It never commits, never pushes and never touches anything outside the projects it
 * was handed. `NORTHSTAR_SKIP=1` skips it for one commit; the code is on the failure
 * message so nobody has to go looking for it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { discoverProjects, scanProject } from '../engine.mjs';
import { contextFor, fixFile } from '../fixer.mjs';

const UI_FILE = /\.(tsx|jsx|css|scss|html|py)$/i;
const SEVERITY = { P0: 0, P1: 1, P2: 2, P3: 3 };

function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', ...options }).trim();
}

export function stagedFiles(root) {
  const output = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: root });
  return output
    .split('\n')
    .filter(Boolean)
    .filter((file) => UI_FILE.test(file))
    .map((file) => path.resolve(root, file))
    .filter((file) => fs.existsSync(file));
}

function main() {
  if (process.env.NORTHSTAR_SKIP === '1') {
    process.stdout.write('northstar: skipped for this commit (NORTHSTAR_SKIP=1)\n');
    return 0;
  }
  const root = git(['rev-parse', '--show-toplevel']);
  const staged = stagedFiles(root);
  if (!staged.length) return 0;

  const projects = discoverProjects(root);
  const byProject = new Map();
  for (const file of staged) {
    const project = projects
      .filter((entry) => file.startsWith(path.resolve(entry.root) + path.sep) || file === path.resolve(entry.root))
      .sort((a, b) => path.resolve(b.root).length - path.resolve(a.root).length)[0];
    if (!project) continue;
    if (!byProject.has(project.name)) byProject.set(project.name, { project, files: [] });
    byProject.get(project.name).files.push(file);
  }

  const fixedFiles = new Set();
  const remaining = [];
  const touchedProjects = [];

  for (const { project, files } of byProject.values()) {
    const scan = scanProject({ ...project, includeOnly: project.kind === 'server-rendered' ? null : files });
    for (const finding of scan.findings) {
      const absolute = path.join(project.root, finding.file);
      if (!files.includes(absolute) && project.kind !== 'server-rendered') continue;
      if (SEVERITY[finding.severity] > SEVERITY.P2) {
        remaining.push({ ...finding, project: project.name });
        continue;
      }
      if (!fs.existsSync(absolute)) {
        remaining.push({ ...finding, project: project.name });
        continue;
      }
      const raw = fs.readFileSync(absolute, 'utf8');
      const result = fixFile({
        absolute,
        context: contextFor(project, finding.file, raw),
        findings: [finding],
        kind: project.kind,
      });
      if (result.changed) {
        fixedFiles.add(absolute);
        if (!touchedProjects.includes(project)) touchedProjects.push(project);
      }
      if (!result.changed && SEVERITY[finding.severity] <= SEVERITY.P1) {
        remaining.push({ ...finding, project: project.name });
      }
    }
  }

  if (fixedFiles.size) {
    // A fix is only a fix if the rule stops firing. Re-scan the files the fixer
    // touched and let anything still at P1 or above block the commit — otherwise a
    // partial repair re-stages the defect and reports success.
    for (const project of touchedProjects) {
      const changed = [...fixedFiles].filter((file) =>
        file.startsWith(path.resolve(project.root) + path.sep),
      );
      if (!changed.length) continue;
      const rescan = scanProject({ ...project, includeOnly: changed });
      for (const finding of rescan.findings) {
        if (SEVERITY[finding.severity] > SEVERITY.P1) continue;
        if (remaining.some((entry) => entry.file === finding.file && entry.line === finding.line && entry.id === finding.id && entry.project === project.name)) continue;
        remaining.push({ ...finding, project: project.name });
      }
    }
    git(['add', ...fixedFiles], { cwd: root });
    process.stdout.write(`northstar: fixed and re-staged ${fixedFiles.size} file(s):\n`);
    for (const file of fixedFiles) process.stdout.write(`  ${path.relative(root, file)}\n`);
  }

  const blocking = remaining.filter((finding) => SEVERITY[finding.severity] <= SEVERITY.P1);
  if (blocking.length) {
    process.stderr.write('\nnorthstar: the commit is blocked by defects at P1 or above:\n');
    for (const finding of blocking) {
      process.stderr.write(`  ${finding.severity} ${finding.project} ${finding.file}:${finding.line} ${finding.title}\n`);
    }
    process.stderr.write(
      '\nThese need a decision, not a substitution. Run `node northstar-ux-engine/bin/northstar.mjs audit .`\n' +
        'for the full rationale and fix for each one. Skip this gate for one commit with\n' +
        '`NORTHSTAR_SKIP=1 git commit ...` if you are committing something unrelated.\n',
    );
    return 1;
  }
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  // A gate that crashes must not block work it cannot judge. Say so loudly and let
  // the commit through: a false block teaches people to bypass the gate entirely.
  process.stderr.write(`northstar: the pre-commit gate failed to run (${error.message}); the commit was allowed\n`);
  process.exitCode = 0;
}
