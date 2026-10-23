import { describe, expect, it } from 'vitest';
import { HONESTY_NOTICE, severityTone, statusTone } from './utils';

describe('severityTone', () => {
  it('maps severities', () => {
    expect(severityTone('critical')).toContain('rose');
    expect(severityTone('high')).toContain('rose');
    expect(severityTone('medium')).toContain('amber');
    expect(severityTone('low')).toContain('sky');
  });
});

describe('statusTone', () => {
  it('maps workflow statuses', () => {
    expect(statusTone('new')).toContain('rose');
    expect(statusTone('triaged')).toContain('amber');
    expect(statusTone('contained')).toContain('sky');
    expect(statusTone('resolved')).toContain('emerald');
    expect(statusTone('closed')).toContain('slate');
  });
});

describe('HONESTY_NOTICE', () => {
  it('states that a suspicious pattern is not proof of an attack', () => {
    expect(HONESTY_NOTICE).toContain('not proof of an attack');
  });
});
