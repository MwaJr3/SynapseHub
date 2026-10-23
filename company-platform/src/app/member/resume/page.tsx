import type { Metadata } from 'next';

import {
  deleteResumeAction,
  setResumePublishedAction,
  uploadResumeAction,
} from '@/app/actions/profile';
import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonProfileByUserId, listPersonExtras } from '@/lib/queries';
import { UploadResumeForm } from './upload-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Resume',
  robots: { index: false, follow: false },
};

export default async function ResumePage() {
  const actor = await requireUser();
  const db = getDb();
  const profile = await getPersonProfileByUserId(actor.id, db);
  if (!profile) return <EmptyState>No profile record exists for your account.</EmptyState>;
  const extras = await listPersonExtras(profile.id, db);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Resume</h1>
        <p className="mt-2 max-w-prose text-muted">
          Resumes are private by default. Publishing a resume exposes its
          download on your public profile; un-publishing or withdrawing your
          profile kills the download immediately. Only valid PDF files up to
          5 MB are accepted.
        </p>
      </header>

      <UploadResumeForm action={uploadResumeAction} />

      <Section title="Your resume files">
        {extras.resumes.length === 0 ? (
          <EmptyState>No resume uploaded yet.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {extras.resumes.map((resume) => (
              <li key={resume.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-3">
                <div>
                  <p className="text-sm font-medium">{resume.filename}</p>
                  <Badge tone={resume.published ? 'accent' : 'neutral'}>
                    {resume.published ? 'Published — downloadable' : 'Private — not downloadable'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <form
                    action={async () => {
                      'use server';
                      await setResumePublishedAction(resume.id, !resume.published);
                    }}
                  >
                    <button type="submit" className="btn btn-secondary">
                      {resume.published ? 'Unpublish' : 'Publish'}
                    </button>
                  </form>
                  <form
                    action={async () => {
                      'use server';
                      await deleteResumeAction(resume.id);
                    }}
                  >
                    <button type="submit" className="btn btn-secondary">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
