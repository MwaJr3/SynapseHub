export interface EncryptedExport {
  format: 'personal-os-encrypted-v1';
  algorithm: 'AES-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const ITERATIONS = 310_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

// Copy into an ArrayBuffer to meet the strict Web Crypto BufferSource contract.
function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  if (passphrase.length < 10) {
    throw new Error('Use an export passphrase with at least 10 characters.');
  }
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: asArrayBuffer(salt), iterations: ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypts an export in the browser; the passphrase is never persisted. */
export async function encryptExport(payload: unknown, passphrase: string): Promise<EncryptedExport> {
  if (!crypto?.subtle) throw new Error('Web Crypto is unavailable in this browser.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(iv) },
    key,
    textEncoder.encode(JSON.stringify(payload)),
  );
  return {
    format: 'personal-os-encrypted-v1',
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

function isEncryptedExport(value: unknown): value is EncryptedExport {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EncryptedExport>;
  return (
    candidate.format === 'personal-os-encrypted-v1' &&
    candidate.algorithm === 'AES-GCM' &&
    candidate.kdf === 'PBKDF2-SHA-256' &&
    typeof candidate.iterations === 'number' &&
    typeof candidate.salt === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.ciphertext === 'string'
  );
}

export async function decryptExport(serialized: unknown, passphrase: string): Promise<unknown> {
  if (!isEncryptedExport(serialized)) throw new Error('This is not a Personal OS encrypted export.');
  const salt = base64ToBytes(serialized.salt);
  const iv = base64ToBytes(serialized.iv);
  const ciphertext = base64ToBytes(serialized.ciphertext);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(iv) },
    key,
    asArrayBuffer(ciphertext),
  );
  return JSON.parse(textDecoder.decode(plain)) as unknown;
}
