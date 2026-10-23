import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Section, Badge } from '@/components/ui';
import { CompanyTokenSync } from '@/components/company-token-sync';
import { getDb } from '@/lib/db';
import { getCompanyBySlug } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}): Promise<Metadata> {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug, getDb());
  return {
    title: company ? `Privacy — ${company.name}` : 'Privacy',
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  const company = await getCompanyBySlug(companySlug, getDb());
  if (!company) notFound();

  return (
    <div className="space-y-6">
      <CompanyTokenSync companySlug={company.slug} />
      <header className="card">
        <Badge tone="accent">{company.name} · independent company</Badge>
        <h1 className="mt-3 text-2xl font-semibold">Privacy notice — {company.name}</h1>
        <p className="mt-2 text-xs text-muted">
          Working template describing how this platform actually handles data.
          Formal policy text will replace this template after legal review
          (configurable field pending supply).
        </p>
      </header>

      <Section title="What this platform collects">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong className="text-[var(--ink)]">Contact messages:</strong> name,
            email, subject, and message, recorded against the company you chose,
            with a delivery state.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Member profiles:</strong> the
            profile fields a member chooses to store — nothing is published until
            the member submits it and a reviewer approves it.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Resumes:</strong> PDF files a
            member uploads. They are private by default and downloadable only
            while explicitly published.
          </li>
          <li>
            <strong className="text-[var(--ink)]">Audit events:</strong> records
            of sensitive actions (sign-ins, publication changes, reviews) for
            accountability.
          </li>
        </ul>
      </Section>

      <Section title="What it does not do">
        <ul className="list-disc space-y-1 pl-5">
          <li>No third-party advertising or behavioural tracking.</li>
          <li>No sharing of contact messages between the two companies — they are separate businesses.</li>
          <li>No scraping or resale of member data.</li>
        </ul>
      </Section>

      <Section title="Retention and contact">
        <p>
          Retention periods and data-controller contact details are configured
          fields that each company must supply before public launch; they are
          intentionally left unstated here rather than invented. Until then,
          use the contact page for questions and deletion requests.
        </p>
      </Section>
    </div>
  );
}
