/**
 * The two server-to-server calls to Tessera, and how their failures are named.
 *
 * The planner's core job — building a study plan from published principles — does
 * not depend on either call. That is why failures are values here rather than
 * exceptions: the UI can say "progress is unavailable right now" and keep working,
 * instead of rendering an error page over a feature that never needed Tessera.
 */

import { TESSERA_SCOPE } from './config';

export type SummaryFailure =
  | { ok: false; reason: 'not-connected' }
  | { ok: false; reason: 'expired'; message: string }
  | { ok: false; reason: 'unavailable'; message: string };

export interface SummaryObjective {
  id: string;
  title: string;
  concept_count: number;
  created_at: string | null;
}

export interface SummaryEntry {
  concept_id: string;
  title: string;
  mastery: number;
  due_at: string | null;
  overdue_days: number;
}

export interface LearningSummary {
  learning_objectives: SummaryObjective[];
  progress: {
    concepts_tracked: number;
    concepts_reviewed: number;
    average_mastery: number | null;
    retrieval_attempts: number;
    last_activity_at: string | null;
  };
  outstanding_activities: SummaryEntry[];
  strengths: SummaryEntry[];
  needs_attention: SummaryEntry[];
  updated_at: string | null;
  generated_at: string;
  source: string;
  scope: string;
}

export type SummaryResult = { ok: true; summary: LearningSummary; fetchedAt: string } | SummaryFailure;

const TIMEOUT_MS = 5_000;

async function postJson(url: string, body: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
    // A summary is live data; a cached copy would be a lie about "last refreshed".
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

/** Exchange the one-time code. Called only from the callback route handler. */
export async function exchangeCode(input: {
  baseUrl: string;
  code: string;
  verifier: string;
  clientId: string;
  redirectUri: string;
}): Promise<{ ok: true; token: TokenResponse } | { ok: false; message: string }> {
  try {
    const response = await postJson(`${input.baseUrl}/api/v1/oauth/token`, {
      grant_type: 'authorization_code',
      code: input.code,
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      code_verifier: input.verifier,
    });
    if (!response.ok) {
      return { ok: false, message: `Tessera refused the connection (${response.status}).` };
    }
    const token = (await response.json()) as TokenResponse;
    if (typeof token.access_token !== 'string' || !token.access_token) {
      return { ok: false, message: 'Tessera returned no token.' };
    }
    return { ok: true, token };
  } catch (cause) {
    return { ok: false, message: describe(cause) };
  }
}

/** Fetch the summary. A 401 means the grant is gone; a thrown fetch means it is down. */
export async function fetchSummary(
  baseUrl: string,
  token: string | undefined,
): Promise<SummaryResult> {
  if (!token) return { ok: false, reason: 'not-connected' };
  try {
    const response = await fetch(`${baseUrl}/api/v1/me/learning-summary`, {
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'expired', message: 'The Tessera connection has expired.' };
    }
    if (!response.ok) {
      return { ok: false, reason: 'unavailable', message: `Tessera answered ${response.status}.` };
    }
    const summary = (await response.json()) as LearningSummary;
    if (summary.scope !== TESSERA_SCOPE) {
      // Refuse to use a payload that claims a wider scope than was asked for.
      return { ok: false, reason: 'unavailable', message: 'Unexpected scope in the summary.' };
    }
    return { ok: true, summary, fetchedAt: new Date().toISOString() };
  } catch (cause) {
    return { ok: false, reason: 'unavailable', message: describe(cause) };
  }
}

/** Best-effort revocation. The cookie is cleared even when this call fails. */
export async function revokeToken(baseUrl: string, token: string | undefined): Promise<boolean> {
  if (!token) return true;
  try {
    const response = await postJson(`${baseUrl}/api/v1/oauth/revoke`, { token });
    return response.ok;
  } catch {
    return false;
  }
}

function describe(cause: unknown): string {
  if (cause instanceof Error && cause.name === 'TimeoutError') {
    return 'Tessera did not respond in time.';
  }
  return 'Tessera could not be reached.';
}
