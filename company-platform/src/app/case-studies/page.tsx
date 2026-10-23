import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge, CompanyBadge, EmptyState } from '@/components/ui';
import { getDb } from '@/lib/db';
import { listPublishedCaseStudies } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Case Studies',
  description:
    'Project-specific case studies for all 25 products — problem, constraints, workflow, architecture, decisions, testing, and limitations.',
};

export default async function CaseStudiesPage() {
  const studies = await listPublishedCaseStudies(getDb());
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Case Studies</h1>
        <p className="mt-2 max-w-prose text-muted">
          Every product has its own case study, written from its project brief.
          Sections the brief cannot support are flagged as requiring verification
          — nothing is invented to fill a page.
        </p>
      </header>
      {studies.length === 0 ? (
        <EmptyState>No published case studies yet.</EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {studies.map((study) => (
            <li key={study.slug} className="card">
              <div className="flex flex-wrap gap-1.5">
                <CompanyBadge name={study.companyName} />
                <Badge>{study.category}</Badge>
              </div>
              <h2 className="mt-2 text-base font-semibold">
                <Link href={`/case-studies/${study.slug}`} className="hover:underline">
                  {study.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-muted">
                Product:{' '}
                <Link href={`/products/${study.productSlug}`} className="accent-text hover:underline">
                  {study.productName}
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
