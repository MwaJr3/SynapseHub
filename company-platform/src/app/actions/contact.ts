'use server';

import { and, eq, gt } from 'drizzle-orm';
import { headers } from 'next/headers';

import { getDb } from '@/lib/db';
import { auditEvents, companies, contactSubmissions } from '@/lib/db/schema';
import {
  COMPANY_LABEL,
  isContactCompanySlug,
  missingConfiguration,
  sendContactEmail,
  type ContactCompanySlug,
} from '@/lib/email/brevo';
import { rateLimit } from '@/lib/rate-limit';
import { contactSchema, zodFieldErrors, type ActionResult } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export type DeliveryState = 'delivered' | 'setup-required' | 'failed';

/**
 * Contact intake with real delivery through Brevo.
 *
 * The message is always recorded first, then delivery is attempted, then the
 * recorded state is updated to match what actually happened. The visitor is
 * told the truth in every case: `delivered`, `setup-required` (nothing sent) or
 * `failed` (nothing sent — try again later). The page never invents a delivery.
 */
export async function submitContactAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { deliveryState?: DeliveryState; deliveryMessage?: string }> {
  const parsed = contactSchema.safeParse({
    companySlug: formData.get('companySlug'),
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }

  // Rate limit (per email and per client address) so a stuck button or a script cannot flood the inbox.
  const forwarded = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  for (const key of [`contact:email:${parsed.data.email.toLowerCase()}`, `contact:ip:${forwarded}`]) {
    const gate = rateLimit(key, { limit: 5, windowMs: 10 * 60_000 });
    if (!gate.allowed) {
      return { ok: false, error: `Too many messages in a short time. Please wait ${Math.ceil(gate.retryAfterSeconds / 60)} minute(s) and try again.` };
    }
  }

  const db = getDb();
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, parsed.data.companySlug))
    .limit(1);
  if (!company) return { ok: false, error: 'Company not found.' };

  // Idempotency: an identical message from the same address in the last 10 minutes is the same
  // submission (double click, retry after a slow network). Report it; never record or send it twice.
  const [duplicate] = await db
    .select({ id: contactSubmissions.id, delivery: contactSubmissions.delivery })
    .from(contactSubmissions)
    .where(
      and(
        eq(contactSubmissions.companyId, company.id),
        eq(contactSubmissions.email, parsed.data.email),
        eq(contactSubmissions.subject, parsed.data.subject),
        eq(contactSubmissions.message, parsed.data.message),
        gt(contactSubmissions.createdAt, new Date(Date.now() - 10 * 60_000)),
      ),
    )
    .limit(1);
  if (duplicate) {
    // Say what really happened to the first copy; never claim a delivery that did not occur.
    if (duplicate.delivery === 'DELIVERED') {
      return { ok: true, deliveryState: 'delivered', deliveryMessage: 'We already sent this exact message a moment ago, so it was not sent a second time.' };
    }
    if (duplicate.delivery === 'FAILED') {
      return { ok: false, error: 'This exact message was recorded a moment ago but could not be emailed. Please try again later.' };
    }
    return {
      ok: true,
      deliveryState: 'setup-required',
      deliveryMessage: 'This exact message is already recorded in the platform inbox. It has NOT been sent or delivered.',
    };
  }

  // Only the two configured companies have a delivery route; anything else is
  // recorded but never forwarded.
  const routable = isContactCompanySlug(company.slug);
  const companySlug = company.slug as ContactCompanySlug;
  const missing = routable ? missingConfiguration(companySlug) : ['company routing'];

  const submissionId = crypto.randomUUID();
  await db.insert(contactSubmissions).values({
    id: submissionId,
    companyId: company.id,
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    delivery: missing.length === 0 ? 'RECEIVED' : 'DELIVERY_NOT_CONFIGURED',
  });

  let deliveryState: DeliveryState;
  let deliveryMessage: string;
  let recordedDelivery: 'DELIVERED' | 'FAILED' | 'DELIVERY_NOT_CONFIGURED';

  if (!routable || missing.length > 0) {
    deliveryState = 'setup-required';
    recordedDelivery = 'DELIVERY_NOT_CONFIGURED';
    deliveryMessage =
      'This company has not configured a contact delivery channel yet. Your message has been recorded in the platform inbox, but it has NOT been sent or delivered. Please do not assume the company has received it.';
  } else {
    const outcome = await sendContactEmail({
      companySlug,
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: parsed.data.message,
    });

    if (outcome.state === 'delivered') {
      deliveryState = 'delivered';
      recordedDelivery = 'DELIVERED';
      deliveryMessage = `Your message was sent to ${COMPANY_LABEL[companySlug]}. A copy is kept in the platform inbox.`;
    } else if (outcome.state === 'not-configured') {
      deliveryState = 'setup-required';
      recordedDelivery = 'DELIVERY_NOT_CONFIGURED';
      deliveryMessage =
        'Contact delivery became unavailable while you were writing. Your message has been recorded in the platform inbox, but it has NOT been sent or delivered.';
    } else {
      deliveryState = 'failed';
      recordedDelivery = 'FAILED';
      deliveryMessage = `Your message was recorded, but it could not be emailed to ${COMPANY_LABEL[companySlug]} (${outcome.reason}). Please try again later — do not assume it has been received.`;
    }
  }

  await db
    .update(contactSubmissions)
    .set({ delivery: recordedDelivery })
    .where(eq(contactSubmissions.id, submissionId));

  await db.insert(auditEvents).values({
    action: 'contact.submit',
    resourceType: 'contact_submission',
    resourceId: submissionId,
    metadata: {
      companySlug: company.slug,
      delivery: recordedDelivery,
      // Variable names only — never values.
      missing: missing.length > 0 ? missing : undefined,
    },
  });

  revalidatePath('/contact');
  return { ok: true, deliveryState, deliveryMessage };
}
