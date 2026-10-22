import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password hashing', () => {
  it('verifies a correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct-horse-battery');
    expect(stored.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct-horse-battery', stored)).toBe(true);
    expect(await verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('produces different hashes per call (per-user salt)', async () => {
    const a = await hashPassword('same-password-123');
    const b = await hashPassword('same-password-123');
    expect(a).not.toBe(b);
  });

  it('rejects malformed stored values', async () => {
    expect(await verifyPassword('anything', 'garbage')).toBe(false);
    expect(await verifyPassword('anything', 'scrypt$1$2$3$xx$yy')).toBe(false);
  });
});
