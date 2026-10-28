import { describe, expect, it } from 'vitest';
import { auditScreen } from './audit';
import { FLAWED_CHECKOUT, POLISHED_CHECKOUT } from './fixtures';
import { getRule } from './rules';

describe('audit engine — flawed checkout', () => {
  const report = auditScreen(FLAWED_CHECKOUT);

  it('produces critical, traceable findings and a failing grade', () => {
    expect(report.counts.critical).toBeGreaterThanOrEqual(3);
    expect(report.grade).toBe('D');
    expect(report.score).toBeLessThan(40);
  });

  it('catches the headline blueprint violations', () => {
    const ruleIds = report.findings.map((finding) => finding.ruleId);
    expect(ruleIds).toContain('A11Y-CONTRAST-01');
    expect(ruleIds).toContain('A11Y-TARGET-01');
    expect(ruleIds).toContain('RESP-HOVER-01');
    expect(ruleIds).toContain('STATE-DESTRUCTIVE-01');
    expect(ruleIds).toContain('FEEDBACK-DOHERTY-01');
    expect(ruleIds).toContain('FORM-VALIDATION-01');
    expect(ruleIds).toContain('VISUAL-FOCAL-01');
  });

  it('every finding is fully traceable and actionable', () => {
    for (const finding of report.findings) {
      expect(finding.patternIds.length).toBeGreaterThan(0);
      expect(getRule(finding.ruleId).id).toBe(finding.ruleId);
      expect(finding.remediation.length).toBeGreaterThan(10);
      expect(finding.verification.length).toBeGreaterThan(10);
      expect(finding.impactedUsers.length).toBeGreaterThan(5);
      expect(['must', 'should', 'nice']).toContain(finding.priority);
    }
  });

  it('prioritises at most three top fixes by severity then confidence', () => {
    expect(report.topFixes.length).toBeLessThanOrEqual(3);
    const weights = { critical: 4, major: 3, minor: 2, nice: 1 };
    const sorted = report.topFixes.every((finding, index, all) => {
      if (index === 0) return true;
      return weights[finding.severity] <= weights[all[index - 1]!.severity];
    });
    expect(sorted).toBe(true);
  });

  it('cites governing patterns for the whole screen', () => {
    expect(report.patternMatches.length).toBeGreaterThan(5);
    expect(report.patternMatches[0]?.score).toBeGreaterThan(0);
  });
});

describe('audit engine — polished checkout', () => {
  const report = auditScreen(POLISHED_CHECKOUT);

  it('passes with a high score and no critical or major findings', () => {
    expect(
      report.findings.filter(
        (f) => f.severity === 'critical' || f.severity === 'major',
      ),
    ).toEqual([]);
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.grade).toBe('A');
  });

  it('records passing evidence for the constraints it satisfies', () => {
    const passRules = report.passes.map((pass) => pass.ruleId);
    expect(passRules).toContain('A11Y-CONTRAST-01');
    expect(passRules).toContain('A11Y-TARGET-01');
    expect(passRules).toContain('STATE-COMPLETENESS-01');
  });

  it('outperforms the flawed release on every dimension', () => {
    const flawed = auditScreen(FLAWED_CHECKOUT);
    expect(report.score).toBeGreaterThan(flawed.score);
    expect(report.findings.length).toBeLessThan(flawed.findings.length);
  });
});
