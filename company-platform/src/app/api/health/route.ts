/**
 * `GET /api/health` — the deployment's configuration, from outside, without a
 * sign-in.
 *
 * `/admin/settings` already renders `configReport()`, but it is behind auth, and
 * an operator who cannot sign in yet is exactly the person who needs it. This is
 * the same report as JSON: variable **names** and states only, never values.
 *
 * It answers "did the settings I just saved take effect in this deployment?" —
 * which a build log cannot answer, because environment variables are read at
 * request time by the running instance.
 */
import { NextResponse } from 'next/server';

import { configReport } from '@/lib/config-check';

// Environment is per-instance and read at request time; never prerender this.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const report = configReport();
  return NextResponse.json(
    {
      ready: report.ready,
      blockers: report.blockers,
      checks: report.checks.map((check) => ({
        id: check.id,
        label: check.label,
        state: check.state,
        missing: check.missing,
      })),
    },
    {
      // A cached copy would answer the question with the previous deployment's
      // configuration, which is the one thing this route exists to rule out.
      headers: { 'cache-control': 'no-store' },
      status: report.ready ? 200 : 503,
    },
  );
}
