/**
 * The planner side of the Tessera connection, tested where it can fail:
 * the PKCE maths, the authorization URL, and the three ways a summary request
 * returns. None of these need a browser, a Tessera server, or a real token.
 *
 * The server routes (`/api/tessera/*`) are thin translations of these functions;
 * what they add is session checks and cookies, which are exercised end-to-end only
 * against a running Tessera (see docs/integration/study-planner-tessera.md).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthorizeUrl,
  createChallenge,
  createVerifier,
  isValidVerifier,
} from '@/lib/tessera/pkce';
import { exchangeCode, fetchSummary, revokeToken } from '@/lib/tessera/client';

const REAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

describe('PKCE', () => {
  it('reproduces the RFC 7636 appendix B example', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await createChallenge(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('creates verifiers inside the allowed length and alphabet', () => {
    for (let index = 0; index < 20; index += 1) {
      const verifier = createVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
      expect(isValidVerifier(verifier)).toBe(true);
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    }
  });

  it('refuses a verifier that cannot be hashed safely', async () => {
    await expect(createChallenge('too-short')).rejects.toThrow(/43/);
    await expect(createChallenge('x'.repeat(200))).rejects.toThrow(/43/);
  });
});

describe('the authorization URL', () => {
  const input = {
    baseUrl: 'https://tessera.example.com/',
    clientId: 'tamuzi-study-planner',
    redirectUri: 'https://planner.example.com/api/tessera/callback',
    scope: 'learning-summary:read',
    state: 'state-abc',
    codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  };

  it('points at Tessera and asks for S256', () => {
    const url = new URL(buildAuthorizeUrl(input));
    expect(url.origin).toBe('https://tessera.example.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(input.codeChallenge);
    expect(url.searchParams.get('scope')).toBe('learning-summary:read');
    expect(url.searchParams.get('state')).toBe('state-abc');
    expect(url.searchParams.get('redirect_uri')).toBe(input.redirectUri);
    expect(url.searchParams.get('client_id')).toBe('tamuzi-study-planner');
  });

  it('never carries a verifier or a token', () => {
    const href = buildAuthorizeUrl(input);
    expect(href).not.toContain('verifier');
    expect(href).not.toContain('token');
  });
});

describe('fetching the summary', () => {
  const summary = {
    learning_objectives: [],
    progress: {
      concepts_tracked: 0,
      concepts_reviewed: 0,
      average_mastery: null,
      retrieval_attempts: 0,
      last_activity_at: null,
    },
    outstanding_activities: [],
    strengths: [],
    needs_attention: [],
    updated_at: null,
    generated_at: '2026-10-27T18:00:00Z',
    source: 'tessera',
    scope: 'learning-summary:read',
  };

  it('reports a missing connection without calling Tessera', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    expect(await fetchSummary('https://tessera.example.com', undefined)).toEqual({
      ok: false,
      reason: 'not-connected',
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends the token in a header, never in the URL', async () => {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(summary), { status: 200 }));
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await fetchSummary('https://tessera.example.com', 'secret-token');
    expect(result.ok).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://tessera.example.com/api/v1/me/learning-summary');
    expect(url).not.toContain('secret-token');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret-token');
  });

  it('treats 401 and 403 as an expired grant', async () => {
    for (const status of [401, 403]) {
      globalThis.fetch = vi.fn(async () => new Response('{}', { status })) as unknown as typeof fetch;
      const result = await fetchSummary('https://tessera.example.com', 't');
      expect(result).toMatchObject({ ok: false, reason: 'expired' });
    }
  });

  it('treats a network failure as unavailable, not as empty data', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const result = await fetchSummary('https://tessera.example.com', 't');
    expect(result).toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('treats a 500 as unavailable', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    expect(await fetchSummary('https://tessera.example.com', 't')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('refuses a payload that claims a wider scope', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ ...summary, scope: 'learning-summary:write' }), { status: 200 }),
    ) as unknown as typeof fetch;
    expect(await fetchSummary('https://tessera.example.com', 't')).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
  });

  it('keeps an honest fetchedAt beside the data', async () => {
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify(summary), { status: 200 }),
    ) as unknown as typeof fetch;
    const result = await fetchSummary('https://tessera.example.com', 't');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Date.parse(result.fetchedAt)).not.toBeNaN();
      expect(result.summary.progress.average_mastery).toBeNull();
    }
  });
});

describe('the code exchange', () => {
  const base = {
    baseUrl: 'https://tessera.example.com',
    code: 'one-time-code',
    verifier: 'v'.repeat(43),
    clientId: 'tamuzi-study-planner',
    redirectUri: 'https://planner.example.com/api/tessera/callback',
  };

  it('posts the verifier in the body, not the query string', async () => {
    const fetchSpy = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ access_token: 'at', token_type: 'Bearer', expires_in: 3600, scope: 'learning-summary:read' }),
          { status: 200 },
        ),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await exchangeCode(base);
    expect(result.ok).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://tessera.example.com/api/v1/oauth/token');
    expect(url).not.toContain(base.verifier);
    expect(String(init.body)).toContain(base.verifier);
    expect(init.method).toBe('POST');
  });

  it('reports a refusal without throwing', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 400 })) as unknown as typeof fetch;
    const result = await exchangeCode(base);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toContain('400');
  });

  it('rejects a success response with no token', async () => {
    globalThis.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as unknown as typeof fetch;
    expect(await exchangeCode(base)).toMatchObject({ ok: false });
  });
});

describe('revocation', () => {
  it('reports failure but never throws, so the cookie is still cleared', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('offline');
    }) as unknown as typeof fetch;
    expect(await revokeToken('https://tessera.example.com', 't')).toBe(false);
    expect(await revokeToken('https://tessera.example.com', undefined)).toBe(true);
  });
});
