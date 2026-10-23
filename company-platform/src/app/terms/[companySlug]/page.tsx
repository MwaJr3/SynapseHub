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
    title: company ? `Terms — ${company.name}` : 'Terms',
    robots: { index: false, follow: true },
  };
}

export default async function TermsPage({
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
        <h1 className="mt-3 text-2xl font-semibold">Terms of use — {company.name}</h1>
        <p className="mt-2 text-xs text-muted">
          Working template. Formal terms will replace this template after legal
          review (configurable field pending supply).
        </p>
      </header>

      <Section title="About these pages">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Content on this platform describes software products and case
            studies. Status labels distinguish built work from deployed work;
            nothing here promises availability, support levels, or outcomes.
          </li>
          <li>
            Seed and demo records are illustrative working material and are
            labelled as such.
          </li>
          <li>
            External links appear only where configured; {company.name} is not
            responsible for content on sites it links to.
          </li>
        </ul>
      </Section>

      <Section title="Company status">
        <p>
          {company.name} is an independent company (working name pending
          trademark checks). Nothing on this platform creates a partnership,
          agency, or shared-liability relationship between the companies shown.
          Formal terms, including governing law and dispute provisions, are
          pending legal review and will be published here once supplied.
        </p>
      </Section>
    </div>
  );
}
