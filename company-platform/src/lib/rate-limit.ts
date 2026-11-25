/**
 * Sliding-window rate limiter.
 *
 * In-memory, so the limit is per server instance: on serverless hosting it slows a
 * single visitor hammering one warm instance but is not a global quota. It exists to
 * stop accidental double-submits and trivial flooding; a shared store (Redis/Upstash)
 * is the upgrade when a hard global limit is needed.
 */
export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next attempt is accepted (0 when allowed). */
  retryAfterSeconds: number;
}

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(((recent[0] ?? now) + windowMs - now) / 1000)) };
  }
  recent.push(now);
  buckets.set(key, recent);
  // Keep the map from growing without bound.
  if (buckets.size > 5000) for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  return { allowed: true, retryAfterSeconds: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}
