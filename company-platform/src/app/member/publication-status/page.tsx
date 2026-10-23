import type { Metadata } from 'next';

import { submitProfileAction, withdrawProfileAction } from '@/app/actions/profile';
import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonProfileByUserId, listPersonExtras } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Publication status',
  robots: { index: false, follow: false },
};

const STATE_EXPLANATIONS: Record<string, string> = {
  DRAFT: 'Your profile is a draft. Nothing is publicly visible.',
  PENDING_REVIEW: 'Your profile is with a reviewer. Nothing is publicly visible until approved.',
  PUBLISHED: 'Your profile is live on the public People page (published fields only).',
  UNPUBLISHED: 'Your profile was withdrawn. Nothing is publicly visible.',
  REJECTED: 'A reviewer requested changes (see the note below). Your profile is not public.',
};

export default async function PublicationStatusPage() {
  const actor = await requireUser();
  const db = getDb();
  const profile = await getPersonProfileByUserId(actor.id, db);
  if (!profile) return <EmptyState>No profile record exists for your account.</EmptyState>;
  const extras = await listPersonExtras(profile.id, db);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Publication status</h1>
        <p className="mt-2 max-w-prose text-muted">
          Your profile moves through draft → review → publish. You can withdraw
          at any time; withdrawal removes the public profile immediately and
          disables resume downloads.
        </p>
      </header>

      <Section title="Current state">
        <p>
          <Badge tone="accent">{profile.publicationState}</Badge>
        </p>
        <p className="mt-2">{STATE_EXPLANATIONS[profile.publicationState] ?? ''}</p>
        {profile.reviewerNote ? (
          <p className="mt-2 rounded-md border border-line p-3 text-sm">
            <strong className="block">Reviewer note:</strong> {profile.reviewerNote}
          </p>
        ) : null}
      </Section>

      <Section title="Actions">
        <div className="flex flex-wrap gap-2">
          {profile.publicationState !== 'PUBLISHED' ? (
            <form
              action={async () => {
                'use server';
                await submitProfileAction();
              }}
            >
              <button
                type="submit"
                className="btn btn-primary"
                disabled={profile.publicationState === 'PENDING_REVIEW'}
              >
                {profile.publicationState === 'PENDING_REVIEW'
                  ? 'Awaiting review'
                  : 'Submit for review'}
              </button>
            </form>
          ) : (
            <form
              action={async () => {
                'use server';
                await withdrawProfileAction();
              }}
            >
              <button type="submit" className="btn btn-secondary">
                Withdraw from publication
              </button>
            </form>
          )}
        </div>
      </Section>

      <Section title="What the public sees">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Public profile:{' '}
            {profile.publicationState === 'PUBLISHED'
              ? 'visible with published fields only.'
              : 'not visible (404 for everyone else).'}
          </li>
          <li>
            Resume download:{' '}
            {extras.resumes.some((resume) => resume.published) &&
            profile.publicationState === 'PUBLISHED'
              ? 'available while published.'
              : 'disabled — hidden from the public profile.'}
          </li>
          <li>Draft fields, reviewer notes, and private resumes are never publicly readable.</li>
        </ul>
      </Section>
    </div>
  );
}
