/**
 * The UX engine: scan a project, run every rule, rank what came back.
 *
 * Determinism matters more than coverage here. Two runs over the same tree must
 * produce the same list in the same order, because the list is used to decide
 * what gets fixed and to prove afterwards that it was fixed. Ranking is by
 * severity, then by how many files the rule hit (a systemic defect outranks a
 * one-off), then by path so ties are stable.
 */

import fs from 'node:fs';
import path from 'node:path';
import { RULES } from './rules.mjs';
import { detectSurface, discoverProjects, serverRenderedViews, stripComments, walk } from './lib/project.mjs';

export { detectSurface, discoverProjects };

const SEVERITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };

/** Human-readable name for each severity, used in reports. */
export const SEVERITY_LABEL = {
  P0: 'P0 · blocks the task or breaks for a whole user group',
  P1: 'P1 · violates WCAG 2.2 AA or loses data',
  P2: 'P2 · costs the user time or confidence',
  P3: 'P3 · polish, consistency, or craft',
};

/**
 * Run every rule over one file.
 *
 * Extracted from `scanProject` so the advisory hook can check the single file that
 * was just written with exactly the rules, comment stripping and context a full
 * scan uses — there is one definition of "what the engine says about this file".
 *
 * @param {{ relPath:string, text:string, extension?:string }} view
 * @param {{ name:string, surface?:string }} project
 */
export function scanView(view, project, rules = RULES) {
  const findings = [];
  {
    const text = stripComments(view.text);
    const extension = view.extension ?? path.extname(view.relPath).toLowerCase();
    const context = {
      relPath: view.relPath,
      kind: extension === '.tsx' || extension === '.jsx' ? 'jsx' : extension === '.css' ? 'css' : 'html',
      surface: project.surface,
      sizedClasses: project.sizedClasses,
      // Rules that need to distinguish "no comment here" from "a comment explained
      // this" read the unstripped source.
      raw: view.text,
    };
    for (const rule of rules) {
      let hits = [];
      try {
        hits = rule.check(context, text) ?? [];
      } catch (error) {
        // A rule that throws is a bug in the engine, not a defect in the project.
        // Surface it rather than silently skipping the file.
        hits = [
          {
            id: 'engine-error',
            pattern: '-',
            severity: 'P3',
            confidence: 'low',
            title: `Rule ${rule.id} failed`,
            why: String(error && error.message),
            fix: 'Report this as an engine defect; the rule did not produce a verdict.',
            file: context.relPath,
            line: 1,
            evidence: '',
          },
        ];
      }
      findings.push(...hits.map((hit) => ({ ...hit, project: project.name })));
    }
  }
  return findings;
}


/**
 * Class names whose stylesheet rule gives them a real hit area: padding of 4px or more
 * around a 16px icon, or an explicit width/height of 24px or more. Rules that look at
 * JSX only (`small-target`) use it so a class like `.icon-button { padding: 7px }` in
 * the project's CSS is not reported as "no padding".
 */
export function sizedClassesFrom(cssTexts) {
  const sized = new Set();
  for (const css of cssTexts) {
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const body = rule[2];
      const padding = [...body.matchAll(/\bpadding(?:-(?:top|bottom|block|inline|left|right))?\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)].some((m) => Number(m[1]) * (m[2] === 'rem' ? 16 : 1) >= 4);
      const box = [...body.matchAll(/\b(?:min-)?(?:width|height)\s*:\s*(\d+(?:\.\d+)?)(px|rem)/g)].some((m) => Number(m[1]) * (m[2] === 'rem' ? 16 : 1) >= 24);
      if (!padding && !box) continue;
      for (const selector of rule[1].split(',')) {
        const last = selector.trim().split(/[\s>+~]+/).pop() ?? '';
        for (const m of last.matchAll(/\.([A-Za-z_][\w-]*)/g)) sized.add(m[1]);
      }
    }
  }
  return sized;
}

