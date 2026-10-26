import { describe, expect, it } from 'vitest';
import { NO_FAKE_VIDEO, localTime, sessionTone } from './utils';

describe('sessionTone', () => {
  it('maps session statuses', () => {
    expect(sessionTone('live')).toContain('rose');
    expect(sessionTone('scheduled')).toContain('sky');
    expect(sessionTone('ended')).toContain('emerald');
  });
});

describe('localTime', () => {
  it('renders local time and passes through invalid values', () => {
    expect(localTime('nonsense')).toBe('nonsense');
  });
});

describe('NO_FAKE_VIDEO', () => {
  it('states calls are never faked', () => {
    expect(NO_FAKE_VIDEO).toContain('never faked');
  });
});
