import type { Metadata } from 'next';
import Link from 'next/link';

import { CompanyBadge, EmptyState } from '@/components/ui';
import { getDb } from '@/lib/db';
import { listPublishedSolutions } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Solutions',
  description:
    'Solution areas across Velaqori Systems and Tamuzi Learning — problems, approaches, and audiences.',
};

export default async function SolutionsPage() {
  const solutions = await listPublishedSolutions(getDb());
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Solutions</h1>
        <p className="mt-2 max-w-prose text-muted">
          Each company organises its work around the problems it solves. Solution
          areas never mix companies — every solution belongs to one operator.
        </p>
      </header>
      {solutions.length === 0 ? (
        <EmptyState>No published solutions yet.</EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {solutions.map((solution) => (
            <article key={solution.slug} className="card">
              <CompanyBadge name={solution.companyName} />
              <h2 className="mt-2 text-lg font-semibold">
                <Link href={`/solutions/${solution.slug}`} className="hover:underline">
                  {solution.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted">{solution.problem}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
