import { describe, expect, it } from 'vitest';
import { EXPORT_NOTE, workflowTone } from './utils';

describe('workflowTone', () => {
  it('maps workflow statuses', () => {
    expect(workflowTone('draft')).toContain('sky');
    expect(workflowTone('review')).toContain('amber');
    expect(workflowTone('published')).toContain('emerald');
    expect(workflowTone('archived')).toContain('slate');
  });
});

describe('EXPORT_NOTE', () => {
  it('states the interactive-export limitation', () => {
    expect(EXPORT_NOTE).toContain('interactive question behaviour does not survive');
  });
});
