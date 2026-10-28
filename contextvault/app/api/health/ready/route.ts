import { database } from '../../../../lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Do not leak connection details. This checks the database and core schema,
// not object storage, worker progress, or external AI provider availability.
export async function GET() {
  let ready = false;
  try {
    const result = await (await database()).query(`SELECT
      to_regclass('public.users') IS NOT NULL AND
      to_regclass('public.documents') IS NOT NULL AND
      to_regclass('public.document_chunks') IS NOT NULL AND
      to_regclass('public.ingestion_jobs') IS NOT NULL AND
      to_regclass('public.storage_deletions') IS NOT NULL AND
      EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') AS ready`);
    ready = result.rows[0]?.ready === true;
  } catch {
    // A failed connection or missing schema is reported as a generic 503.
  }
  return Response.json({ status: ready ? 'ready' : 'not ready' }, {
    status: ready ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
