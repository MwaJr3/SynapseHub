import { reviewProfileAction } from '@/app/actions/review';
import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { isPlatformOperator } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { personProfiles, publicationReviews, users } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { ReviewForm } from './review-form';

export const dynamic = 'force-dynamic';

export default async function ReviewQueuePage() {
  const actor = await requireUser();
  const canReview = isPlatformOperator(actor) || actor.role === 'ADMIN';
  const db = getDb();

  const pending = await db
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.publicationState, 'PENDING_REVIEW'));

  const history = await db
    .select({
      id: publicationReviews.id,
      decision: publicationReviews.decision,
      note: publicationReviews.note,
      createdAt: publicationReviews.createdAt,
      profileName: personProfiles.displayName,
      reviewerName: users.name,
    })
    .from(publicationReviews)
    .innerJoin(personProfiles, eq(personProfiles.id, publicationReviews.personProfileId))
    .leftJoin(users, eq(users.id, publicationReviews.reviewerId))
    .orderBy(desc(publicationReviews.createdAt))
    .limit(20);

  return (
    <div className="space-y-6">
      <Section title="Pending profile reviews">
        {!canReview ? (
          <p>
            You can see this queue, but only platform operators and platform
            administrators can decide reviews. Company editors hold content
            authority for their company catalogue only.
          </p>
        ) : pending.length === 0 ? (
          <EmptyState>No profiles are awaiting review.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {pending.map((profile) => (
              <li key={profile.id} className="rounded-md border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{profile.displayName}</strong>
                  <Badge>{profile.slug}</Badge>
                  <Badge tone="accent">{profile.publicationState}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{profile.headline}</p>
                <p className="mt-1 text-sm text-muted">{profile.shortBio}</p>
                {canReview ? (
                  <ReviewForm
                    personProfileId={profile.id}
                    action={reviewProfileAction}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Review history">
        {history.length === 0 ? (
          <EmptyState>No review decisions recorded yet.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {history.map((entry) => (
              <li key={entry.id} className="rounded-md border border-line p-3 text-sm">
                <strong>{entry.decision}</strong> — {entry.profileName}{' '}
                <span className="text-muted">
                  by {entry.reviewerName ?? 'unknown'} · {entry.createdAt.toISOString().slice(0, 10)}
                </span>
                {entry.note ? <p className="mt-1 text-muted">{entry.note}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
