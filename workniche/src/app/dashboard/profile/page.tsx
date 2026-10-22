import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { profiles, resumes } from '@/lib/db/schema';
import { and, isNull, desc } from 'drizzle-orm';
import { ProfileForm } from '@/components/profile-form';
import { ResumeActions } from '@/components/resume-actions';
import { uploadResumeAction } from '@/actions/profiles';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Profile' };

export default async function ProfilePage(): Promise<JSX.Element> {
  const actor = await requireUser();
  const db = getDb();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, actor.id))
    .limit(1);
  const resumeRows = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, actor.id), isNull(resumes.deletedAt)))
    .orderBy(desc(resumes.createdAt));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="text-ink-muted">
        Hiring teams see what you choose to share. Contact details are stripped
        server-side for viewers who fail your visibility rule.
      </p>

      <ProfileForm
        initial={{
          headline: profile?.headline ?? '',
          bio: profile?.bio ?? '',
          location: profile?.location ?? '',
          remotePreference: profile?.remotePreference ?? 'ANY',
          yearsExperience: profile?.yearsExperience ?? 0,
          skills: (profile?.skills as string[]) ?? [],
          technologies: (profile?.technologies as string[]) ?? [],
          availability: profile?.availability ?? '',
          portfolioUrl: profile?.portfolioUrl ?? '',
          githubUrl: profile?.githubUrl ?? '',
          linkedinUrl: profile?.linkedinUrl ?? '',
          visibility: profile?.visibility ?? 'VERIFIED_EMPLOYERS',
          showEmail: profile?.showEmail ?? false,
        }}
      />

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Résumés</h2>
        <p className="text-sm text-ink-muted">
          Stored privately. Downloads go through a permission-checked endpoint —
          only you and the hiring teams of jobs you applied to can fetch them.
        </p>
        <form action={uploadResumeAction as unknown as (formData: FormData) => void} className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            name="file"
            accept=".pdf,.doc,.docx"
            className="text-sm"
            required
          />
          <button type="submit" className="btn-primary">Upload</button>
        </form>
        {resumeRows.length === 0 ? (
          <p className="text-sm text-ink-muted">No résumés uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {resumeRows.map((resume) => (
              <li key={resume.id} className="flex flex-wrap items-center gap-3 text-sm">
                <a
                  href={`/api/files/${resume.id}`}
                  className="font-medium text-brand-700 hover:text-brand-800"
                >
                  {resume.filename}
                </a>
                <span className="text-ink-subtle">
                  {(resume.sizeBytes / 1024).toFixed(0)} KB
                </span>
                {resume.isDefault ? (
                  <span className="badge bg-teal-50 text-signal-ok">Default</span>
                ) : null}
                <span className="ml-auto">
                  <ResumeActions resumeId={resume.id} isDefault={resume.isDefault} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
