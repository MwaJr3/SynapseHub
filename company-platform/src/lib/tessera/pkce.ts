/**
 * PKCE (RFC 7636) and the authorization-request builder.
 *
 * Pure functions on purpose: they are the part that has to be exactly right, and
 * they can be tested against the specification's published example without a
 * browser, a network or a server.
 *
 * Two rules this file enforces:
 *
 * * `code_challenge_method` is always `S256`. `plain` is not offered.
 * * the token endpoint is the only place a code is exchanged, and it is a POST with
 *   `application/json` — never a query string, where it would land in logs.
 */

export const VERIFIER_MIN = 43;
export const VERIFIER_MAX = 128;

/** RFC 7636 §4.1: unreserved characters only. */
const UNRESERVED = /^[A-Za-z0-9\-._~]+$/;

/** base64url without padding, per RFC 4648 §5. */
export function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A fresh 32-byte verifier (43 base64url characters, the minimum length). */
export function createVerifier(random: (size: number) => Uint8Array = randomBytes): string {
  return base64url(random(32));
}

function randomBytes(size: number): Uint8Array {
  const buffer = new Uint8Array(size);
  crypto.getRandomValues(buffer);
  return buffer;
}

/** `BASE64URL(SHA256(ASCII(verifier)))`. */
export async function createChallenge(verifier: string): Promise<string> {
  if (!isValidVerifier(verifier)) {
    throw new Error('PKCE verifier must be 43–128 unreserved characters.');
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function isValidVerifier(verifier: string): boolean {
  return (
    verifier.length >= VERIFIER_MIN &&
    verifier.length <= VERIFIER_MAX &&
    UNRESERVED.test(verifier)
  );
}

/** A CSRF token for the round trip. Compared in constant time on return. */
export function createState(random: (size: number) => Uint8Array = randomBytes): string {
  return base64url(random(24));
}

export interface AuthorizeUrlInput {
  baseUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
}

/** Where the browser is sent to approve the connection — Tessera's own origin. */
export function buildAuthorizeUrl(input: AuthorizeUrlInput): string {
  // The consent screen is a page in Tessera's SPA; it reads these parameters from
  // the address bar on load. The request is a top-level navigation, so the learner's
  // Tessera session cookie is sent to Tessera and to nobody else.
  const origin = new URL(input.baseUrl).origin;
  const consent = new URL('/', origin);
  consent.searchParams.set('client_id', input.clientId);
  consent.searchParams.set('redirect_uri', input.redirectUri);
  consent.searchParams.set('scope', input.scope);
  consent.searchParams.set('state', input.state);
  consent.searchParams.set('code_challenge', input.codeChallenge);
  consent.searchParams.set('code_challenge_method', 'S256');
  return consent.toString();
}

/**
 * The URL to send a learner to when something is not configured.
 *
 * Deliberately a same-origin path rather than an external one: the connection flow
 * must never leave the platform for an address that does not exist.
 */
export const SETUP_PATH = '/study-plan?tessera=unconfigured';
