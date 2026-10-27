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
  const appsRoot = join(repoRoot, 'apps');
  if (existsSync(appsRoot)) {
    for (const name of [
      'campusflow',
      'chessscope',
      'circuitlab-calc',
      'classconnect',
      'dependsecure',
      'eduaccess',
      'fileguard',
      'frontpage',
      'learnbridge',
      'learnpulse',
      'openlearn-commons',
      'pathwise',
      'reachlearn',
      'sentinelcore',
      'sentinellog',
      'teachcraft',
      'tutorspring',
    ]) {
      for (const candidate of ['frontend/src', 'web/src']) {
        const root = join(appsRoot, name, candidate);
        if (existsSync(root)) targets.push({ label: `apps/${name}`, root });
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

  it('every remaining finding is an explicitly deferrable minor token-hygiene item', async () => {
    const reports = await Promise.all(
      discoverTargets().map((target) => scanRoot(target, repoRoot)),
    );
    const remaining = reports.flatMap((report) => report.findings);
    for (const finding of remaining) {
      expect(finding.severity).toBe('minor');
      expect(finding.confidence).not.toBe('high');
      expect(finding.ruleId).toBe('TOKEN-SPACING-01');
    }
  });
});
