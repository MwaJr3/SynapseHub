/**
 * Resume storage. Local directory by default; the database or an S3-compatible
 * bucket in a deployment.
 *
 * The only download path is the permission-checked `GET /api/files/[id]`, so no
 * adapter ever produces a public URL — there is nowhere to leak one from.
 *
 * **Why a database provider exists.** A resume is a PDF of a few hundred
 * kilobytes read rarely, and this platform already has a durable PostgreSQL
 * database with a backup. Pointing storage at it makes uploads work on a
 * deployment without a second vendor account or an object-storage key, which is
 * the difference between "resume upload is documented" and "resume upload
 * works". The object store is still the right answer at a different scale, and
 * `STORAGE_PROVIDER=s3` remains a one-variable change.
 */
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

import { sql } from 'drizzle-orm';

import { getDb, rowsOf } from '@/lib/db';

export type StorageProviderId = 'local' | 's3' | 'postgres';

export interface StorageAdapter {
  put(name: string, bytes: Uint8Array): Promise<{ key: string; size: number }>;
  getStream(key: string): Promise<NodeJS.ReadableStream>;
  remove(key: string): Promise<void>;
  provider: StorageProviderId;
}

/**
 * Keys are opaque and generated here, never taken from the client. The name is
 * reduced to a safe suffix so it cannot influence the path or the query.
 */
function storageKeyFor(name: string): string {
  return `${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, '_')}`;
}

class LocalStorage implements StorageAdapter {
  provider = 'local' as const;
  constructor(private dir: string) {}

  private resolve(key: string): string {
    const target = path.resolve(this.dir, key);
    if (!target.startsWith(path.resolve(this.dir) + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return target;
  }

  async put(name: string, bytes: Uint8Array) {
    await fs.mkdir(this.dir, { recursive: true });
    const key = storageKeyFor(name);
    await fs.writeFile(this.resolve(key), bytes);
    return { key, size: bytes.byteLength };
  }

  async getStream(key: string) {
    const target = this.resolve(key);
    await fs.access(target);
    return createReadStream(target);
  }

  async remove(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

/**
 * Bytes in `platform.storage_blobs`. No new account, no new credential: the
 * database this deployment already has is the storage.
 */
export class PostgresStorage implements StorageAdapter {
  provider = 'postgres' as const;

  async put(name: string, bytes: Uint8Array) {
    const db = getDb();
    const key = storageKeyFor(name);
    await db.execute(
      sql`INSERT INTO platform.storage_blobs (key, bytes, size_bytes, content_type)
          VALUES (${key}, ${bytes}, ${bytes.byteLength}, 'application/pdf')`,
    );
    return { key, size: bytes.byteLength };
  }

  async getStream(key: string) {
    const db = getDb();
    const rows = rowsOf(
      await db.execute(sql`SELECT bytes FROM platform.storage_blobs WHERE key = ${key} LIMIT 1`),
    );
    const value = rows[0]?.bytes;
    if (!(value instanceof Uint8Array)) throw new Error('Not found');
    return Readable.from(Buffer.from(value));
  }

  async remove(key: string) {
    const db = getDb();
    await db.execute(sql`DELETE FROM platform.storage_blobs WHERE key = ${key}`);
  }
}

class S3Storage implements StorageAdapter {
  provider = 's3' as const;
  constructor(private bucket: string) {}

  private async client() {
    const { S3Client } = await import('@aws-sdk/client-s3');
    return new S3Client({
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT || undefined,
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials:
        process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  async put(name: string, bytes: Uint8Array) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const key = storageKeyFor(name);
    const client = await this.client();
    await client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ACL: 'private' }),
    );
    return { key, size: bytes.byteLength };
  }

  async getStream(key: string) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    const result = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!result.Body) throw new Error('Empty object body');
    return result.Body as NodeJS.ReadableStream;
  }

  async remove(key: string) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export interface StorageStatus {
  provider: StorageProviderId;
  /** Variables that must be set for this provider, by name only. */
  missing: string[];
  ready: boolean;
  detail: string;
}

/**
 * Whether resume uploads will work on this deployment, and what is missing if
 * not. Reported by `npm run config:check` and by the admin settings panel; it
 * never reads or prints a secret value.
 */
/** A plain environment record: `process.env` in a deployment, a literal in a test. */
export type StorageEnv = Record<string, string | undefined>;

export function storageStatus(env: StorageEnv = process.env): StorageStatus {
  const configured = (env.STORAGE_PROVIDER ?? '').trim().toLowerCase();
  const provider: StorageProviderId =
    configured === 's3' ? 's3' : configured === 'postgres' ? 'postgres' : 'local';

  if (provider === 's3') {
    const missing = ['S3_BUCKET', 'S3_REGION'].filter((name) => !(env[name] ?? '').trim());
    const credentials = ['S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'].filter(
      (name) => !(env[name] ?? '').trim(),
    );
    // A bucket can be reachable through an instance role instead of keys, so
    // credentials are reported but do not on their own make the provider unusable.
    return {
      provider,
      missing: [...missing, ...credentials],
      ready: missing.length === 0,
      detail:
        'S3-compatible object storage. Objects are private; downloads go through the permission-checked route.',
    };
  }

  if (provider === 'postgres') {
    const hasDatabase = Boolean((env.DATABASE_URL ?? '').trim());
    return {
      provider,
      missing: hasDatabase ? [] : ['DATABASE_URL'],
      ready: hasDatabase,
      detail:
        'Bytes in `platform.storage_blobs`, in the database that already holds the records. No object store required.',
    };
  }

  return {
    provider,
    missing: [],
    ready: true,
    detail:
      'Local directory. Fine for development; on a deployment the filesystem is per-instance and read-only outside /tmp, so this loses uploads.',
  };
}

const globalForStorage = globalThis as unknown as {
  __platformStorage?: StorageAdapter;
};

export function getStorage(): StorageAdapter {
  if (!globalForStorage.__platformStorage) {
    const provider = (process.env.STORAGE_PROVIDER ?? 'local').trim().toLowerCase();
    if (provider === 's3') {
      const bucket = process.env.S3_BUCKET;
      if (!bucket) throw new Error('STORAGE_PROVIDER=s3 requires S3_BUCKET');
      globalForStorage.__platformStorage = new S3Storage(bucket);
    } else if (provider === 'postgres') {
      globalForStorage.__platformStorage = new PostgresStorage();
    } else {
      globalForStorage.__platformStorage = new LocalStorage(
        process.env.LOCAL_STORAGE_DIR ?? './data/uploads',
      );
    }
  }
  return globalForStorage.__platformStorage;
}

/** Test seam: forget the memoised adapter, as `forgetCachedConnection` does for the database. */
export function forgetCachedStorage(): void {
  delete globalForStorage.__platformStorage;
}

/**
 * 4 MB, not 5.
 *
 * A serverless request and response body is capped at 4.5 MB, and every byte of a
 * resume passes through this application twice — once on upload, once on the
 * download the permission check guards. A 5 MB PDF would be accepted by the
 * picker and then fail at the platform edge, which reads as a bug in the site.
 * 4 MB leaves room under the ceiling for both directions.
 */
export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

/** PDF signature check — never trust the filename or browser MIME alone. */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 && // F
    bytes[4] === 0x2d // -
  );
}
