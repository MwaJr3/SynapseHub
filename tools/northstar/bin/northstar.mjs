#!/usr/bin/env node
/**
 * `northstar` — the engine's command line.
 *
 * Seven verbs. The first four match the slash commands; the last three are what
 * make the engine a background fixer rather than a report someone has to remember
 * to read:
 *
 *   audit   [path]  severity-ranked P0-P3 audit of one project or the repository
 *   scan            the static detector layer over every frontend, with evidence
 *   review  [path]  scan only the files changed against a git ref (read-only)
 *   check   [path]  exit non-zero if any defect at or above a severity exists
 *   page <url|file> measure a page in a real browser at several widths (needs Playwright)
 *   patterns        print the pattern index the skills reference (--markdown renders PATTERNS.md)
 *   fix     [path]  apply the mechanical fixes, verify each one, refuse the rest
 *   watch   [path]  re-audit on save; with --fix, re-fix too
 *   add <set> …     copy decorative components into an app (decor, or the optional magicui set)
 *   hooks           install the pre-commit gate that runs `fix` then `check`
 *
 * Two detector layers, one command line. `audit`/`check`/`fix`/`watch` are the
 * severity-ranked layer in `engine.mjs`/`rules.mjs`. `scan` is the source-detector
 * layer in `engine/` (TypeScript, run through vite-node), which writes the
 * file:line evidence report the CI gate diffs. They check different things and
 * both are needed; before this merge they were two separate tools in two trees,
 * which is how two of them once ended up writing the same report file.
 *
 * No dependency outside Node's standard library, so the plugin works in a fresh
 * clone with no install step and no network.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { discoverProjects, detectSurface, scanProject } from '../engine.mjs';
import { renderReport } from '../report.mjs';
import { PATTERNS } from '../patterns.mjs';
import { contextFor, fixFile } from '../fixer.mjs';
import { applyIgnore, loadConfig } from '../config.mjs';
import { renderPatternsDoc } from '../lib/patterns-doc.mjs';

const SEVERITIES = ['P0', 'P1', 'P2', 'P3'];

function parseArguments(argv) {
  const [verb = 'audit', ...rest] = argv;
  const options = {
    verb, target: '.', out: null, json: null, minSeverity: 'P3', ref: 'HEAD', quiet: false,
    dryRun: false, only: null, maxRounds: 3, fix: false, markdown: false, viewports: null,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === '--out') options.out = rest[++index];
    else if (argument === '--json') options.json = rest[++index];
    else if (argument === '--min') options.minSeverity = rest[++index];
    else if (argument === '--ref') options.ref = rest[++index];
    else if (argument === '--quiet') options.quiet = true;
    else if (argument === '--dry-run') options.dryRun = true;
    else if (argument === '--fix') options.fix = true;
    else if (argument === '--markdown') options.markdown = true;
    else if (argument === '--viewports') options.viewports = rest[++index].split(',').map(Number).filter((n) => n >= 240 && n <= 3840);
    else if (argument === '--only') options.only = rest[++index];
    else if (argument === '--max-rounds') options.maxRounds = Number(rest[++index]) || 3;
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
 * `audit companies/tamuzi/tessera` is one project; `audit companies` is every
 * project underneath it,
 * not the repository that contains them. Matching the longest project root that is
 * an ancestor of the target keeps those two cases honest.
 */
