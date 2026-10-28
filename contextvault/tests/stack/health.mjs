// Wait for the public liveness/readiness contract inside a disposable stack.
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const expected = process.argv[2];
assert.ok(expected === 'up' || expected === 'down', 'Use up or down.');
const base = process.env.STACK_BASE_URL || 'http://127.0.0.1:3000';
const target = expected === 'up' ? 200 : 503;
const deadline = Date.now() + 90000;
let last = 'no response';
while (Date.now() < deadline) {
  try {
    const live = await fetch(new URL('/api/health/live', base), { signal: AbortSignal.timeout(15000) });
    const ready = await fetch(new URL('/api/health/ready', base), { signal: AbortSignal.timeout(15000) });
    last = `liveness ${live.status}, readiness ${ready.status}`;
    if (live.status === 200 && ready.status === target) {
      console.log(`Health ${expected}: ${last}.`);
      process.exit(0);
    }
  } catch (error) { last = error instanceof Error ? error.name : 'request failed'; }
  await delay(1500);
}
throw new Error(`Health ${expected} did not converge: ${last}`);
