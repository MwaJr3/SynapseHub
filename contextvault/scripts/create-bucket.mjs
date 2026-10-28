// Bootstrap a bucket only on the explicitly configured S3-compatible endpoint.
// This is a one-shot Compose setup job, not application startup logic.
import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const { S3_BUCKET, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
if (!S3_BUCKET || !S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  throw new Error('S3_BUCKET, S3_ENDPOINT and object-storage credentials are required.');
}
const client = new S3Client({
  region: S3_REGION || 'us-east-1', endpoint: S3_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});
try {
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    console.log('Object storage bucket already exists.');
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== 'NotFound' && error?.name !== 'NoSuchBucket') throw error;
    try {
      await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
    } catch (createError) {
      // Another setup job may have created the same bucket concurrently.
      if (createError?.name !== 'BucketAlreadyOwnedByYou') throw createError;
    }
    console.log('Object storage bucket is ready.');
  }
} catch (error) {
  console.error(JSON.stringify({ event: 'storage.bucket_setup_failed', type: error instanceof Error ? error.name : 'unknown' }));
  process.exitCode = 1;
} finally {
  client.destroy();
}
