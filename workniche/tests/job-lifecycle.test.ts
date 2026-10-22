import { describe, expect, it } from 'vitest';

import { canTransitionJob, JOB_TRANSITIONS, slugify } from '@/lib/job-lifecycle';

describe('job lifecycle', () => {
  it('permits exactly the documented transitions', () => {
    expect(canTransitionJob('DRAFT', 'PUBLISHED')).toBe(true);
    expect(canTransitionJob('DRAFT', 'ARCHIVED')).toBe(true);
    expect(canTransitionJob('DRAFT', 'PAUSED')).toBe(false);
    expect(canTransitionJob('PUBLISHED', 'PAUSED')).toBe(true);
    expect(canTransitionJob('PUBLISHED', 'CLOSED')).toBe(true);
    expect(canTransitionJob('PUBLISHED', 'DRAFT')).toBe(false);
    expect(canTransitionJob('PAUSED', 'PUBLISHED')).toBe(true);
    expect(canTransitionJob('PAUSED', 'CLOSED')).toBe(true);
    expect(canTransitionJob('CLOSED', 'ARCHIVED')).toBe(true);
    expect(canTransitionJob('CLOSED', 'PUBLISHED')).toBe(false);
    expect(canTransitionJob('ARCHIVED', 'PUBLISHED')).toBe(false);
  });

  it('is terminal for ARCHIVED', () => {
    expect(JOB_TRANSITIONS.ARCHIVED).toEqual([]);
  });
});

describe('slugify', () => {
  it('produces URL-safe slugs', () => {
    expect(slugify('Senior Backend Engineer')).toBe('senior-backend-engineer');
    expect(slugify('  Weird!! Spaces__Everywhere  ')).toBe('weird-spaces-everywhere');
    expect(slugify('Ünïcodé Tïtle')).toBe('unicode-title');
  });
});
