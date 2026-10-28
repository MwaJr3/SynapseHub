import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
function s3() {
  if (!process.env.S3_BUCKET) throw new Error('Object storage is not configured.');
  return new S3Client({ region: process.env.S3_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: process.env.S3_ACCESS_KEY_ID ? { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '' } : undefined });
}
function localPath(key: string) {
  if (!/^[a-f0-9-]+\/[a-f0-9-]+$/.test(key)) throw new Error('Invalid storage key.');
  return path.join(process.cwd(), '.data', 'objects', key);
}
export async function putObject(key: string, bytes: Uint8Array, contentType: string) {
  if (process.env.STORAGE_PROVIDER === 's3') await s3().send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET!, Key:key, Body:bytes, ContentType:contentType }));
  else { const dest = localPath(key); await mkdir(path.dirname(dest), { recursive:true }); await writeFile(dest, bytes); }
}
export async function getObject(key: string): Promise<Uint8Array> {
  if (process.env.STORAGE_PROVIDER === 's3') {
    const result = await s3().send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key:key }));
    if (!result.Body) throw new Error('Object not found.'); return result.Body.transformToByteArray();
  }
  return readFile(localPath(key));
}
export async function deleteObject(key: string) {
  if (process.env.STORAGE_PROVIDER === 's3') await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key:key }));
  else await unlink(localPath(key)).catch((e) => { if (e.code !== 'ENOENT') throw e; });
}
