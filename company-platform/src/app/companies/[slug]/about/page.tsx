import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge, Breadcrumbs, Section, EmptyState } from '@/components/ui';
import { CompanyTokenSync } from '@/components/company-token-sync';
import { getDb } from '@/lib/db';
import { getCompanyBySlug, listCompanyMemberIds, listPublishedPeople } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug, getDb());
  if (!company) return { title: 'Company not found' };
  return {
    title: `About ${company.name}`,
    description: company.aboutStory.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function CompanyAboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const company = await getCompanyBySlug(slug, db);
  if (!company) notFound();

  const memberIds = await listCompanyMemberIds(company.id, db);
  const people = (await listPublishedPeople(db)).filter((person) =>
    memberIds.includes(person.userId),
  );

  return (
    <div className="space-y-6">
      <CompanyTokenSync companySlug={company.slug} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.slug}` },
          { label: 'About' },
        ]}
      />
      <header className="card">
        <Badge tone="accent">Independent company · working name</Badge>
        <h1 className="mt-3 text-2xl font-semibold">About {company.name}</h1>
        <p className="mt-3 max-w-prose text-muted">{company.aboutStory}</p>
        <p className="mt-3 text-xs text-muted">{company.workingNameNotice}</p>
      </header>

      <Section title="Values">
        <ul className="list-disc space-y-1 pl-5">
          {company.values.map((value) => (
            <li key={value}>{value}</li>
          ))}
        </ul>
      </Section>

      <Section title="How we build">
        <ol className="list-decimal space-y-1 pl-5">
          {company.approach.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </Section>

      <Section title="Legal and contact details">
        <p>
          Legal name: <strong className="text-[var(--ink)]">{company.legalName || 'Not supplied — pending registration details'}</strong>
        </p>
        <p className="mt-2">
          Contact:{' '}
          {company.contactEmail ? (
            <strong className="text-[var(--ink)]">{company.contactEmail}</strong>
          ) : (
            <span>
              Not configured yet. Use the{' '}
              <Link href="/contact" className="accent-text hover:underline">contact page</Link>{' '}
              which records messages honestly until a channel is configured.
            </span>
          )}
        </p>
        <p className="mt-2 text-xs">
          Registration details stay empty until officially supplied. Nothing on
          this page should be read as a certification, licence, or legal claim.
        </p>
      </Section>

      <Section title="People linked to this company">
        {people.length === 0 ? (
          <EmptyState>
            No published people profiles are linked to this company yet. People
            are linked through explicit membership records and their own
            publication choices.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {people.map((person) => (
              <li key={person.id}>
                <Link href={`/people/${person.slug}`} className="accent-text hover:underline">
                  {person.displayName}
                </Link>
                <span className="text-xs text-muted"> — {person.headline}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-muted">
        This company operates independently. The presence of this profile on a
        shared platform does not imply shared ownership, staffing, liability, or
        data controllership with any other company shown here.
      </p>
    </div>
  );
}
