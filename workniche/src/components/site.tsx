/** Site chrome: header, footer, account menu. */
import Link from 'next/link';
import type { JSX } from 'react';

import { getSessionActor } from '@/lib/auth';
import { unreadCount } from '@/lib/notifications';
import { SignOutButton } from '@/components/sign-out-button';
import { Avatar, VerificationBadge } from '@/components/ui';

export async function SiteHeader(): Promise<JSX.Element> {
  const actor = await getSessionActor();
  const unread = actor ? await unreadCount(actor.id) : 0;

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          WorkNiche
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link href="/jobs" className="text-ink-muted hover:text-ink">
            Jobs
          </Link>
          <Link href="/companies" className="text-ink-muted hover:text-ink">
            Companies
          </Link>
          {actor ? (
            <>
              <Link href="/dashboard" className="text-ink-muted hover:text-ink">
                Dashboard
              </Link>
              {actor.role === 'EMPLOYER' || actor.role === 'RECRUITER' ? (
                <Link href="/employer" className="text-ink-muted hover:text-ink">
                  Employer
                </Link>
              ) : null}
              {actor.role === 'ADMIN' ? (
                <Link href="/admin" className="text-ink-muted hover:text-ink">
                  Admin
                </Link>
              ) : null}
            </>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {actor ? (
            <>
              <Link
                href="/dashboard/notifications"
                className="relative text-sm text-ink-muted hover:text-ink"
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
              >
                Notifications
                {unread > 0 ? (
                  <span className="absolute -right-2 -top-1 rounded-full bg-brand-600 px-1.5 text-xs text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>
              <Link href="/dashboard/profile" className="flex items-center gap-2 text-sm">
                <Avatar name={actor.name} />
                <span className="hidden sm:inline">{actor.name}</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-ink-muted hover:text-ink">
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
      <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
        Demonstration platform — every company, person and listing here is fictional
        sample data.
      </p>
    </header>
  );
}

export function SiteFooter(): JSX.Element {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-ink-muted sm:flex-row sm:items-center">
        <p>
          <strong className="text-ink">WorkNiche</strong> — a demonstration job
          marketplace for specialized technical work.
        </p>
        <p className="sm:ml-auto">
          All organizations, people and jobs are fictional sample data.
        </p>
      </div>
    </footer>
  );
}

export function OrgLine({
  name,
  verification,
  slug,
}: {
  name: string;
  verification: string;
  slug?: string;
}): JSX.Element {
  const nameNode = slug ? (
    <Link href={`/companies/${slug}`} className="font-medium text-ink hover:text-brand-700">
      {name}
    </Link>
  ) : (
    <span className="font-medium text-ink">{name}</span>
  );
  return (
    <div className="flex items-center gap-2">
      {nameNode}
      <VerificationBadge status={verification} />
    </div>
  );
}
