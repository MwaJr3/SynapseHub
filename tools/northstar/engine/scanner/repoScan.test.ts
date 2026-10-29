import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scanRoot, type ScanTarget } from './walk';

const repoRoot = process.cwd();

/** Same target discovery as scripts/ux-scan.ts so the gate covers every UI. */
function discoverTargets(): ScanTarget[] {
  const targets: ScanTarget[] = [
    { label: 'Portfolio website', root: join(repoRoot, 'src') },
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
  // Every product is filed under the company that publishes it (2026-10-29).
  const companies: Record<string, string[]> = {
    velaqori: [
      'chessscope',
      'circuitlab-calc',
      'dependsecure',
      'fileguard',
      'frontpage',
      'sentinelcore',
      'sentinellog',
    ],
    tamuzi: [
      'campusflow',
      'classconnect',
      'eduaccess',
      'learnbridge',
      'learnpulse',
      'openlearn-commons',
      'pathwise',
      'reachlearn',
      'teachcraft',
      'tutorspring',
    ],
  };
  const companiesRoot = join(repoRoot, 'companies');
  if (existsSync(companiesRoot)) {
    for (const [company, names] of Object.entries(companies)) {
      for (const name of names) {
        for (const candidate of ['frontend/src', 'web/src']) {
          const root = join(companiesRoot, company, name, candidate);
          if (existsSync(root)) targets.push({ label: `companies/${company}/${name}`, root });
        }
      }
    }
  }
  return targets;
}

describe('UX engine repository gate', () => {
  it('the portfolio website passes every static detector', async () => {
    const report = await scanRoot(
      { label: 'Portfolio website', root: join(repoRoot, 'src') },
      repoRoot,
    );
    expect(report.findings).toEqual([]);
  });

  it('no frontend carries a defect-class (critical/major or high-confidence) finding', async () => {
    const reports = await Promise.all(
      discoverTargets().map((target) => scanRoot(target, repoRoot)),
    );
    const defects = reports.flatMap((report) =>
      report.findings.filter(
        (finding) =>
          finding.severity === 'critical' ||
          finding.severity === 'major' ||
          finding.confidence === 'high',
      ),
    );
    expect(defects).toEqual([]);
  });

  it('every remaining finding is an explicitly triaged review cue at the pinned baseline', async () => {
    const reports = await Promise.all(
      discoverTargets().map((target) => scanRoot(target, repoRoot)),
    );
    const remaining = reports.flatMap((report) => report.findings);
    for (const finding of remaining) {
      expect(finding.severity).toBe('minor');
      expect(finding.confidence).not.toBe('high');
      expect(['TOKEN-SPACING-01', 'A11Y-SCROLL-01']).toContain(
        finding.ruleId,
      );
    }

    // The scrollable-region inventory is pinned by location. The CSS detector
    // cannot see rendered overflow or tab order, so each cue is a low-confidence
    // review item verified by the Playwright axe suite; a new cue fails this
    // gate until it has been reviewed and consciously added here.
    const scrollCues = remaining
      .filter((finding) => finding.ruleId === 'A11Y-SCROLL-01')
      .map((finding) => finding.location)
      .sort();
    expect(scrollCues).toEqual(
      [
        'companies/velaqori/frontpage/frontend/src/styles/app.css:65',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:104',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:114',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:132',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:236',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:252',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:255',
        'companies/velaqori/frontpage/frontend/src/styles/app.css:331',
        'vocal-separator/web/src/styles.css:1618',
      ].sort(),
    );
  });
});
