import { describe, expect, it } from 'vitest';
import { attendanceTone, letterTone } from './utils';

describe('letterTone', () => {
  it('maps letter grades to distinct tones', () => {
    expect(letterTone('A')).toContain('emerald');
    expect(letterTone('B')).toContain('sky');
    expect(letterTone('C')).toContain('amber');
    expect(letterTone('F')).toContain('rose');
  });
});

describe('attendanceTone', () => {
  it('maps attendance statuses', () => {
    expect(attendanceTone('present')).toContain('emerald');
    expect(attendanceTone('absent')).toContain('rose');
    expect(attendanceTone('late')).toContain('amber');
  });
});
