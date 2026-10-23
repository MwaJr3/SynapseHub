/**
 * Resume storage. Local directory by default; S3-compatible in production.
 * The only download path is the permission-checked GET /api/files/[id].
 */
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';

export interface StorageAdapter {
  put(name: string, bytes: Uint8Array): Promise<{ key: string; size: number }>;
  getStream(key: string): Promise<NodeJS.ReadableStream>;
  remove(key: string): Promise<void>;
  provider: 'local' | 's3';
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
    const key = `${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, '_')}`;
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
    const key = `${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, '_')}`;
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

const globalForStorage = globalThis as unknown as {
  __platformStorage?: StorageAdapter;
};

export function getStorage(): StorageAdapter {
  if (!globalForStorage.__platformStorage) {
    const provider = process.env.STORAGE_PROVIDER ?? 'local';
    if (provider === 's3') {
      const bucket = process.env.S3_BUCKET;
      if (!bucket) throw new Error('STORAGE_PROVIDER=s3 requires S3_BUCKET');
      globalForStorage.__platformStorage = new S3Storage(bucket);
    } else {
      globalForStorage.__platformStorage = new LocalStorage(
        process.env.LOCAL_STORAGE_DIR ?? './data/uploads',
      );
    }
  }
  return globalForStorage.__platformStorage;
}

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

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
