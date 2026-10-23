import { describe, expect, it } from 'vitest';
import { formatBytes, kindTone, shortHash } from './utils';

describe('formatBytes', () => {
  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('shortHash', () => {
  it('truncates hashes and handles empty', () => {
    expect(shortHash('a'.repeat(64))).toBe(`${'a'.repeat(12)}…`);
    expect(shortHash('')).toBe('—');
  });
});

describe('kindTone', () => {
  it('maps comparison kinds to distinct styles', () => {
    expect(kindTone('changed')).toContain('rose');
    expect(kindTone('missing')).toContain('amber');
    expect(kindTone('new')).toContain('sky');
    expect(kindTone('matched')).toContain('emerald');
  });
});
