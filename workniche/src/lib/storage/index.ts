/**
 * Resume storage. Two adapters behind one interface: a local directory
 * (default, no services) or S3-compatible object storage in production.
 * Files are private; the only download path is the permission-checked
 * GET /api/files/[id] route.
 */
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';

export interface StoredObject {
  key: string;
  size: number;
}

export interface StorageAdapter {
  put(name: string, bytes: Uint8Array): Promise<StoredObject>;
  getStream(key: string): Promise<NodeJS.ReadableStream>;
  remove(key: string): Promise<void>;
  provider: 'local' | 's3';
}

class LocalStorage implements StorageAdapter {
  provider = 'local' as const;
  private dir: string;

  constructor(dir: string) {
    this.dir = dir;
  }

  private async ensure(): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
  }

  private resolve(key: string): string {
    const target = path.resolve(this.dir, key);
    // Never escape the storage directory.
    if (!target.startsWith(path.resolve(this.dir) + path.sep)) {
      throw new Error('Invalid storage key');
    }
    return target;
  }

  async put(name: string, bytes: Uint8Array): Promise<StoredObject> {
    await this.ensure();
    const key = `${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, '_')}`;
    const target = this.resolve(key);
    await fs.writeFile(target, bytes);
    return { key, size: bytes.byteLength };
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const target = this.resolve(key);
    // Throws ENOENT if the key is unknown.
    await fs.access(target);
    return createReadStream(target);
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }
}

class S3Storage implements StorageAdapter {
  provider = 's3' as const;
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  private async client() {
    // Lazy so local installs without AWS credentials never load the SDK.
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

  async put(name: string, bytes: Uint8Array): Promise<StoredObject> {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const key = `${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, '_')}`;
    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: bytes,
        // Private by default; access is always authorized server-side.
        ACL: 'private',
      }),
    );
    return { key, size: bytes.byteLength };
  }

  async getStream(key: string): Promise<NodeJS.ReadableStream> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    const result = await client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const body = result.Body;
    if (!body) throw new Error('Empty object body');
    return body as NodeJS.ReadableStream;
  }

  async remove(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

const globalForStorage = globalThis as unknown as {
  __worknicheStorage?: StorageAdapter;
};

export function getStorage(): StorageAdapter {
  if (!globalForStorage.__worknicheStorage) {
    const provider = process.env.STORAGE_PROVIDER ?? 'local';
    if (provider === 's3') {
      const bucket = process.env.S3_BUCKET;
      if (!bucket) throw new Error('STORAGE_PROVIDER=s3 requires S3_BUCKET');
      globalForStorage.__worknicheStorage = new S3Storage(bucket);
    } else {
      globalForStorage.__worknicheStorage = new LocalStorage(
        process.env.LOCAL_STORAGE_DIR ?? './data/uploads',
      );
    }
  }
  return globalForStorage.__worknicheStorage;
}

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export function isAllowedResumeType(mime: string): boolean {
  return (RESUME_MIME_TYPES as readonly string[]).includes(mime);
}
