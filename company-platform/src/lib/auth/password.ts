/** Password hashing: node scrypt, per-user salt, constant-time compare. */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const COST = 16384;

function scryptAsync(
  password: string,
  salt: string,
  keyLength: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    r: 8,
    p: 1,
  });
  return `scrypt$${COST}$8$1$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, costRaw, rRaw, pRaw, salt, hashHex] = parts;
  const expected = Buffer.from(hashHex ?? '', 'hex');
  if (!salt || expected.length === 0) return false;
  const derived = await scryptAsync(password, salt, expected.length, {
    N: Number(costRaw),
    r: Number(rRaw),
    p: Number(pRaw),
  });
  return (
    derived.length === expected.length && timingSafeEqual(derived, expected)
  );
}
