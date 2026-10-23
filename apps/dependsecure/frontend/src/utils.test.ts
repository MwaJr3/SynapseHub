import { describe, expect, it } from 'vitest';
import { remediationTone, scanStatusTone } from './utils';

describe('remediationTone', () => {
  it('maps the four remediation statuses', () => {
    expect(remediationTone('Open')).toContain('rose');
    expect(remediationTone('Under Review')).toContain('amber');
    expect(remediationTone('Resolved')).toContain('emerald');
    expect(remediationTone('Accepted Risk')).toContain('sky');
  });
});

describe('scanStatusTone', () => {
  it('distinguishes completed, no-findings and failed', () => {
    expect(scanStatusTone('completed')).toContain('emerald');
    expect(scanStatusTone('no-findings')).toContain('sky');
    expect(scanStatusTone('failed')).toContain('rose');
  });
});