function projectsFor(target) {
  const root = path.resolve(target);
  if (!fs.existsSync(root)) throw new Error(`No such path: ${target}`);
  const config = loadConfig();
  const discovered = applyIgnore(discoverProjects(process.cwd()), config);
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

/**
 * `fix` — apply what can be applied safely, and say plainly what could not be.
 *
 * The loop matters: a fix can reveal another (a new text colour makes a pair fail
 * elsewhere), so the scan is repeated until a round changes nothing. Every edit is
 * verified inside `fixFile`, so the numbers printed here are counts of findings that
 * are demonstrably gone, not counts of edits attempted.
 */
async function runFix(options) {
  const projects =
    path.resolve(options.target) === path.resolve('.')
      ? applyIgnore(discoverProjects(process.cwd()), loadConfig())
      : projectsFor(options.target);
  const threshold = SEVERITIES.indexOf(options.minSeverity);
  const fixed = [];
  const refused = new Map();
  const touched = new Set();

  for (const project of projects) {
    let remaining = null;
    const rounds = options.dryRun ? 1 : options.maxRounds;
    for (let round = 0; round < rounds; round += 1) {
      const scanned = scanProject(project);
      const findings = scanned.findings.filter(
        (finding) =>
          SEVERITIES.indexOf(finding.severity) <= threshold && (!options.only || finding.id === options.only),
      );
      if (!findings.length) {
        remaining = scanned.findings;
        break;
      }
      let changedThisRound = 0;
      const byFile = new Map();
      for (const finding of findings) {
        if (!byFile.has(finding.file)) byFile.set(finding.file, []);
        byFile.get(finding.file).push(finding);
      }
      for (const [relPath, fileFindings] of byFile) {
        const absolute = path.join(project.root, relPath);
        if (!fs.existsSync(absolute)) {
          for (const finding of fileFindings) {
            refused.set(finding.id, (refused.get(finding.id) ?? 0) + 1);
          }
          continue;
        }
        const raw = fs.readFileSync(absolute, 'utf8');
        const result = fixFile({
          absolute,
          context: contextFor(project, relPath, raw),
          findings: fileFindings,
          dryRun: options.dryRun,
          kind: project.kind,
        });
        for (const entry of result.applied) {
          changedThisRound += 1;
          touched.add(path.relative(process.cwd(), absolute));
          fixed.push({ project: project.name, ...entry });
        }
        for (const entry of result.refused) {
          refused.set(entry.finding.id, (refused.get(entry.finding.id) ?? 0) + 1);
          if (!refused.has(`${entry.finding.id}\u0000${entry.reason}`)) {
            refused.set(`${entry.finding.id}\u0000${entry.reason}`, entry.reason);
          }
        }
      }
      if (!changedThisRound) {
        remaining = scanned.findings;
        break;
      }
    }
    if (remaining === null) remaining = scanProject(project).findings;
    project.remaining = remaining;
  }

  const after = projects.reduce(
    (total, project) => total + (project.remaining ?? []).filter((finding) => SEVERITIES.indexOf(finding.severity) <= threshold).length,
    0,
  );
  const lines = [];
  lines.push(`# UX fixer ${options.dryRun ? '(dry run) ' : ''}· ${projects.length} projects`);
  lines.push('');
  lines.push(`${fixed.length} finding(s) ${options.dryRun ? 'would be fixed' : 'fixed'}, ${after} remain at ${options.minSeverity} or above.`);
  if (touched.size) {
    lines.push('');
    lines.push('## Files changed');
    for (const file of [...touched].sort()) lines.push(`- ${file}`);
  }
  if (fixed.length) {
    lines.push('');
    lines.push('## What changed');
    const byRule = new Map();
    for (const entry of fixed) byRule.set(entry.finding.id, (byRule.get(entry.finding.id) ?? 0) + 1);
    for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) lines.push(`- ${count} × ${rule}`);
  }
  const reasons = [...refused.entries()].filter(([, value]) => typeof value === 'string');
  if (reasons.length) {
    lines.push('');
    lines.push('## Left for a person');
    for (const [key, reason] of reasons) {
      const rule = key.split('\u0000')[0];
      const count = refused.get(rule) ?? 0;
      lines.push(`- **${rule}** (${count}): ${reason}`);
    }
  }
  const text = `${lines.join('\n')}\n`;
  writeIfRequested(options.out, text);
  if (!options.quiet) process.stdout.write(text);
  return 0;
}

function writeIfRequested(file, contents) {
  if (!file) return;
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, contents, 'utf8');
}

async function runScan(args) {
  // The static detectors are TypeScript; vite-node runs them without a build step.
  // Resolve the local binary first so the plugin does not reach for the network.
  const local = path.join(process.cwd(), 'node_modules', '.bin', 'vite-node');
  const binary = fs.existsSync(local) ? local : 'npx';
  const argv = fs.existsSync(local)
    ? ['tools/northstar/engine/scan.ts', ...args]
    : ['--no-install', 'vite-node', 'tools/northstar/engine/scan.ts', ...args];
  try {
    execFileSync(binary, argv, { stdio: 'inherit', cwd: process.cwd() });
    return 0;
  } catch (error) {
    if (error.status === 1) return 1;
    throw new Error(
      'the scan layer needs vite-node (a devDependency). Run `npm install`, then ' +
        '`npx northstar scan`. Nothing else in the engine requires an install.',
    );
  }
}

