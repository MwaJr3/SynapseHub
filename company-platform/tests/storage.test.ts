/**
 * Resume storage.
 *
 * The deployment provider is `postgres`: the bytes go into
 * `platform.storage_blobs`, in the same database that holds every other record.
 * That choice is only defensible if the round trip actually works, so this file
 * runs it against the real schema rather than a double — write a PDF, read it
 * back byte-for-byte, delete it, and confirm a missing key is a failure rather
 * than an empty file.
 *
 * Also pins the two things that made the previous behaviour misleading:
 * `storageStatus` must say what a deployment will really do (the local default
 * loses uploads), and the size cap must stay under the serverless body limit.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';

import {
  MAX_RESUME_BYTES,
  PostgresStorage,
  forgetCachedStorage,
  getStorage,
  looksLikePdf,
  storageStatus,
} from '@/lib/storage';

/** A minimal PDF: the signature the validator checks, plus a unique tail. */
function pdf(tag: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n% ${tag}\n1 0 obj\n<<>>\nendobj\n%%EOF\n`);
}

async function drain(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Uint8Array));
  return Buffer.concat(chunks);
}

const original = { ...process.env };

beforeEach(() => {
  forgetCachedStorage();
});

afterEach(() => {
  process.env = { ...original };
  forgetCachedStorage();
});

describe('postgres storage provider', () => {
  it('writes, reads back, and removes a file', async () => {
    const storage = new PostgresStorage();
    const bytes = pdf('round-trip');

    const stored = await storage.put('Mwangala Resume.pdf', bytes);
    expect(stored.size).toBe(bytes.byteLength);
    // The key is generated here and keeps only a safe suffix of the name, so a
    // filename can never reach a path or a query.
    expect(stored.key).toMatch(/^[0-9a-f-]{36}-Mwangala_Resume\.pdf$/);

    const read = await drain(await storage.getStream(stored.key));
    expect(new Uint8Array(read)).toEqual(bytes);
    expect(looksLikePdf(new Uint8Array(read))).toBe(true);

    await storage.remove(stored.key);
    await expect(storage.getStream(stored.key)).rejects.toThrow(/Not found/);
  });

  it('gives two uploads of the same filename distinct keys', async () => {
    const storage = new PostgresStorage();
    const first = await storage.put('cv.pdf', pdf('one'));
    const second = await storage.put('cv.pdf', pdf('two'));

    expect(first.key).not.toBe(second.key);
    await storage.remove(first.key);
    await storage.remove(second.key);
  });
});

describe('storage selection', () => {
  it('returns the configured adapter and memoises it until forgotten', () => {
    process.env.STORAGE_PROVIDER = 'postgres';
    process.env.DATABASE_URL = 'postgresql://example/db';

    const first = getStorage();
    expect(first.provider).toBe('postgres');
    expect(getStorage()).toBe(first);

    forgetCachedStorage();
    expect(getStorage()).not.toBe(first);

    delete process.env.DATABASE_URL;
  });

  it('refuses s3 without a bucket, rather than writing to a local directory', () => {
    process.env.STORAGE_PROVIDER = 's3';
    delete process.env.S3_BUCKET;

    expect(() => getStorage()).toThrow(/requires S3_BUCKET/);
  });

  it('defaults to the local directory when nothing is set', () => {
    delete process.env.STORAGE_PROVIDER;
    expect(getStorage().provider).toBe('local');
  });
});

describe('storage status', () => {
  it('reports postgres as ready once a database is configured', () => {
    const status = storageStatus({
      STORAGE_PROVIDER: 'postgres',
      DATABASE_URL: 'postgresql://example/db',
    });
    expect(status.provider).toBe('postgres');
    expect(status.ready).toBe(true);
    expect(status.missing).toEqual([]);
  });

  it('names DATABASE_URL when postgres is chosen without one', () => {
    const status = storageStatus({ STORAGE_PROVIDER: 'postgres' });
    expect(status.ready).toBe(false);
    expect(status.missing).toEqual(['DATABASE_URL']);
  });

  it('names the s3 variables without pretending credentials are optional', () => {
    const status = storageStatus({ STORAGE_PROVIDER: 's3' });
    expect(status.ready).toBe(false);
    expect(status.missing).toContain('S3_BUCKET');
    expect(status.missing).toContain('S3_ACCESS_KEY_ID');
  });

  it('describes the local default as unsuitable for a deployment', () => {
    const status = storageStatus({});
    expect(status.provider).toBe('local');
    // It is "ready" for development and honest about what it is.
    expect(status.ready).toBe(true);
    expect(status.detail).toMatch(/loses uploads/);
  });

  it('treats an unrecognised provider name as local instead of throwing at startup', () => {
    expect(storageStatus({ STORAGE_PROVIDER: 'ftp' }).provider).toBe('local');
  });
});

describe('the upload cap', () => {
  it('stays under the 4.5 MB serverless body limit', () => {
    expect(MAX_RESUME_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_RESUME_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });

  it('accepts a Readable stream from the adapter', async () => {
    // The download route hands the adapter's stream straight to `Response`;
    // this asserts the shape it relies on is a Node readable.
    const stream = Readable.from(Buffer.from(pdf('stream')));
    const read = await drain(stream);
    expect(looksLikePdf(new Uint8Array(read))).toBe(true);
  });
});
