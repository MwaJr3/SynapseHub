import { describe, expect, it } from 'vitest';
import { decryptExport, encryptExport } from './secureExport';

describe('encrypted transfer exports', () => {
  it('round-trips a payload only with its supplied passphrase', async () => {
    const encrypted = await encryptExport({ scope: 'full', payload: { version: 3, private: 'kept in archive' } }, 'a long unique passphrase');

    expect(encrypted).toMatchObject({ format: 'personal-os-encrypted-v1', algorithm: 'AES-GCM', kdf: 'PBKDF2-SHA-256' });
    expect(encrypted.ciphertext).not.toContain('kept in archive');
    await expect(decryptExport(encrypted, 'wrong long passphrase')).rejects.toThrow();
    await expect(decryptExport(encrypted, 'a long unique passphrase')).resolves.toEqual({
      scope: 'full', payload: { version: 3, private: 'kept in archive' },
    });
  });

  it('requires a meaningful export passphrase before encryption', async () => {
    await expect(encryptExport({ value: 'private' }, 'short')).rejects.toThrow(/at least 10 characters/i);
  });
});
