import { describe, expect, it } from 'vitest';
import { MODEL_NOTE, confidenceTone, statusTone } from './utils';

describe('statusTone', () => {
  it('maps mastery statuses', () => {
    expect(statusTone('mastered')).toContain('emerald');
    expect(statusTone('developing')).toContain('amber');
    expect(statusTone('not_yet_assessed')).toContain('slate');
  });
});

describe('confidenceTone', () => {
  it('maps confidence levels', () => {
    expect(confidenceTone('high')).toContain('emerald');
    expect(confidenceTone('moderate')).toContain('sky');
    expect(confidenceTone('low')).toContain('slate');
  });
});

describe('MODEL_NOTE', () => {
  it('states the model is transparent and not ML', () => {
    expect(MODEL_NOTE).toContain('not machine learning');
    expect(MODEL_NOTE).toContain('Uncertainty');
  });
});
