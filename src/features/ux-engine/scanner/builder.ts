/**
 * Finding builder for static scans — shares the audit engine's rule guidance
 * and traceability chain so a code-derived finding and a descriptor-derived
 * finding are indistinguishable downstream.
 */
import { RULE_GUIDANCE } from '../audit';
import { getRule } from '../rules';
import type { Confidence, Finding, Severity } from '../types';
import type { ScanFinding } from './types';

const PRIORITY_FOR: Record<Severity, Finding['priority']> = {
  critical: 'must',
  major: 'must',
  minor: 'should',
  nice: 'nice',
};

let counter = 0;

export function resetScanIds(): void {
  counter = 0;
}

export function buildScanFinding(input: {
  ruleId: string;
  evidence: string;
  filePath: string;
  line: number;
  snippet: string;
  severity?: Severity;
  confidence?: Confidence;
}): ScanFinding {
  const rule = getRule(input.ruleId);
  const guidance = RULE_GUIDANCE[input.ruleId] ?? {
    impactedUsers: 'all users',
    remediation: rule.statement,
    verification: 'Re-run the UX engine scan after the change.',
  };
  const severity = input.severity ?? rule.defaultSeverity;
  counter += 1;
  const location = `${input.filePath}:${input.line}`;
  return {
    id: `S${String(counter).padStart(3, '0')}`,
    ruleId: input.ruleId,
    title: rule.statement,
    severity,
    priority: PRIORITY_FOR[severity],
    confidence: input.confidence ?? 'high',
    impactedUsers: guidance.impactedUsers,
    evidence: input.evidence,
    remediation: guidance.remediation,
    verification: guidance.verification,
    patternIds: rule.patternIds,
    location,
    filePath: input.filePath,
    line: input.line,
    snippet: input.snippet,
  };
}
