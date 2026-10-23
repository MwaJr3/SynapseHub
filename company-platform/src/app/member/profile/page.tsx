import type { Metadata } from 'next';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonProfileByUserId, listPersonExtras } from '@/lib/queries';
import { EntrySection, ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit profile',
  robots: { index: false, follow: false },
};

export default async function ProfileEditPage() {
  const actor = await requireUser();
  const db = getDb();
  const profile = await getPersonProfileByUserId(actor.id, db);
  const extras = profile
    ? await listPersonExtras(profile.id, db)
    : { education: [], experience: [], certifications: [], links: [], resumes: [] };

  if (!profile) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">No profile record</h1>
        <p className="mt-2 text-muted">
          Your account has no profile record yet. A platform operator must create
          one before you can edit a profile.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Edit your profile</h1>
        <p className="mt-2 max-w-prose text-muted">
          Everything you enter here stays private until you submit for review
          and a reviewer publishes it. Fields left empty are hidden on the public
          profile — never filled with placeholders.
        </p>
      </header>

      <ProfileForm
        initial={{
          displayName: profile.displayName,
          pronouns: profile.pronouns,
          headline: profile.headline,
          shortBio: profile.shortBio,
          longBio: profile.longBio,
          technicalSkills: profile.technicalSkills ?? [],
          softSkills: profile.softSkills ?? [],
          domains: profile.domains ?? [],
          personalPortfolioUrl: profile.personalPortfolioUrl,
          githubUrl: profile.githubUrl,
          professionalProfileUrl: profile.professionalProfileUrl,
          contactVisible: profile.contactVisible,
        }}
      />

      <EntrySection kind="education" title="Education" entries={extras.education as unknown as Array<Record<string, string>>} />
      <EntrySection kind="experience" title="Experience" entries={extras.experience as unknown as Array<Record<string, string>>} />
      <EntrySection kind="certification" title="Certifications" entries={extras.certifications as unknown as Array<Record<string, string>>} />
      <EntrySection kind="link" title="Portfolio links" entries={extras.links as unknown as Array<Record<string, string>>} />
    </div>
  );
}
