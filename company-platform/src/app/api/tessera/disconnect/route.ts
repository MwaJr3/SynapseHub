import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSessionActor } from '@/lib/auth';
import { COOKIE_TOKEN, readTesseraConfig } from '@/lib/tessera/config';
import { revokeToken } from '@/lib/tessera/client';

/**
 * Disconnect. The token is revoked at Tessera first, then the cookie is cleared —
 * so a failed network call still removes the local credential rather than leaving
 * a "connected" badge over a dead session. The learner can also disconnect from
 * Tessera's own settings, which invalidates this token server-side.
 */
export async function POST() {
  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.json({ disconnected: false, reason: 'signed-out' }, { status: 401 });
  }

  const store = await cookies();
  const token = store.get(COOKIE_TOKEN)?.value;
  const config = readTesseraConfig();
  const revokedRemotely = config ? await revokeToken(config.baseUrl, token) : false;
  store.delete(COOKIE_TOKEN);

  return NextResponse.json({ disconnected: true, revokedRemotely }, { headers: { 'cache-control': 'no-store' } });
}
