import { beforeEach, describe, expect, it } from 'vitest';

import { rateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('rateLimit', () => {
  beforeEach(resetRateLimits);

  it('allows up to the limit, then blocks with a retry time', () => {
    for (let i = 0; i < 3; i++) expect(rateLimit('a', { limit: 3, windowMs: 60_000, now: 1000 + i }).allowed).toBe(true);
    const blocked = rateLimit('a', { limit: 3, windowMs: 60_000, now: 2000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('frees a slot once the window has passed', () => {
    for (let i = 0; i < 3; i++) rateLimit('a', { limit: 3, windowMs: 1000, now: i });
    expect(rateLimit('a', { limit: 3, windowMs: 1000, now: 1500 }).allowed).toBe(true);
  });

  it('keeps keys independent', () => {
    rateLimit('a', { limit: 1, windowMs: 60_000, now: 1 });
    expect(rateLimit('a', { limit: 1, windowMs: 60_000, now: 2 }).allowed).toBe(false);
    expect(rateLimit('b', { limit: 1, windowMs: 60_000, now: 2 }).allowed).toBe(true);
  });
});
