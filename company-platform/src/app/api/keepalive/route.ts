/**
 * `GET /api/keepalive` — runs `select 1` against the database so a scheduled
 * ping counts as activity and a free-tier Supabase project is not auto-paused.
 * Returns no data and never exposes connection details.
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[keepalive] database unreachable', error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
