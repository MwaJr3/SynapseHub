import type { Metadata } from 'next';

import { EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getPersonProfileByUserId, listPersonExtras } from '@/lib/queries';
import { isConfiguredUrl } from '@/lib/validation';
import { externalAnchorProps } from '@/lib/links';
import { EntrySection } from '../profile/profile-form';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portfolio links',
  robots: { index: false, follow: false },
};

export default async function PortfolioLinksPage() {
  const actor = await requireUser();
  const db = getDb();
  const profile = await getPersonProfileByUserId(actor.id, db);
  if (!profile) return <EmptyState>No profile record exists for your account.</EmptyState>;
  const extras = await listPersonExtras(profile.id, db);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Portfolio links</h1>
        <p className="mt-2 max-w-prose text-muted">
          Links to your selected work. Each link needs a label and a full http(s)
          destination — nothing is invented or placeholdered. Your personal
          portfolio (configured separately on the profile page) stays a
          standalone site that the platform links out to.
        </p>
      </header>

      <Section title="Your personal portfolio">
        {isConfiguredUrl(profile.personalPortfolioUrl) ? (
          <p>
            Configured:{' '}
            <a
              href={profile.personalPortfolioUrl}
              className="accent-text hover:underline"
              {...externalAnchorProps}
            >
              {profile.personalPortfolioUrl}
            </a>{' '}
            — the &quot;Visit Personal Portfolio&quot; button is live on your public
            profile and opens in a new tab.
          </p>
        ) : (
          <p>
            Not configured yet — the button stays hidden on your public profile
            until you add a URL on the{' '}
            <a href="/member/profile" className="accent-text hover:underline">profile page</a>.
          </p>
        )}
      </Section>

      <EntrySection kind="link" title="Portfolio links" entries={extras.links as unknown as Array<Record<string, string>>} />

      <Section title="Link policy">
        <ul className="list-disc space-y-1 pl-5">
          <li>Full http(s) URLs only — other schemes are rejected.</li>
          <li>Unconfigured or invalid links never render as placeholder buttons.</li>
          <li>External links open in a new tab with noreferrer protection.</li>
        </ul>
      </Section>
    </div>
  );
}
