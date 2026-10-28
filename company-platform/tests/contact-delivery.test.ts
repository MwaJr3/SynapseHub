import { describe, expect, it, vi } from 'vitest';

import {
  missingConfiguration,
  recipientFor,
  sendContactEmail,
  isDeliveryConfigured,
} from '@/lib/email/brevo';

const configuredEnv = {
  BREVO_API_KEY: 'xkeysib-test-key-not-real',
  CONTACT_FROM_EMAIL: 'noreply@example.com',
  CONTACT_FROM_NAME: 'Company Platform',
};

const message = {
  name: 'A Visitor',
  email: 'visitor@example.net',
  subject: 'Product question',
  message: 'I would like to know more about this product.',
};

function acceptedResponse() {
  return new Response(JSON.stringify({ messageId: '<abc@brevo>' }), {
    status: 201,
    headers: { 'content-type': 'application/json' },
  });
}

describe('contact routing', () => {
  it('routes each company to its own nominated inbox', () => {
    expect(recipientFor('velaqori-systems', {})).toBe('mwangalamackjrv2@gmail.com');
    expect(recipientFor('tamuzi-learning', {})).toBe('mackjrv2@gmail.com');
    // Never the same inbox: the companies are separate businesses.
    expect(recipientFor('velaqori-systems', {})).not.toBe(recipientFor('tamuzi-learning', {}));
  });

  it('lets a deployment override an inbox, but ignores an invalid override', () => {
    expect(recipientFor('tamuzi-learning', { CONTACT_TAMUZI_EMAIL: 'inbox@example.org' })).toBe(
      'inbox@example.org',
    );
    expect(recipientFor('tamuzi-learning', { CONTACT_TAMUZI_EMAIL: 'not-an-address' })).toBe(
      'mackjrv2@gmail.com',
    );
  });

  it('reports missing configuration by variable name and never by value', () => {
    const missing = missingConfiguration('velaqori-systems', {});
    expect(missing).toEqual(['BREVO_API_KEY', 'CONTACT_FROM_EMAIL']);
    expect(missing.join(' ')).not.toContain('xkeysib');
    expect(isDeliveryConfigured('velaqori-systems', {})).toBe(false);
    expect(isDeliveryConfigured('velaqori-systems', configuredEnv)).toBe(true);
  });
});

describe('sendContactEmail', () => {
  it('sends to the correct company inbox with a reply-to for the visitor', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(acceptedResponse());

    const outcome = await sendContactEmail(
      { companySlug: 'tamuzi-learning', ...message },
      { fetchImpl, env: configuredEnv },
    );

    expect(outcome).toEqual({ state: 'delivered', messageId: '<abc@brevo>' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(init.method).toBe('POST');

    const headers = init.headers as Record<string, string>;
    expect(headers['api-key']).toBe('xkeysib-test-key-not-real');

    const body = JSON.parse(String(init.body)) as {
      to: { email: string }[];
      replyTo: { email: string };
      subject: string;
      sender: { email: string };
      htmlContent: string;
    };
    expect(body.to).toEqual([{ email: 'mackjrv2@gmail.com' }]);
    expect(body.replyTo.email).toBe('visitor@example.net');
    expect(body.sender.email).toBe('noreply@example.com');
    expect(body.subject).toContain('Tamuzi Learning');
    expect(body.subject).toContain('Product question');
  });

  it('sends Velaqori messages only to the Velaqori inbox', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(acceptedResponse());
    await sendContactEmail(
      { companySlug: 'velaqori-systems', ...message },
      { fetchImpl, env: configuredEnv },
    );
    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const body = JSON.parse(String((call?.[1] as RequestInit).body)) as {
      to: { email: string }[];
    };
    expect(body.to).toEqual([{ email: 'mwangalamackjrv2@gmail.com' }]);
  });

  it('escapes visitor input in the HTML part', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(acceptedResponse());
    await sendContactEmail(
      {
        companySlug: 'velaqori-systems',
        name: '<script>alert(1)</script>',
        email: 'visitor@example.net',
        subject: 'Hello',
        message: '5 > 3 & <b>bold</b>',
      },
      { fetchImpl, env: configuredEnv },
    );
    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const body = JSON.parse(String((call?.[1] as RequestInit).body)) as {
      htmlContent: string;
    };
    expect(body.htmlContent).not.toContain('<script>');
    expect(body.htmlContent).toContain('&lt;script&gt;');
    expect(body.htmlContent).toContain('5 &gt; 3 &amp;');
  });

  it('never calls the provider when configuration is missing', async () => {
    const fetchImpl = vi.fn();
    const outcome = await sendContactEmail(
      { companySlug: 'velaqori-systems', ...message },
      { fetchImpl, env: {} },
    );
    expect(outcome).toEqual({
      state: 'not-configured',
      missing: ['BREVO_API_KEY', 'CONTACT_FROM_EMAIL'],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports a rejected credential without leaking the key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"message":"unauthorized"}', { status: 401 }));
    const outcome = await sendContactEmail(
      { companySlug: 'velaqori-systems', ...message },
      { fetchImpl, env: configuredEnv },
    );
    expect(outcome.state).toBe('failed');
    if (outcome.state === 'failed') {
      expect(outcome.reason).toContain('rejected the credentials');
      expect(outcome.reason).not.toContain('xkeysib');
    }
  });

  it('reports a rate limit as a retryable failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 429 }));
    const outcome = await sendContactEmail(
      { companySlug: 'velaqori-systems', ...message },
      { fetchImpl, env: configuredEnv },
    );
    expect(outcome.state).toBe('failed');
    if (outcome.state === 'failed') expect(outcome.reason).toContain('rate limit');
  });

  it('reports an unreachable provider instead of throwing', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const outcome = await sendContactEmail(
      { companySlug: 'velaqori-systems', ...message },
      { fetchImpl, env: configuredEnv },
    );
    expect(outcome.state).toBe('failed');
    if (outcome.state === 'failed') expect(outcome.reason).toContain('could not be reached');
  });
});
