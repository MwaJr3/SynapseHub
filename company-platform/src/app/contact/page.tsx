import type { Metadata } from 'next';

import { Section } from '@/components/ui';
import { ContactForm } from './contact-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contact Velaqori Systems or Tamuzi Learning directly. Delivery states are reported honestly.',
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const companySlug =
    (Array.isArray(params.company) ? params.company[0] : params.company) === 'tamuzi-learning'
      ? 'tamuzi-learning'
      : params.company === 'velaqori-systems'
        ? 'velaqori-systems'
        : undefined;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Contact</h1>
        <p className="mt-2 max-w-prose text-muted">
          Each company receives its own messages — the inboxes are not shared.
          Where a delivery channel has not been configured yet, your message is
          recorded in the platform inbox and the page will say so honestly
          instead of claiming it was sent.
        </p>
      </header>
      <ContactForm companySlug={companySlug} />
      <Section title="What happens to your message">
        <ul className="list-disc space-y-1 pl-5">
          <li>It is recorded with the company you selected, timestamped and auditable.</li>
          <li>If that company has configured a contact channel, it is queued for delivery there.</li>
          <li>If not, the site shows a setup-required state and does not claim delivery.</li>
          <li>Messages are handled per that company’s privacy notice (see the Legal links in the footer).</li>
        </ul>
      </Section>
    </div>
  );
}
