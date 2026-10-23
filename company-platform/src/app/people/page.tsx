import type { Metadata } from 'next';
import Link from 'next/link';

import { Badge, EmptyState, ExternalLinkButton } from '@/components/ui';
import { getDb } from '@/lib/db';
import { listPublishedPeople } from '@/lib/queries';
import { isConfiguredUrl } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'People',
  description:
    'Published member profiles — showing only the fields each person has chosen to make public.',
};

export default async function PeoplePage() {
  const people = await listPublishedPeople(getDb());
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">People</h1>
        <p className="mt-2 max-w-prose text-muted">
          Public profiles show only fields the member has published. Drafts,
          review notes, and private resumes are never visible here.
        </p>
      </header>
      {people.length === 0 ? (
        <EmptyState>No published profiles yet.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {people.map((person) => (
            <article key={person.id} className="card">
              <h2 className="text-lg font-semibold">
                <Link href={`/people/${person.slug}`} className="hover:underline">
                  {person.displayName}
                </Link>
              </h2>
              {person.pronouns ? (
                <p className="text-xs text-muted">{person.pronouns}</p>
              ) : null}
              <p className="mt-1 text-sm text-muted">{person.headline}</p>
              <p className="mt-2 text-sm text-muted">{person.shortBio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {person.technicalSkills.slice(0, 5).map((skill) => (
                  <Badge key={skill}>{skill}</Badge>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/people/${person.slug}`} className="btn btn-primary">
                  View profile
                </Link>
                {isConfiguredUrl(person.personalPortfolioUrl) ? (
                  <ExternalLinkButton href={person.personalPortfolioUrl}>
                    Visit Personal Portfolio
                  </ExternalLinkButton>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
