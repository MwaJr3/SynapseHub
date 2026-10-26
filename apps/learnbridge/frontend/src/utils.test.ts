import { describe, expect, it } from 'vitest';
import { stateLabel, stateTone, syncTone } from './utils';

describe('progress state helpers', () => {
  it('labels and tones the four learning states', () => {
    expect(stateLabel('not_started')).toBe('Not Started');
    expect(stateTone('completed')).toContain('emerald');
    expect(stateTone('needs_review')).toContain('amber');
    expect(stateTone('in_progress')).toContain('sky');
  });
});

describe('syncTone', () => {
  it('distinguishes applied, conflict and rejected', () => {
    expect(syncTone('applied')).toContain('emerald');
    expect(syncTone('conflict')).toContain('amber');
    expect(syncTone('rejected')).toContain('rose');
  });
});
