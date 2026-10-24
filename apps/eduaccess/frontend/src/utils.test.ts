import { describe, expect, it } from 'vitest';
import { FAIRNESS_RULE, LEDGER_RULE, appStatusTone, planLabel } from './utils';

describe('appStatusTone', () => {
  it('maps application statuses', () => {
    expect(appStatusTone('approved')).toContain('emerald');
    expect(appStatusTone('declined')).toContain('rose');
    expect(appStatusTone('waitlisted')).toContain('amber');
    expect(appStatusTone('submitted')).toContain('sky');
  });
});

describe('planLabel', () => {
  it('describes access plans', () => {
    expect(planLabel('free', 0)).toBe('Free');
    expect(planLabel('scholarship', 0)).toBe('Scholarship-funded');
    expect(planLabel('paid', 49)).toContain('49.00');
  });
});

describe('rules', () => {
  it('states pending is not settled and decisions need human review', () => {
    expect(LEDGER_RULE).toContain('NOT settled');
    expect(FAIRNESS_RULE).toContain('human review');
    expect(FAIRNESS_RULE).toContain('never see applicant details');
  });
});