async function main(argv) {
  const rest = argv.slice(1);
  const options = parseArguments(argv);

  if (options.verb === 'add') {
    const { add } = await import('../lib/add.mjs');
    return add(rest);
  }

  if (options.verb === 'patterns') {
    if (options.markdown) {
      process.stdout.write(renderPatternsDoc());
      return 0;
    }
    for (const pattern of PATTERNS) {
      process.stdout.write(`${pattern.id}\t${pattern.name}\t${pattern.checks.join(', ')}\n`);
    }
    return 0;
  }

  if (options.verb === 'page') {
    // Runtime evidence: opens the page, presses Tab, reads. Never clicks or submits.
    if (options.target === '.') throw new Error('page needs a URL or an HTML file: northstar page <url|file> [--viewports 320,768,1280] [--out <screenshot dir>] [--json <file>]');
    const { probePage, renderProbeReport } = await import('../lib/page-probe.mjs');
    const result = await probePage(options.target, { viewports: options.viewports ?? undefined, outDir: options.out ?? undefined });
    if (options.json) writeIfRequested(options.json, `${JSON.stringify(result, null, 2)}\n`);
    const text = renderProbeReport(result);
    if (!options.quiet) process.stdout.write(`${text}\n`);
    // 3 = nothing was measured. Distinct from 1 (defects) so a script cannot mistake "could not look" for "looked, clean".
    return result.available ? 0 : 3;
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

  if (options.verb === 'scan') {
    return runScan(rest);
  }

  if (options.verb === 'hooks') {
    const { installHooks } = await import('../hooks/install.mjs');
    return installHooks(process.cwd(), options.target);
  }

  if (options.verb === 'fix') {
    return runFix(options);
  }

  if (options.verb === 'watch') {
    const { watch } = await import('../hooks/watch.mjs');
    return watch(projectsFor(options.target), options);
  }

  if (options.verb === 'check') {
    const config = loadConfig();
    // A gate set in the repository's config is the repository's decision; an explicit
    // `--min` on the command line still wins, so CI can be stricter than the default.
    const effective = options.minSeverity === 'P3' ? config.gate : options.minSeverity;
    const threshold = SEVERITIES.indexOf(effective);
    const report = { projects: applyIgnore(discoverProjects(process.cwd()), config).map((project) => scanProject(project)) };
    report.projectCount = report.projects.length;
    const failing = report.projects
      .flatMap((project) => project.findings.map((finding) => ({ ...finding, project: project.name })))
      .filter((finding) => SEVERITIES.indexOf(finding.severity) <= threshold);
    for (const finding of failing) {
      process.stderr.write(`${finding.severity} ${finding.project} ${finding.file}:${finding.line} ${finding.title}\n`);
    }
    process.stdout.write(
      `${failing.length} defect(s) at ${effective} or above across ${report.projectCount} projects\n`,
    );
    return failing.length ? 1 : 0;
  }

  // `audit`: one target, a tree of projects, or the whole repository.
  const isRoot = path.resolve(options.target) === path.resolve('.');
  const targets = isRoot ? null : projectsFor(options.target);
  const projects = targets
    ? targets.map((project) => scanProject(project))
    : applyIgnore(discoverProjects(process.cwd()), loadConfig()).map((project) => scanProject(project));
  const report = { projectCount: projects.length, projects };
  const label = isRoot ? 'repository' : targets.length === 1 ? targets[0].name : `${options.target} (${targets.length} projects)`;
  const text = renderReport(report, { title: `UX audit · ${label}` });
  writeIfRequested(options.out, text);
  writeIfRequested(options.json, `${JSON.stringify(report, null, 2)}\n`);
  if (!options.quiet) process.stdout.write(`${text}\n`);
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`northstar: ${error.message}\n`);
  process.exitCode = 2;
}
