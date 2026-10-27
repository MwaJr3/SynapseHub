import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  COOKIE_PENDING,
  COOKIE_TOKEN,
  TOKEN_MAX_AGE,
  cookieOptions,
  readTesseraConfig,
} from '@/lib/tessera/config';
import { exchangeCode } from '@/lib/tessera/client';

/**
 * The redirect back from Tessera: verify the state, exchange the code, store the
 * token in an httpOnly cookie, and return the learner to the planner.
 *
 * Every failure lands the learner on the same page with a different `tessera`
 * value, so the planner can explain what happened without a stack trace. Nothing
 * about the failure is written to the URL beyond that word.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const denied = url.searchParams.get('error');

  if (denied) {
    return NextResponse.redirect(new URL(`/study-plan?tessera=declined`, url.origin));
  }

  const config = readTesseraConfig();
  if (!config) {
    return NextResponse.redirect(new URL('/study-plan?tessera=unconfigured', url.origin));
  }

  const store = await cookies();
  const pendingRaw = store.get(COOKIE_PENDING)?.value;
  store.delete(COOKIE_PENDING);

  if (!code || !state || !pendingRaw) {
    return NextResponse.redirect(new URL('/study-plan?tessera=failed', url.origin));
  }

  let verifier = '';
  try {
    const pending = JSON.parse(pendingRaw) as { verifier?: string; state?: string };
    // A state that does not match is a cross-site request forgery attempt or a
    // stale tab. Either way it is not a connection this learner started.
    if (!pending.state || pending.state !== state) {
      return NextResponse.redirect(new URL('/study-plan?tessera=failed', url.origin));
    }
    verifier = pending.verifier ?? '';
  } catch {
    return NextResponse.redirect(new URL('/study-plan?tessera=failed', url.origin));
  }

  const exchanged = await exchangeCode({
    baseUrl: config.baseUrl,
    code,
    verifier,
    clientId: config.clientId,
    redirectUri: config.redirectUri,
  });
  if (!exchanged.ok) {
    return NextResponse.redirect(new URL('/study-plan?tessera=failed', url.origin));
  }

  store.set(COOKIE_TOKEN, exchanged.token.access_token, cookieOptions(TOKEN_MAX_AGE));
  return NextResponse.redirect(new URL('/study-plan?tessera=connected', url.origin));
}