/**
 * Scan one project.
 * @param {{ name:string, root:string, kind:string, surface?:string }} project
 */
export function scanProject(project, options = {}) {
  const { rules = RULES } = options;
  const files = walk(project.root, { exclude: project.exclude ?? [] });
  const allViews =
    project.kind === 'server-rendered'
      ? serverRenderedViews(project.root)
      : files.map((file) => ({
          relPath: path.relative(project.root, file).split(path.sep).join('/'),
          text: fs.readFileSync(file, 'utf8'),
          absolute: file,
        }));
  // `includeOnly` narrows the scan to a set of absolute paths. It is how
  // `/ux-review` looks at a diff without reading the rest of the tree.
  const wanted = project.includeOnly ? new Set(project.includeOnly) : null;
  const views = wanted
    ? allViews.filter((view) => (view.absolute ? wanted.has(view.absolute) : true))
    : allViews;
  const cssTexts = allViews.filter((v) => /\.css$/i.test(v.relPath)).map((v) => v.text);
  project = { ...project, sizedClasses: sizedClassesFrom(cssTexts) };
  const findings = [];

  for (const view of views) findings.push(...scanView(view, project, rules));

  const ranked = rank(findings);
  return {
    ...project,
    filesScanned: project.kind === 'server-rendered' ? views.length / 2 : files.length,
    /** Reported defects, already deduplicated and ordered. */
    findings: ranked,
    /** How many individual occurrences sit behind those defects. */
    occurrences: findings.length,
    summary: summarise(ranked),
  };
}

/** Count findings by severity and rule. */
export function summarise(findings) {
  const bySeverity = { P0: 0, P1: 0, P2: 0, P3: 0 };
  const byRule = {};
  const byPattern = {};
  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
    byRule[finding.id] = (byRule[finding.id] ?? 0) + 1;
    byPattern[finding.pattern] = (byPattern[finding.pattern] ?? 0) + 1;
  }
  return { total: findings.length, bySeverity, byRule, byPattern };
}

/**
 * Deduplicate and order findings.
 *
 * A rule says how finely it should be reported. `line` keeps every occurrence —
 * two focus rings removed in two places are two defects to fix. `file` keeps one
 * entry for the whole file with a count, because forty `<th>` elements without
 * `scope` is one decision and one fix. `file-detail` keeps one entry per distinct
 * measured value, so a stylesheet with three failing colour pairs reports three.
 */
export function rank(findings) {
  const groups = new Map();
  for (const finding of findings) {
    // The project is part of the key: `src/App.tsx` exists in twenty products and
    // they are not the same file.
    const scope = `${finding.project ?? ''}:${finding.file}`;
    const key =
      finding.aggregate === 'file'
        ? `${finding.id}:${scope}`
        : finding.aggregate === 'file-detail'
          ? `${finding.id}:${scope}:${finding.detail ?? ''}`
          : `${finding.id}:${scope}:${finding.line}`;
    const existing = groups.get(key);
    if (existing) {
      existing.occurrences += finding.occurrences ?? 1;
      continue;
    }
    groups.set(key, { ...finding, occurrences: finding.occurrences ?? 1 });
  }
  const unique = [...groups.values()];
  const spread = {};
  for (const finding of unique) spread[finding.id] = (spread[finding.id] ?? 0) + 1;
  return unique.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      (spread[b.id] ?? 0) - (spread[a.id] ?? 0) ||
      (a.project ?? '').localeCompare(b.project ?? '') ||
      a.file.localeCompare(b.file) ||
      a.line - b.line,
  );
}

/** Scan every project in the repository. */
export function scanRepository(repoRoot, options = {}) {
  const projects = options.projects ?? discoverProjects(repoRoot);
  const scanned = projects.map((project) => scanProject(project, options));
  return {
    generatedBy: 'northstar-ux-engine',
    repoRoot,
    projectCount: scanned.length,
    projects: scanned,
  };
}
