import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  Badge,
  Breadcrumbs,
  CompanyBadge,
  ExternalLinkButton,
  IllustrativeLabel,
  Section,
  StatusBadge,
} from '@/components/ui';
import { CompanyTokenSync } from '@/components/company-token-sync';
import { getDb } from '@/lib/db';
import { projectContributions } from '@/lib/db/schema';
import { getCaseStudyBySlug, listPublishedPeople } from '@/lib/queries';
import { isConfiguredUrl } from '@/lib/validation';
import { and, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudyBySlug(slug, getDb());
  if (!study) return { title: 'Case study not found' };
  return {
    title: study.title,
    description: study.problem.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const study = await getCaseStudyBySlug(slug, db);
  if (!study) notFound();
  const product = study.product;

  // Contributors render only from approved contribution records.
  const people = await listPublishedPeople(db);
  const contributionRows = await db
    .select()
    .from(projectContributions)
    .where(
      and(
        eq(projectContributions.productId, product.id),
        eq(projectContributions.approved, true),
      ),
    );
  const contributors = contributionRows
    .map((row) => ({
      description: row.description,
      person: people.find((person) => person.id === row.personProfileId),
    }))
    .filter((entry) => entry.person);

  return (
    <div className="space-y-6">
      <CompanyTokenSync companySlug={study.companySlug} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Case Studies', href: '/case-studies' },
          { label: product.name },
        ]}
      />

      {/* 1. Header */}
      <header className="card">
        <div className="flex flex-wrap items-center gap-2">
          <CompanyBadge name={study.companyName} />
          <StatusBadge status={product.status} />
          {product.categories.map((category) => (
            <Badge key={category}>{category}</Badge>
          ))}
        </div>
        <h1 className="mt-3 text-2xl font-semibold">{study.title}</h1>
        <p className="mt-2 max-w-prose text-muted">{product.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.technologies.map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/products/${product.slug}`} className="btn btn-primary">
            View Product
          </Link>
          <Link href={`/companies/${study.companySlug}`} className="btn btn-secondary">
            {study.companyName}
          </Link>
          <Link href="/case-studies" className="btn btn-secondary">Return to case studies</Link>
          {isConfiguredUrl(product.liveDemoUrl) ? (
            <ExternalLinkButton href={product.liveDemoUrl}>Live Demo</ExternalLinkButton>
          ) : null}
          {isConfiguredUrl(product.repositoryUrl) ? (
            <ExternalLinkButton href={product.repositoryUrl}>Source Code</ExternalLinkButton>
          ) : null}
        </div>
        {/* 2/12. Visual */}
        <div className="mt-4">
          <IllustrativeLabel label={product.visualLabel} />
        </div>
      </header>

      {/* 3. Problem (incl. users) */}
      <Section title="Problem">
        <p>{study.problem}</p>
        <p className="mt-3">
          <strong className="text-[var(--ink)]">Intended users:</strong>
        </p>
        <ul className="list-disc pl-5">
          {study.users.map((user) => (
            <li key={user}>{user}</li>
          ))}
        </ul>
      </Section>

      {/* 4. Constraints */}
      <Section title="Constraints">
        <ul className="list-disc space-y-1 pl-5">
          {study.constraints.map((constraint) => (
            <li key={constraint}>{constraint}</li>
          ))}
        </ul>
      </Section>

      {/* 5. Solution */}
      <Section title="Solution">
        <p>{study.solution}</p>
      </Section>

      {/* 6. Primary workflow */}
      <Section title="Primary workflow">
        <ol className="space-y-2">
          {study.workflow.map((step, index) => (
            <li key={step.step}>
              <strong className="text-[var(--ink)]">
                {index + 1}. {step.step}:
              </strong>{' '}
              {step.description}
            </li>
          ))}
        </ol>
      </Section>

      {/* 7. Feature evidence */}
      <Section title="Feature evidence">
        <ul className="space-y-2">
          {product.features.map((feature) => (
            <li key={feature.title}>
              <strong className="text-[var(--ink)]">{feature.title}:</strong>{' '}
              {feature.description}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          Feature descriptions document the designed implementation from the
          project brief. Genuine application screenshots replace the labelled
          concept visuals when available.
        </p>
      </Section>

      {/* 8. Technical architecture */}
      <Section title="Technical architecture">
        <p>{study.architecture}</p>
      </Section>

      {/* 9. Data model */}
      <Section title="Data model">
        <p>{study.dataModel}</p>
      </Section>

      {/* 10. Engineering decisions */}
      <Section title="Engineering decisions">
        <ul className="space-y-3">
          {study.engineeringDecisions.map((decision) => (
            <li key={decision.decision}>
              <strong className="text-[var(--ink)]">{decision.decision}</strong>
              <p className="mt-1">{decision.rationale}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs">
          Decisions reflect the project design recorded in the brief; where an
          implementation detail is unverified it is flagged in the verification
          note below.
        </p>
      </Section>

      {/* 11. Testing and reliability */}
      <Section title="Testing and reliability">
        <p>{study.testingNote}</p>
      </Section>

      {/* 12. Security, privacy, and responsible design */}
      <Section title="Security, privacy, and responsible design">
        <p>{study.securityPrivacy}</p>
      </Section>

      {/* 13. Screenshots / demo walkthrough */}
      <Section title="Screenshots or demo walkthrough">
        <p>{study.walkthroughNote}</p>
      </Section>

      {/* 14. Limitations */}
      <Section title="Limitations">
        <p>Confirmed current limits:</p>
        <ul className="list-disc space-y-1 pl-5">
          {study.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </Section>

      {/* 15. Future improvements */}
      <Section title="Future improvements">
        <p>Proposed future scope (not yet implemented):</p>
        <ul className="list-disc space-y-1 pl-5">
          {study.futureImprovements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Section>

      {/* 16. Contributors */}
      <Section title="Contributors">
        {contributors.length === 0 ? (
          <p>
            No approved contribution records exist for this project yet.
            Contributors are displayed only where an approved contribution record
            links a published profile to this product — authorship is never
            inferred from membership.
          </p>
        ) : (
          <ul className="space-y-2">
            {contributors.map((entry) => (
              <li key={entry.person?.id}>
                {entry.person ? (
                  <Link href={`/people/${entry.person.slug}`} className="accent-text hover:underline">
                    {entry.person.displayName}
                  </Link>
                ) : null}
                <p>{entry.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="text-xs text-muted">{study.verificationNote}</p>

      {/* 17. Closing actions */}
      <section className="card flex flex-wrap gap-2">
        <Link href={`/products/${product.slug}`} className="btn btn-primary">View Product</Link>
        <Link href={`/companies/${study.companySlug}`} className="btn btn-secondary">
          {study.companyName}
        </Link>
        <Link href="/case-studies" className="btn btn-secondary">Return to case studies</Link>
        {isConfiguredUrl(product.liveDemoUrl) ? (
          <ExternalLinkButton href={product.liveDemoUrl}>Live Demo</ExternalLinkButton>
        ) : null}
        {isConfiguredUrl(product.repositoryUrl) ? (
          <ExternalLinkButton href={product.repositoryUrl}>Source Code</ExternalLinkButton>
        ) : null}
      </section>
    </div>
  );
}
