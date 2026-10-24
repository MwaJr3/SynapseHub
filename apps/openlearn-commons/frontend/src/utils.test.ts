import { describe, expect, it } from 'vitest';
import { LICENSE_CAUTION, licenseTone, reuseLabel, translationStatusTone } from './utils';

describe('licenseTone', () => {
  it('marks uncertain licenses distinctly', () => {
    expect(licenseTone(true)).toContain('rose');
    expect(licenseTone(false)).toContain('emerald');
  });
});

describe('reuseLabel', () => {
  it('states adaptation, redistribution and commercial permissions', () => {
    const label = reuseLabel({ can_adapt: true, can_redistribute: false, can_commercial: false });
    expect(label).toContain('may adapt');
    expect(label).toContain('no redistribution');
    expect(label).toContain('non-commercial only');
  });
});

describe('LICENSE_CAUTION', () => {
  it('states public access is not an open license', () => {
    expect(LICENSE_CAUTION).toContain('does not make it openly licensed');
    expect(LICENSE_CAUTION).toContain('no legal certainty');
  });
});

describe('translationStatusTone', () => {
  it('maps translation statuses', () => {
    expect(translationStatusTone('approved')).toContain('emerald');
    expect(translationStatusTone('in_review')).toContain('amber');
  });
});
