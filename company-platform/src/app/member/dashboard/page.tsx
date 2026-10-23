import type { Metadata } from 'next';
import Link from 'next/link';

import { signOutAction } from '@/app/actions/auth';
import { Badge, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonProfileByUserId, listPersonExtras } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Member dashboard',
  robots: { index: false, follow: false },
};

const STATE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In review',
  PUBLISHED: 'Published',
  UNPUBLISHED: 'Unpublished',
  REJECTED: 'Changes requested',
};

export default async function DashboardPage() {
  const actor = await requireUser();
  const db = getDb();
  const profile = await getPersonProfileByUserId(actor.id, db);
  const extras = profile
    ? await listPersonExtras(profile.id, db)
    : { education: [], experience: [], certifications: [], links: [], resumes: [] };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {actor.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Role: <Badge tone="accent">{actor.role}</Badge>
          </p>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-secondary">Sign out</button>
        </form>
      </header>

      <Section title="Profile status">
        {profile ? (
          <>
            <p>
              Publication status:{' '}
              <Badge tone="accent">
                {STATE_LABELS[profile.publicationState] ?? profile.publicationState}
              </Badge>
            </p>
            <p className="mt-2">
              Resume:{' '}
              {extras.resumes.length === 0
                ? 'none uploaded'
                : extras.resumes.map((resume) => (
                    <span key={resume.id} className="mr-2">
                      {resume.filename} ({resume.published ? 'published' : 'private'})
                    </span>
                  ))}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/member/profile" className="btn btn-primary">Edit profile</Link>
              <Link href="/member/profile/preview" className="btn btn-secondary">Preview</Link>
              <Link href="/member/resume" className="btn btn-secondary">Resume</Link>
              <Link href="/member/portfolio-links" className="btn btn-secondary">Portfolio links</Link>
              <Link href="/member/publication-status" className="btn btn-secondary">Publication status</Link>
            </div>
          </>
        ) : (
          <p>No profile record exists for your account yet. Contact a platform operator.</p>
        )}
      </Section>

      <Section title="How publication works">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Edit your draft as often as you like — nothing is public while it is a draft.</li>
          <li>Use Preview to see exactly what a published profile would show.</li>
          <li>Submit for review when ready; a reviewer approves or requests changes.</li>
          <li>Published profiles appear on the public People page; withdrawal removes them immediately.</li>
          <li>Resumes are private until you explicitly publish them, and withdrawal disables downloads.</li>
        </ol>
      </Section>
    </div>
  );
}
