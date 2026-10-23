import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge, Breadcrumbs, EmptyState, ExternalLinkButton, Section } from '@/components/ui';
import { getDb } from '@/lib/db';
import {
  getPersonProfileByUserId,
  getPublishedPersonBySlug,
  listPersonExtras,
} from '@/lib/queries';
import { isConfiguredUrl } from '@/lib/validation';
import { externalAnchorProps } from '@/lib/links';
import { eq } from 'drizzle-orm';
import { personProfiles, resumeAssets } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const person = await getPublishedPersonBySlug(slug, getDb());
  if (!person) return { title: 'Profile not found' };
  return {
    title: person.displayName,
    description: person.headline.slice(0, 160),
    robots: { index: true, follow: true },
  };
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = getDb();
  const person = await getPublishedPersonBySlug(slug, db);
  // Only published profiles are publicly readable — drafts return 404.
  if (!person) notFound();

  const [profileRow] = await db
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.slug, slug))
    .limit(1);
  const extras = profileRow
    ? await listPersonExtras(profileRow.id, db)
    : { education: [], experience: [], certifications: [], links: [], resumes: [] };

  const publishedResume = extras.resumes.find((resume) => resume.published);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'People', href: '/people' },
          { label: person.displayName },
        ]}
      />
      <header className="card">
        <h1 className="text-2xl font-semibold">{person.displayName}</h1>
        {person.pronouns ? <p className="text-sm text-muted">{person.pronouns}</p> : null}
        <p className="mt-2 text-lg text-muted">{person.headline}</p>
        <p className="mt-3 max-w-prose text-muted">{person.longBio}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {isConfiguredUrl(person.personalPortfolioUrl) ? (
            <ExternalLinkButton href={person.personalPortfolioUrl} variant="primary">
              Visit Personal Portfolio
            </ExternalLinkButton>
          ) : null}
          {isConfiguredUrl(person.githubUrl) ? (
            <ExternalLinkButton href={person.githubUrl}>GitHub</ExternalLinkButton>
          ) : null}
          {isConfiguredUrl(person.professionalProfileUrl) ? (
            <ExternalLinkButton href={person.professionalProfileUrl}>
              Professional Profile
            </ExternalLinkButton>
          ) : null}
          {publishedResume ? (
            <a href={`/api/files/${publishedResume.id}`} className="btn btn-secondary" download>
              Download resume (PDF)
            </a>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          External buttons appear only where the member has configured a real
          URL. The personal portfolio is a standalone site linked, not merged,
          into this platform.
        </p>
      </header>

      <Section title="Skills">
        <p>
          <strong className="text-[var(--ink)]">Technical:</strong>{' '}
          {person.technicalSkills.length > 0 ? person.technicalSkills.join(' · ') : '—'}
        </p>
        <p className="mt-2">
          <strong className="text-[var(--ink)]">Interpersonal:</strong>{' '}
          {person.softSkills.length > 0 ? person.softSkills.join(' · ') : '—'}
        </p>
        <p className="mt-2">
          <strong className="text-[var(--ink)]">Domains:</strong>{' '}
          {person.domains.length > 0 ? person.domains.join(' · ') : '—'}
        </p>
      </Section>

      <Section title="Education">
        {extras.education.length === 0 ? (
          <EmptyState>Nothing published yet.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {extras.education.map((entry) => (
              <li key={entry.id}>
                <strong className="text-[var(--ink)]">{entry.qualification}</strong>
                {entry.subject ? ` — ${entry.subject}` : ''}
                <p className="text-xs">{entry.institution}{entry.period ? ` · ${entry.period}` : ''}</p>
                {entry.description ? <p className="mt-1">{entry.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Experience">
        {extras.experience.length === 0 ? (
          <EmptyState>Nothing published yet.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {extras.experience.map((entry) => (
              <li key={entry.id}>
                <strong className="text-[var(--ink)]">{entry.role}</strong> — {entry.organization}
                {entry.period ? <p className="text-xs">{entry.period}</p> : null}
                {entry.description ? <p className="mt-1">{entry.description}</p> : null}
                {isConfiguredUrl(entry.linkUrl) ? (
                  <a href={entry.linkUrl} className="text-xs accent-text hover:underline" {...externalAnchorProps}>
                    Related link (opens in a new tab)
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Certifications">
        {extras.certifications.length === 0 ? (
          <EmptyState>Nothing published yet.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {extras.certifications.map((entry) => (
              <li key={entry.id}>
                <strong className="text-[var(--ink)]">{entry.name}</strong>
                {entry.issuer ? ` — ${entry.issuer}` : ''}
                {entry.period ? <p className="text-xs">{entry.period}</p> : null}
                {entry.note ? <p className="mt-1">{entry.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Project contributions">
        {person.contributions.length === 0 ? (
          <EmptyState>No approved contribution records yet.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {person.contributions.map((contribution) => (
              <li key={contribution.productSlug}>
                <Link
                  href={`/products/${contribution.productSlug}`}
                  className="accent-text hover:underline"
                >
                  {contribution.productName}
                </Link>
                <p>{contribution.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {extras.links.length > 0 ? (
        <Section title="Selected work and portfolio links">
          <ul className="space-y-2">
            {extras.links.map((link) => (
              <li key={link.id}>
                {isConfiguredUrl(link.url) ? (
                  <a href={link.url} className="accent-text hover:underline" {...externalAnchorProps}>
                    {link.label} (opens in a new tab)
                  </a>
                ) : (
                  <span>{link.label}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Contact">
        {person.contactVisible && profileRow?.userId ? (
          <p>
            This person has chosen to show contact details. Use the{' '}
            <Link href="/contact" className="accent-text hover:underline">
              platform contact page
            </Link>{' '}
            and mention their name — messages are routed per company
            configuration.
          </p>
        ) : (
          <p>Contact details are hidden for this profile.</p>
        )}
      </Section>
    </div>
  );
}
