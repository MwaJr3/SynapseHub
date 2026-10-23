import type { Metadata } from 'next';

import { Badge, Section, EmptyState } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonProfileByUserId, listPersonExtras } from '@/lib/queries';
import { isConfiguredUrl } from '@/lib/validation';
import { externalAnchorProps } from '@/lib/links';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Profile preview',
  robots: { index: false, follow: false },
};

export default async function ProfilePreviewPage() {
  const actor = await requireUser();
  const db = getDb();
  const profile = await getPersonProfileByUserId(actor.id, db);
  if (!profile) return <EmptyState>No profile record exists for your account.</EmptyState>;
  const extras = await listPersonExtras(profile.id, db);

  return (
    <div className="space-y-6">
      <header className="card border-dashed">
        <Badge tone="accent">Private preview — only you can see this</Badge>
        <h1 className="mt-3 text-2xl font-semibold">{profile.displayName}</h1>
        {profile.pronouns ? <p className="text-sm text-muted">{profile.pronouns}</p> : null}
        <p className="mt-2 text-lg text-muted">{profile.headline}</p>
        <p className="mt-3 max-w-prose text-muted">{profile.longBio || profile.shortBio}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {isConfiguredUrl(profile.personalPortfolioUrl) ? (
            <a href={profile.personalPortfolioUrl} className="btn btn-primary" {...externalAnchorProps}>
              Visit Personal Portfolio
            </a>
          ) : null}
          {isConfiguredUrl(profile.githubUrl) ? (
            <a href={profile.githubUrl} className="btn btn-secondary" {...externalAnchorProps}>GitHub</a>
          ) : null}
          {isConfiguredUrl(profile.professionalProfileUrl) ? (
            <a href={profile.professionalProfileUrl} className="btn btn-secondary" {...externalAnchorProps}>
              Professional Profile
            </a>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted">
          External buttons appear only where you configured a URL. Unconfigured
          buttons are hidden on the public profile.
        </p>
      </header>

      <Section title="Skills">
        <p>Technical: {profile.technicalSkills?.join(' · ') || '—'}</p>
        <p className="mt-1">Interpersonal: {profile.softSkills?.join(' · ') || '—'}</p>
        <p className="mt-1">Domains: {profile.domains?.join(' · ') || '—'}</p>
      </Section>

      <Section title="Education">
        {extras.education.length === 0 ? <EmptyState>Nothing published yet.</EmptyState> : (
          <ul className="space-y-2">
            {extras.education.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.qualification}</strong> — {entry.institution}
                {entry.period ? ` (${entry.period})` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Experience">
        {extras.experience.length === 0 ? <EmptyState>Nothing published yet.</EmptyState> : (
          <ul className="space-y-2">
            {extras.experience.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.role}</strong> — {entry.organization}
                {entry.period ? ` (${entry.period})` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Certifications">
        {extras.certifications.length === 0 ? <EmptyState>Nothing published yet.</EmptyState> : (
          <ul className="space-y-2">
            {extras.certifications.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.name}</strong>
                {entry.issuer ? ` — ${entry.issuer}` : ''}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Portfolio links">
        {extras.links.length === 0 ? <EmptyState>Nothing added yet.</EmptyState> : (
          <ul className="space-y-1">
            {extras.links.map((link) => (
              <li key={link.id}>
                {isConfiguredUrl(link.url) ? (
                  <a href={link.url} className="accent-text hover:underline" {...externalAnchorProps}>
                    {link.label}
                  </a>
                ) : link.label}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Resume">
        {extras.resumes.some((resume) => resume.published) ? (
          <p>Published resumes will show a download button on the public profile.</p>
        ) : (
          <p>No published resume — the download button is hidden publicly.</p>
        )}
      </Section>
    </div>
  );
}
