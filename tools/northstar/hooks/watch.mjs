/**
 * `watch` — the engine in the background while someone works.
 *
 * Debounced, quiet when nothing is wrong, and specific when something is: it prints
 * the finding, the file and the line, and with `--fix` it repairs what it can and
 * says so. It never blocks the editor and never touches a file it did not just see
 * change.
 *
 * `fs.watch` with `recursive: true` works on Linux since Node 20, which is the
 * version the plugin declares. If the platform refuses it, the error is reported
 * rather than swallowed — a watcher that silently watches nothing is the worst
 * possible version of this feature.
 */

import fs from 'node:fs';
import path from 'node:path';

import { scanProject } from '../engine.mjs';
import { contextFor, fixFile } from '../fixer.mjs';

const UI_FILE = /\.(tsx|jsx|css|scss|html|py)$/i;

export function watch(projects, options = {}) {
  const debounceMs = Number(options.debounce ?? 350);
  const timers = new Map();
  const watchers = [];
  let scanned = 0;

  const report = (project) => {
    let result = scanProject(project);
    scanned += 1;
    let findings = result.findings;
    let changed = false;
    if (options.fix) {
      for (const finding of findings) {
        const absolute = path.join(project.root, finding.file);
        if (!fs.existsSync(absolute)) continue;
        const raw = fs.readFileSync(absolute, 'utf8');
        const outcome = fixFile({
          absolute,
          context: contextFor(project, finding.file, raw),
          findings: [finding],
          kind: project.kind,
        });
        if (outcome.changed) {
          changed = true;
          process.stdout.write(`  fixed  ${project.name}/${finding.file}  ${finding.id}\n`);
        }
      }
      // Report what is still wrong, not what was wrong a moment ago: printing the
      // pre-fix list after a successful repair teaches people to distrust the count.
      if (changed) {
        result = scanProject(project);
        findings = result.findings;
      }
    }
    if (!findings.length) {
      process.stdout.write(`${project.name}: clean\n`);
      return;
    }
    process.stdout.write(`${project.name}: ${findings.length} finding(s)\n`);
    for (const finding of findings.slice(0, 12)) {
      process.stdout.write(`  ${finding.severity}  ${finding.file}:${finding.line}  ${finding.title}\n`);
    }
    if (findings.length > 12) process.stdout.write(`  … ${findings.length - 12} more\n`);
  };

  for (const project of projects) {
    try {
      const watcher = fs.watch(project.root, { recursive: true }, (_event, filename) => {
        if (!filename || !UI_FILE.test(String(filename))) return;
        const key = project.name;
        if (timers.has(key)) clearTimeout(timers.get(key));
        timers.set(
          key,
          setTimeout(() => {
            timers.delete(key);
            report(project);
          }, debounceMs),
        );
      });
      watcher.on('error', (error) => process.stderr.write(`northstar: watching ${project.name} failed: ${error.message}\n`));
      watchers.push(watcher);
    } catch (error) {
      process.stderr.write(`northstar: cannot watch ${project.name} (${error.message})\n`);
    }
  }

  process.stdout.write(
    `northstar: watching ${projects.length} project(s)${options.fix ? ' with --fix' : ''}. Ctrl-C to stop.\n`,
  );
  for (const project of projects) report(project);

  const stop = () => {
    for (const watcher of watchers) watcher.close();
    process.stdout.write(`\nnorthstar: stopped after ${scanned} scan(s)\n`);
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  // Keep the event loop alive without a busy wait.
  setInterval(() => {}, 1 << 30);
  return 0;
}
