import { describe, expect, it } from 'vitest';
import { FAIRNESS_NOTE, flagTone } from './utils';

describe('flagTone', () => {
  it('maps flag statuses', () => {
    expect(flagTone('open')).toContain('amber');
    expect(flagTone('actioned')).toContain('emerald');
    expect(flagTone('dismissed')).toContain('slate');
  });
});

describe('FAIRNESS_NOTE', () => {
  it('states flags are not labels or predictions', () => {
    expect(FAIRNESS_NOTE).toContain('never labels of ability');
    expect(FAIRNESS_NOTE).toContain('evidence');
  });
});
