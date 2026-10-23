'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { auditEvents, companies, contactSubmissions } from '@/lib/db/schema';
import { contactSchema, zodFieldErrors, type ActionResult } from '@/lib/validation';

/**
 * Contact intake with honest delivery states: when no delivery service is
 * configured the submission is recorded with delivery=DELIVERY_NOT_CONFIGURED
 * and the UI never claims the message was sent.
 */
export async function submitContactAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { deliveryState?: 'received' | 'setup-required'; deliveryMessage?: string }> {
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
  const db = getDb();
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.slug, parsed.data.companySlug))
    .limit(1);
  if (!company) return { ok: false, error: 'Company not found.' };

  const deliveryConfigured = Boolean(
    process.env.CONTACT_FORM_ENDPOINT ||
      (company.slug === 'velaqori-systems'
        ? process.env.CONTACT_VELAQORI_EMAIL
        : process.env.CONTACT_TAMUZI_EMAIL),
  );

  await db.insert(contactSubmissions).values({
    id: crypto.randomUUID(),
    companyId: company.id,
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
    message: parsed.data.message,
    delivery: deliveryConfigured ? 'RECEIVED' : 'DELIVERY_NOT_CONFIGURED',
  });
  await db.insert(auditEvents).values({
    action: 'contact.submit',
    resourceType: 'contact_submission',
    metadata: { companySlug: company.slug, deliveryConfigured },
  });

  revalidatePath('/contact');
  if (deliveryConfigured) {
    return {
      ok: true,
      deliveryState: 'received',
      deliveryMessage:
        'Your message has been recorded and is queued for delivery to the company contact channel.',
    };
  }
  return {
    ok: true,
    deliveryState: 'setup-required',
    deliveryMessage:
      'This company has not configured a contact delivery channel yet. Your message has been recorded in the platform inbox, but it has NOT been sent or delivered. Please do not assume the company has received it.',
  };
}
