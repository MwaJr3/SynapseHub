import { describe, expect, it } from 'vitest';
import { generateSecurePassword } from './UtilityApp';

describe('password generator rules', () => {
  it('rejects an empty character set and unsupported lengths', () => {
    expect(generateSecurePassword(16, [])).toBe('');
    expect(generateSecurePassword(3, ['lowercase'])).toBe('');
    expect(generateSecurePassword(65, ['lowercase'])).toBe('');
  });
  it('generates the requested length and includes each selected set', () => {
    const password = generateSecurePassword(18, ['lowercase', 'uppercase', 'numbers', 'symbols']);
    expect(password).toHaveLength(18);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[0-9]/);
    expect([...password].some((character) => '!@#$%^&*()-_=+[]{};:,.?'.includes(character))).toBe(true);
  });
  it('uses only the selected character set', () => {
    expect(generateSecurePassword(20, ['numbers'])).toMatch(/^\d{20}$/);
  });
});
