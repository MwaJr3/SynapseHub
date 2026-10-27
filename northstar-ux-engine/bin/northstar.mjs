#!/usr/bin/env node
/**
 * `northstar` — the engine's command line.
 *
 * Four verbs, matching the four slash commands:
 *
 *   audit  [path]   scan one project or the whole repository, write a report
 *   review [path]   scan only the files changed against a git ref (read-only)
 *   check  [path]   exit non-zero if any defect at or above a severity exists
 *   patterns        print the pattern index the skills reference
 *
 * No dependency outside Node's standard library, so the plugin works in a fresh
 * clone with no install step and no network.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { discoverProjects, detectSurface, scanProject, scanRepository } from '../engine.mjs';
import { renderReport } from '../report.mjs';
import { PATTERNS } from '../patterns.mjs';

const SEVERITIES = ['P0', 'P1', 'P2', 'P3'];

function parseArguments(argv) {
  const [verb = 'audit', ...rest] = argv;
  const options = { verb, target: '.', out: null, json: null, minSeverity: 'P3', ref: 'HEAD', quiet: false };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === '--out') options.out = rest[++index];
    else if (argument === '--json') options.json = rest[++index];
    else if (argument === '--min') options.minSeverity = rest[++index];
    else if (argument === '--ref') options.ref = rest[++index];
    else if (argument === '--quiet') options.quiet = true;
    else options.target = argument;
  }
  if (!SEVERITIES.includes(options.minSeverity)) {
    throw new Error(`--min must be one of ${SEVERITIES.join(', ')}`);
  }
  return options;
}

/**
 * Resolve a target to the projects it names.
 *
 * `audit apps/tessera` is one project; `audit apps` is every project underneath it,
 * not the repository that contains them. Matching the longest project root that is
 * an ancestor of the target keeps those two cases honest.
 */
function projectsFor(target) {
  const root = path.resolve(target);
  if (!fs.existsSync(root)) throw new Error(`No such path: ${target}`);
  const discovered = discoverProjects(process.cwd());
  const exact = discovered.find((project) => path.resolve(project.root) === root);
  if (exact) return [exact];
  const inside = discovered.filter((project) => {
    const projectRoot = path.resolve(project.root);
    return projectRoot.startsWith(root + path.sep);
  });
  if (inside.length) return inside.sort((a, b) => a.name.localeCompare(b.name));
  const containing = discovered
    .filter((project) => root.startsWith(path.resolve(project.root) + path.sep))
    .sort((a, b) => path.resolve(b.root).length - path.resolve(a.root).length)[0];
  if (containing) return [containing];
  // An arbitrary directory (a fixture, a package passed by path): treat it as a
  // React-shaped UI and read its surface the same way discovery does.
  return [{ name: path.basename(root) || root, root, kind: 'react-spa', surface: detectSurface(root) }];
}

/** Files changed against a ref, limited to UI extensions. */
function changedFiles(ref) {
  let output = '';
  try {
    output = execFileSync('git', ['diff', '--name-only', `${ref}...HEAD`], { encoding: 'utf8' });
    output += execFileSync('git', ['diff', '--name-only', ref], { encoding: 'utf8' });
    output += execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' });
  } catch (error) {
    throw new Error(`git diff against ${ref} failed: ${error.message}`);
  }
  return [...new Set(output.split('\n').filter(Boolean))]
    .filter((file) => /\.(tsx|jsx|css|scss|html|py)$/i.test(file))
    .filter((file) => fs.existsSync(file))
    .map((file) => path.resolve(file));
}

function writeIfRequested(file, contents) {
  if (!file) return;
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, contents, 'utf8');
}

function main(argv) {
  const options = parseArguments(argv);

  if (options.verb === 'patterns') {
    for (const pattern of PATTERNS) {
      process.stdout.write(`${pattern.id}\t${pattern.name}\t${pattern.checks.join(', ')}\n`);
    }
    return 0;
  }

  if (options.verb === 'review') {
    const project = projectsFor(options.target)[0];
    const files = changedFiles(options.ref);
    const inside = files.filter((file) => file.startsWith(path.resolve(project.root) + path.sep));
    const raw = scanProject({ ...project, includeOnly: inside });
    const text = renderReport(
      { projectCount: 1, projects: [raw] },
      { title: `UX review · ${project.name} · changes against ${options.ref}`, top: 3 },
    );
    writeIfRequested(options.out, text);
    if (!options.quiet) process.stdout.write(`${text}\n`);
    return 0;
  }

  if (options.verb === 'check') {
    const report = scanRepository(process.cwd());
    const threshold = SEVERITIES.indexOf(options.minSeverity);
    const failing = report.projects
      .flatMap((project) => project.findings.map((finding) => ({ ...finding, project: project.name })))
      .filter((finding) => SEVERITIES.indexOf(finding.severity) <= threshold);
    for (const finding of failing) {
      process.stderr.write(`${finding.severity} ${finding.project} ${finding.file}:${finding.line} ${finding.title}\n`);
    }
    process.stdout.write(
      `${failing.length} defect(s) at ${options.minSeverity} or above across ${report.projectCount} projects\n`,
    );
    return failing.length ? 1 : 0;
  }

  // `audit`: one target, a tree of projects, or the whole repository.
  const isRoot = path.resolve(options.target) === path.resolve('.');
  const targets = isRoot ? null : projectsFor(options.target);
  const projects = targets ? targets.map((project) => scanProject(project)) : scanRepository(process.cwd()).projects;
  const report = { projectCount: projects.length, projects };
  const label = isRoot ? 'repository' : targets.length === 1 ? targets[0].name : `${options.target} (${targets.length} projects)`;
  const text = renderReport(report, { title: `UX audit · ${label}` });
  writeIfRequested(options.out, text);
  writeIfRequested(options.json, `${JSON.stringify(report, null, 2)}\n`);
  if (!options.quiet) process.stdout.write(`${text}\n`);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`northstar: ${error.message}\n`);
  process.exitCode = 2;
}
