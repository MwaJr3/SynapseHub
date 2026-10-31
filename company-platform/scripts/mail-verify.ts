#!/usr/bin/env tsx
/**
 * `npm run mail:verify` — does the Brevo credential actually work?
 *
 * The contact form reports `setup-required` when a variable is missing, and it
 * reports `failed` with a safe reason when Brevo refuses. Neither state tells an
 * operator *which* of the two problems they have before a visitor hits it. This
 * does, without a browser:
 *
 *   1. `GET /v3/account`  — is the key valid, and which account is it?
 *   2. `GET /v3/senders`  — which sender addresses are actually verified?
 *   3. a comparison       — is `CONTACT_FROM_EMAIL` one of them?
 *   4. `--send`           — one real message, to prove delivery end to end.
 *
 * It prints HTTP status codes and addresses, and **never the key**: not in a
 * success line, a failure line, an exception, or a stack trace.
 */
const BREVO = 'https://api.brevo.com/v3';
const TIMEOUT_MS = 15_000;

interface Sender {
  id?: number;
  name?: string;
  email: string;
  active?: boolean;
}

function key(): string {
  return (process.env.BREVO_API_KEY ?? '').trim();
}

async function call(
  path: string,
  init: RequestInit = {},
): Promise<{ status: number; body: unknown; ok: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${BREVO}${path}`, {
      ...init,
      headers: {
        'api-key': key(),
        accept: 'application/json',
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { status: response.status, body, ok: response.ok };
  } catch (error: unknown) {
    // A blocked network is a different problem from a rejected key, and saying
    // so is the difference between five minutes and an afternoon. Status 0 is
    // not an HTTP status: it means no request completed.
    const detail =
      error instanceof Error && error.name === 'AbortError'
        ? `no response within ${TIMEOUT_MS / 1000}s`
        : 'network unreachable (DNS, proxy or egress blocked)';
    return { status: 0, body: { message: detail }, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** A short, safe rendering of Brevo's error body — never echoed wholesale. */
function reason(body: unknown): string {
  const message = (body as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message.slice(0, 160) : 'no message returned';
}

async function main(): Promise<void> {
  const send = process.argv.includes('--send');

  if (key().length === 0) {
    console.error('[mail] BREVO_API_KEY is not set. Nothing was checked.');
    process.exit(1);
  }

  let failures = 0;

  const account = await call('/account');
  if (account.ok) {
    const email = (account.body as { email?: unknown } | null)?.email;
    console.log(`[mail] key accepted (HTTP ${account.status}) — account ${String(email ?? '(not returned)')}`);
  } else {
    failures += 1;
    console.error(`[mail] key could not be checked (${account.status === 0 ? `no HTTP response — ${reason(account.body)}` : `HTTP ${account.status}: ${reason(account.body)}`})`);
  }

  const senders = await call('/senders');
  const verified: Sender[] = [];
  if (senders.ok) {
    const list = ((senders.body as { senders?: Sender[] } | null)?.senders ?? []) as Sender[];
    for (const sender of list) {
      const state = sender.active === false ? 'inactive' : 'verified';
      console.log(`[mail] sender ${sender.email} — ${state}${sender.name ? ` (${sender.name})` : ''}`);
      if (sender.active !== false) verified.push(sender);
    }
    if (list.length === 0) console.log('[mail] no senders are configured on this account');
  } else {
    failures += 1;
    console.error(`[mail] could not list senders (${senders.status === 0 ? `no HTTP response — ${reason(senders.body)}` : `HTTP ${senders.status}: ${reason(senders.body)}`})`);
  }

  const from = (process.env.CONTACT_FROM_EMAIL ?? '').trim().toLowerCase();
  if (from.length > 0) {
    const match = verified.some((sender) => sender.email.toLowerCase() === from);
    if (!senders.ok) {
      // Without the list there is nothing to compare against, and saying the
      // address is unverified would be a guess dressed as a result.
      console.log(`[mail] CONTACT_FROM_EMAIL (${from}) could not be compared — the sender list was unavailable`);
    } else if (match) {
      console.log(`[mail] CONTACT_FROM_EMAIL (${from}) is verified — the form can send`);
    } else {
      failures += 1;
      console.error(
        `[mail] CONTACT_FROM_EMAIL (${from}) is NOT a verified sender on this account. ` +
          'Brevo rejects unverified senders, so the form would report a failure.',
      );
    }
  } else {
    console.log('[mail] CONTACT_FROM_EMAIL is not set — the form stays in setup-required');
  }

  if (send) {
    if (from.length === 0) {
      failures += 1;
      console.error('[mail] --send needs CONTACT_FROM_EMAIL; nothing was sent');
    } else {
      // One message, to the inbox the owner nominated for Velaqori Systems.
      const to = (process.env.CONTACT_TEST_RECIPIENT ?? 'mwangalamackjrv2@gmail.com').trim();
      const result = await call('/smtp/email', {
        method: 'POST',
        body: JSON.stringify({
          sender: { email: from, name: (process.env.CONTACT_FROM_NAME ?? 'Company platform').trim() },
          to: [{ email: to }],
          subject: '[Company platform] delivery check',
          textContent:
            'This is one automated check of the contact-form delivery path.\n\n' +
            'If you are reading it, BREVO_API_KEY works, the sender address is verified, ' +
            'and the address in the To: line receives mail. Nothing else was sent.\n',
        }),
      });
      if (result.ok) {
        const id = (result.body as { messageId?: unknown } | null)?.messageId;
        console.log(`[mail] test message accepted for ${to} (HTTP ${result.status}) — id ${String(id ?? 'n/a')}`);
      } else {
        failures += 1;
        console.error(`[mail] test message refused (${result.status === 0 ? `no HTTP response — ${reason(result.body)}` : `HTTP ${result.status}: ${reason(result.body)}`})`);
      }
    }
  }

  if (failures > 0) {
    console.error(`[mail] ${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('[mail] every check passed');
  process.exit(0);
}

main().catch((error: unknown) => {
  // The message is ours or the runtime's; the key is never part of it.
  console.error('[mail] check failed to run:', error instanceof Error ? error.message : 'unknown error');
  process.exit(1);
});
