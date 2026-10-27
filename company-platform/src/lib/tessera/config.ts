/**
 * Configuration for the Tessera connection.
 *
 * Three settings, all server-side, all optional. When any is missing the study
 * planner behaves exactly as it did before: it plans without progress data and
 * says so. There is no "configured by default" and no placeholder host — a link is
 * either real or absent, never `#`.
 */

export interface TesseraConfig {
  /** Origin of the Tessera API, without a trailing slash. */
  baseUrl: string;
  clientId: string;
  /** Must match one of `TESSERA_PLANNER_REDIRECT_URIS` on the Tessera side. */
  redirectUri: string;
}

function trim(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

export function readTesseraConfig(env: NodeJS.ProcessEnv = process.env): TesseraConfig | null {
  const baseUrl = trim(env.TESSERA_BASE_URL);
  const clientId = (env.TESSERA_PLANNER_CLIENT_ID ?? '').trim();
  const redirectUri = (env.TESSERA_PLANNER_REDIRECT_URI ?? '').trim();
  if (!baseUrl || !clientId || !redirectUri) return null;
  return { baseUrl, clientId, redirectUri };
}

/** The same value the provider checks; keeping it in one place avoids drift. */
export const TESSERA_SCOPE = 'learning-summary:read';

/** Cookies. `__Host-` requires Secure, so the prefix is only used in production. */
export const COOKIE_PENDING = 'tessera_pending';
export const COOKIE_TOKEN = 'tessera_token';
export const PENDING_MAX_AGE = 10 * 60;
export const TOKEN_MAX_AGE = 60 * 60;

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}
