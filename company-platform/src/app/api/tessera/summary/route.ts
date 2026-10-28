import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSessionActor } from '@/lib/auth';
import { COOKIE_TOKEN, readTesseraConfig } from '@/lib/tessera/config';
import { fetchSummary } from '@/lib/tessera/client';

/**
 * The summary the planner is allowed to show.
 *
 * A failure here is never fatal to the page: the response says whether the
 * connection is missing, expired or temporarily unavailable, and the planner keeps
 * planning from published principles. `Cache-Control: no-store` because "last
 * refreshed" has to be true.
 */
export async function GET() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ connected: false, reason: 'signed-out' }, { status: 401 });
  }

  const config = readTesseraConfig();
  if (!config) {
    return NextResponse.json({ connected: false, reason: 'unconfigured' }, { status: 503 });
  }

  const store = await cookies();
  const token = store.get(COOKIE_TOKEN)?.value;
  const result = await fetchSummary(config.baseUrl, token);

  if (!result.ok) {
    if (result.reason === 'expired') {
      // The grant is gone on Tessera's side; drop the local credential too.
      store.delete(COOKIE_TOKEN);
    }
    return NextResponse.json(
      { connected: result.reason !== 'not-connected', reason: result.reason, message: 'message' in result ? result.message : null },
      { status: result.reason === 'not-connected' ? 401 : 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  return NextResponse.json(
    { connected: true, summary: result.summary, fetchedAt: result.fetchedAt },
    { headers: { 'cache-control': 'no-store' } },
  );
}
