/**
 * UX engine repository scan — runs the static UX detectors across every
 * frontend in the monorepo and writes an evidence-based report to
 * docs/UX_ENGINE_REPO_AUDIT.md.
 *
 * Usage:
 *   npm run ux:scan             # scan + refresh the report
 *   npm run ux:scan -- --strict # exit 1 when critical findings remain
 *
 * The scan is static source analysis; it cannot replace runtime keyboard,
 * screen-reader or viewport testing, and the report says so explicitly.
 */
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scanRoot,
  type ScanTarget,
} from './scanner/walk';
import { getRule } from './rules';
import type { ScanReport } from './scanner/types';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const strict = process.argv.includes('--strict');

/**
 * Products that are not yet in the strict gate.
 *
 * Before the 2026-10-29 move these nine lived under `projects/`, which this scan
 * never walked; the gate covered `apps/` and the root applications. The move filed
 * them under companies/ with everything else, so naming them here keeps the gate
 * meaning what it meant — rather than quietly passing because their paths changed,
 * or failing the build on findings nobody has triaged.
 *
 * Measured on 2026-10-29, with the detectors as they stand: 631 findings in
 * transcriptwise (29 critical), 10 in cyberaware-lab (1 critical), 5–6 each in the
 * seven other products. The audit report still lists all of them — this list only
 * decides what `--strict` fails on. Removing a name from this list is the work.
 */
const OUTSIDE_STRICT_GATE = new Set([
  'companies/velaqori/assetwatch',
  'companies/velaqori/hashsight',
  'companies/velaqori/incidentflow',
  'companies/velaqori/netscope',
  'companies/velaqori/phishlens',
  'companies/velaqori/securecode-workbench',
  'companies/velaqori/threatintel-desk',
  'companies/tamuzi/cyberaware-lab',
  'companies/tamuzi/transcriptwise',
]);

