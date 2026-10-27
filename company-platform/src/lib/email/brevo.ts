/**
 * Contact-form delivery through Brevo's transactional email API.
 *
 * Design rules:
 * - **The recipient is decided server-side.** Each company has its own inbox and
 *   a visitor can never redirect a message elsewhere, so this cannot become an
 *   open relay.
 * - **Nothing is claimed that did not happen.** The result is a discriminated
 *   union: `delivered` only when the provider accepted the message, `failed`
 *   with a safe reason otherwise, and `not-configured` when a required variable
 *   is absent. The action records that state and the UI repeats it verbatim.
 * - **No secret ever leaves this module.** The API key is read from the
 *   environment, sent only in the request header, and never included in a
 *   result, log line or thrown error.
 * - **Pure dependencies are injectable**, so the network is never touched in
 *   tests.
 */

export const CONTACT_COMPANY_SLUGS = ['velaqori-systems', 'tamuzi-learning'] as const;
export type ContactCompanySlug = (typeof CONTACT_COMPANY_SLUGS)[number];

/**
 * The two inboxes the owner nominated, one per company. They are deliberately
 * different: the companies are separate businesses and do not share inboxes.
 * `CONTACT_VELAQORI_EMAIL` / `CONTACT_TAMUZI_EMAIL` override them per deployment.
 */
const NOMINATED_RECIPIENTS: Record<ContactCompanySlug, string> = {
  'velaqori-systems': 'mwangalamackjrv2@gmail.com',
  'tamuzi-learning': 'mackjrv2@gmail.com',
};

const RECIPIENT_ENV_KEY: Record<ContactCompanySlug, string> = {
  'velaqori-systems': 'CONTACT_VELAQORI_EMAIL',
  'tamuzi-learning': 'CONTACT_TAMUZI_EMAIL',
};

export const COMPANY_LABEL: Record<ContactCompanySlug, string> = {
  'velaqori-systems': 'Velaqori Systems',
  'tamuzi-learning': 'Tamuzi Learning',
};

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 10_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DeliveryOutcome =
  | { state: 'delivered'; messageId: string | null }
  | { state: 'not-configured'; missing: readonly string[] }
  | { state: 'failed'; reason: string };

export interface ContactEmailInput {
  companySlug: ContactCompanySlug;
  name: string;
  email: string;
  subject: string;
  message: string;
}

type Env = Record<string, string | undefined>;

export interface SendDependencies {
  /** Injected in tests so no request is ever made. */
  fetchImpl?: typeof fetch;
  env?: Env;
}

export function isContactCompanySlug(value: string): value is ContactCompanySlug {
  return (CONTACT_COMPANY_SLUGS as readonly string[]).includes(value);
}

/** The inbox for a company: environment override when valid, else the nominated address. */
export function recipientFor(slug: ContactCompanySlug, env: Env = process.env): string {
  const configured = (env[RECIPIENT_ENV_KEY[slug]] ?? '').trim();
  if (configured && EMAIL_RE.test(configured)) return configured;
  return NOMINATED_RECIPIENTS[slug];
}

/** Which required variables are missing, by name only — never by value. */
export function missingConfiguration(slug: ContactCompanySlug, env: Env = process.env): string[] {
  const missing: string[] = [];
  if (!(env.BREVO_API_KEY ?? '').trim()) missing.push('BREVO_API_KEY');
  const sender = (env.CONTACT_FROM_EMAIL ?? '').trim();
  // A sender must be a real address and must be verified in Brevo; we cannot invent one.
  if (!sender || !EMAIL_RE.test(sender)) missing.push('CONTACT_FROM_EMAIL');
  if (!EMAIL_RE.test(recipientFor(slug, env))) missing.push(RECIPIENT_ENV_KEY[slug]);
  return missing;
}

export function isDeliveryConfigured(slug: ContactCompanySlug, env: Env = process.env): boolean {
  return missingConfiguration(slug, env).length === 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function reasonForStatus(status: number): string {
  if (status === 401 || status === 403) return 'the email provider rejected the credentials';
  if (status === 429) return 'the email provider rate limit was reached';
  if (status >= 500) return 'the email provider is temporarily unavailable';
  return `the email provider rejected the message (HTTP ${status})`;
}

/**
 * Send one contact message to the selected company's inbox.
 *
 * Never throws: every failure is reported as a result so the caller can record
 * it and tell the visitor the truth.
 */
export async function sendContactEmail(
  input: ContactEmailInput,
  dependencies: SendDependencies = {},
): Promise<DeliveryOutcome> {
  const env = dependencies.env ?? process.env;
  const missing = missingConfiguration(input.companySlug, env);
  if (missing.length > 0) return { state: 'not-configured', missing };

  const recipient = recipientFor(input.companySlug, env);
  const senderEmail = (env.CONTACT_FROM_EMAIL ?? '').trim();
  const senderName = (env.CONTACT_FROM_NAME ?? '').trim() || COMPANY_LABEL[input.companySlug];

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: recipient }],
    // Replying goes to the visitor, not to the sending mailbox.
    replyTo: { email: input.email, name: input.name },
    subject: `[${COMPANY_LABEL[input.companySlug]} website] ${input.subject}`,
    textContent: [
      `New message for ${COMPANY_LABEL[input.companySlug]}.`,
      '',
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Subject: ${input.subject}`,
      '',
      input.message,
      '',
      'Sent from the company platform contact form.',
    ].join('\n'),
    htmlContent: [
      `<p>New message for <strong>${escapeHtml(COMPANY_LABEL[input.companySlug])}</strong>.</p>`,
      `<p><strong>Name:</strong> ${escapeHtml(input.name)}<br>`,
      `<strong>Email:</strong> ${escapeHtml(input.email)}<br>`,
      `<strong>Subject:</strong> ${escapeHtml(input.subject)}</p>`,
      `<p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>`,
      '<p style="color:#666">Sent from the company platform contact form.</p>',
    ].join(''),
  };

  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': (env.BREVO_API_KEY ?? '').trim(),
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      // The body may describe the account, so only the status is surfaced.
      return { state: 'failed', reason: reasonForStatus(response.status) };
    }

    let messageId: string | null = null;
    try {
      const body = (await response.json()) as { messageId?: unknown };
      if (typeof body.messageId === 'string') messageId = body.messageId;
    } catch {
      // A 2xx with an unparseable body still means the provider accepted it.
      messageId = null;
    }
    return { state: 'delivered', messageId };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      state: 'failed',
      reason: aborted ? 'sending timed out' : 'the email provider could not be reached',
    };
  } finally {
    clearTimeout(timer);
  }
}
