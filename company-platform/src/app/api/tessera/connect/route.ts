import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getSessionActor } from '@/lib/auth';
import {
  COOKIE_PENDING,
  PENDING_MAX_AGE,
  TESSERA_SCOPE,
  cookieOptions,
  readTesseraConfig,
} from '@/lib/tessera/config';
import { buildAuthorizeUrl, createChallenge, createState, createVerifier } from '@/lib/tessera/pkce';

/**
 * Start the connection: remember a verifier and a state for ten minutes, then send
 * the browser to Tessera to approve.
 *
 * Only a signed-in learner may start this, because the grant is issued to a
 * learner. The verifier stays in an httpOnly cookie on this origin; it never
 * appears in a URL and never reaches the browser's JavaScript.
 */
export async function GET(request: Request) {
  const config = readTesseraConfig();
  if (!config) {
    return NextResponse.redirect(new URL('/study-plan?tessera=unconfigured', request.url));
  }

  const actor = await getSessionActor();
  if (!actor) {
    return NextResponse.redirect(new URL('/member/sign-in?next=/study-plan', request.url));
  }

  const verifier = createVerifier();
  const state = createState();
  const codeChallenge = await createChallenge(verifier);

  const store = await cookies();
  store.set(COOKIE_PENDING, JSON.stringify({ verifier, state }), cookieOptions(PENDING_MAX_AGE));

  return NextResponse.redirect(
    buildAuthorizeUrl({
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scope: TESSERA_SCOPE,
      state,
      codeChallenge,
    }),
  );
}