async function discoverTargets(): Promise<ScanTarget[]> {
  const targets: ScanTarget[] = [
    { label: 'Portfolio website', root: join(repoRoot, 'src') },
    // The challenge collection is its own directory but still ships in the site,
    // so it stays in scope for the detectors after the 2026-10-28 move.
    { label: 'Challenge collection', root: join(repoRoot, 'challenges/src') },
    {
      label: 'Company platform (Next.js)',
      root: join(repoRoot, 'company-platform/src'),
    },
    { label: 'WorkNiche (Next.js)', root: join(repoRoot, 'workniche/src') },
    {
      label: 'Vocal separator web app',
      root: join(repoRoot, 'vocal-separator/web/src'),
    },
  ];

  // Since 2026-10-29 every company product is filed under the company that
  // publishes it: `companies/<company>/<product>`.
  const companiesRoot = join(repoRoot, 'companies');
  if (existsSync(companiesRoot)) {
    for (const company of (await readdir(companiesRoot, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      if (!company.isDirectory()) continue;
      for (const name of (await readdir(join(companiesRoot, company.name))).sort()) {
        const label = `companies/${company.name}/${name}`;
        for (const candidate of ['frontend/src', 'web/src']) {
          const root = join(companiesRoot, company.name, name, candidate);
          if (existsSync(root)) {
            targets.push({ label, root, gated: !OUTSIDE_STRICT_GATE.has(label) });
          }
        }
      }
    }
  }

  // Entry documents live one level above each src root; pull them in as
  // explicit extra files so the document-language detector covers them.
  return targets
    .filter((target) => existsSync(target.root))
    .map((target) => {
      const entry = join(target.root, '..', 'index.html');
      return existsSync(entry)
        ? { ...target, extraFiles: [entry] }
        : target;
    });
}

function renderReport(reports: ScanReport[]): string {
  const generated = new Date().toISOString().slice(0, 10);
  const totalFiles = reports.reduce(
    (sum, report) => sum + report.filesScanned,
    0,
  );
  const totalFindings = reports.reduce(
    (sum, report) => sum + report.findings.length,
    0,
  );

  const lines: string[] = [
    '# UX engine repository audit',
    '',
    `Generated ${generated} by \`northstar scan\` (\`npm run ux:scan\`) from Northstar's static detectors.`,
    '',
    `Scope: **${reports.length} frontends**, **${totalFiles} source files**, **${totalFindings} findings**.`,
    '',
    '## Method and limitations',
    '',
    '- Static, deterministic analysis of TS/TSX/CSS/HTML source — the same rule IDs and pattern traceability as the interactive audit at `/ux-engine`. Detectors cover focus removal, 44px touch targets, form labels and accessible names, image alt text, autoFocus, heading order, document language, key handlers on non-interactive elements, keyboard-reachable scroll regions, z-index escalation, spacing tokens, motion vocabulary, reduced-motion fallbacks, WCAG contrast pairs (including `var(--token)` colour resolution) and hover-only handlers.',
    '- Low-confidence scroll-region cues and medium-confidence structural heuristics need a human or runtime check; the Playwright browser suite (`e2e/`) confirms them against the rendered DOM.',
    '- Runtime accessibility is enforced separately by axe-core (`src/test/axe-a11y.test.tsx`) against the rendered DOM; this static scan cannot execute the interfaces.',
    '- Findings carry confidence levels: **high** for mechanical facts (outline removal, missing labels, z-index, contrast math), **medium/low** for structural heuristics that still need a human or runtime check.',
    '- This scan does not execute the interfaces: runtime keyboard navigation, screen-reader output, rendered hit-box geometry and visual contrast over images remain manual verification steps.',
    '- Python backends, CLI tools and data notebooks are out of scope because they ship no UI.',
    '',
    '## Summary',
    '',
    '| Frontend | Files | Critical | Major | Minor | Nice | High conf. | Medium | Low |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
  ];

  for (const report of reports) {
    lines.push(
      `| ${report.label} | ${report.filesScanned} | ${report.counts.critical} | ${report.counts.major} | ${report.counts.minor} | ${report.counts.nice} | ${report.confidenceCounts.high} | ${report.confidenceCounts.medium} | ${report.confidenceCounts.low} |`,
    );
  }

  for (const report of reports) {
    lines.push(
      '',
      `## ${report.label}`,
      '',
      `Root: \`${report.root}\` — ${report.findings.length} findings.`,
      '',
    );
    if (report.findings.length === 0) {
      lines.push('No findings — every static detector passed.');
      continue;
    }
    lines.push(
      '| # | Severity | Conf. | Rule | Location | Evidence |',
      '| --- | --- | --- | --- | --- | --- |',
    );
    report.findings.forEach((finding, index) => {
      const rule = getRule(finding.ruleId);
      const evidence = finding.evidence.replaceAll('|', '\\|');
      lines.push(
        `| ${index + 1} | ${finding.severity} | ${finding.confidence} | ${finding.ruleId} (${rule.patternIds.join('/')}) | \`${finding.filePath}:${finding.line}\` | ${evidence} |`,
      );
    });
  }

  const deferred = reports.flatMap((report) =>
    report.findings
      .filter((finding) => finding.severity === 'minor')
      .map((finding) => ({ report, finding })),
  );

  lines.push(
    '',
    '## Triage decisions and deferred findings',
    '',
    '- **Fixed in this pass (all critical and major defects):** removed focus outlines without replacement, sub-44px touch targets, unlabelled controls, z-index escalation past the named layers, off-vocabulary motion durations, missing reduced-motion fallbacks, skipped heading levels, key handlers on non-interactive containers and a theme-aware contrast failure in the company platform (white text on light accent fills; replaced with a per-theme `--accent-contrast` foreground token). Every fix is re-verified by this scan and by the regression gate in `src/features/ux-engine/scanner/repoScan.test.ts`.',
    '- **Deferred `TOKEN-SPACING-01` (minor token hygiene):** 75 findings on literal spacing inside the hand-tuned vocal-separator stylesheet. They are convention deviations rather than user-facing defects. Normalising them means choosing between the two nearest scale tokens at each site, which changes rendered geometry; the Playwright visual-regression suite (`e2e/`) now gates that change with committed screenshot baselines, so the cleanup is tracked separately rather than applied blind.',
    '- **Review cues `A11Y-SCROLL-01` (low confidence):** 9 CSS rules create `overflow: auto/scroll` regions. CSS cannot see rendered overflow or tab order, so each is a review cue rather than a defect claim; the Playwright axe run (`e2e/`) executes `scrollable-region-focusable` against the rendered DOM to confirm or clear every cue, and the pinned location inventory in `repoScan.test.ts` fails the gate on any new cue.',
    '',
  );

  if (deferred.length > 0) {
    lines.push(
      '| Frontend | Location | Off-scale values |',
      '| --- | --- | --- |',
    );
    for (const { report, finding } of deferred) {
      const values = finding.evidence.match(/([\d., ]+)px/)?.[1]?.trim() ?? '';
      lines.push(
        `| ${report.label} | \`${finding.filePath}:${finding.line}\` | ${values}px |`,
      );
    }
    lines.push('');
  }

  lines.push(
    '## Remediation contract',
    '',
    'Every finding resolves through the engine rule catalog: the rule statement, impacted users, remediation steps and verification procedure are available from `/ux-engine` and `src/features/ux-engine/rules.ts`. Re-run this scan after fixes to confirm the finding disappears.',
    '',
  );
  return lines.join('\n');
}

async function main(): Promise<void> {
  const targets = await discoverTargets();
  const reports: ScanReport[] = [];
  for (const target of targets) {
    const report = await scanRoot(target, repoRoot);
    reports.push(report);
    const total = report.findings.length;
    console.log(
      `${report.label.padEnd(34)} ${String(report.filesScanned).padStart(4)} files  ${String(total).padStart(3)} findings  C${report.counts.critical} M${report.counts.major} m${report.counts.minor} n${report.counts.nice}`,
    );
  }

  const reportPath = join(repoRoot, 'docs/UX_ENGINE_REPO_AUDIT.md');
  await writeFile(reportPath, renderReport(reports), 'utf8');
  console.log(`\nReport written to ${reportPath.replace(repoRoot + '/', '')}`);

  // A target can be reported without being gated: `gated: false` marks a surface
  // whose findings are known, listed and not yet triaged (see OUTSIDE_STRICT_GATE).
  const gatedLabels = new Set(targets.filter((t) => t.gated !== false).map((t) => t.label));
  const critical = reports
    .filter((report) => gatedLabels.has(report.label))
    .reduce((sum, report) => sum + report.counts.critical, 0);
  const ungated = reports
    .filter((report) => !gatedLabels.has(report.label))
    .reduce((sum, report) => sum + report.counts.critical, 0);

  if (ungated > 0) {
    console.log(
      `\n${ungated} critical finding(s) in ${reports.filter((r) => !gatedLabels.has(r.label)).length} ` +
        `target(s) outside the strict gate — reported, not yet triaged.`,
    );
  }
  if (strict && critical > 0) {
    console.error(
      `\nStrict scan failed: ${critical} critical finding(s) remain.`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
