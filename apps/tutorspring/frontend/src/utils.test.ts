import { describe, expect, it } from 'vitest';
import { AI_DISCLAIMER, modeTone, supportLabel } from './utils';

describe('AI_DISCLAIMER', () => {
  it('warns responses can be wrong', () => {
    expect(AI_DISCLAIMER).toContain('can be wrong');
  });
});

describe('modeTone', () => {
  it('marks demo responses distinctly from live ones', () => {
    expect(modeTone(true)).toContain('amber');
    expect(modeTone(false)).toContain('emerald');
  });
});

describe('supportLabel', () => {
  it('states grounding status', () => {
    expect(supportLabel(false)).toContain('Not covered');
    expect(supportLabel(true)).toContain('approved sources');
  });
});
