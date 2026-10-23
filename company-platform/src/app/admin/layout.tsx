import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { requireUser } from '@/lib/auth';
import { getCompanyAuthorities, isPlatformOperator } from '@/lib/authorization';
import { Badge } from '@/components/ui';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Editorial administration',
  robots: { index: false, follow: false },
};

const ADMIN_NAV = [
  { href: '/admin/companies', label: 'Companies' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/solutions', label: 'Solutions' },
  { href: '/admin/case-studies', label: 'Case studies' },
  { href: '/admin/people', label: 'People' },
  { href: '/admin/review-queue', label: 'Review queue' },
  { href: '/admin/media', label: 'Media' },
  { href: '/admin/settings', label: 'Settings' },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const actor = await requireUser();
  const authorities = await getCompanyAuthorities(actor.id, getDb());
  const hasContentAuthority = authorities.some((entry) => entry.role !== 'MEMBER');
  const platformAdmin =
    isPlatformOperator(actor) || actor.role === 'ADMIN';

  if (!hasContentAuthority && !platformAdmin) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Editorial access required</h1>
        <p className="mt-2 text-muted">
          You do not hold an editorial role for any company on this platform.
          Company editors and platform operators can access the editorial area.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Editorial administration</h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {actor.name}{' '}
          <Badge tone="accent">{actor.role}</Badge>
          {authorities.length > 0 ? (
            <span className="ml-2">
              Company authority:{' '}
              {authorities
                .map((entry) => `${entry.role}`)
                .join(', ')}
            </span>
          ) : null}
        </p>
      </header>
      <nav aria-label="Admin" className="flex flex-wrap gap-2">
        {ADMIN_NAV.map((item) => (
          <Link key={item.href} href={item.href} className="btn btn-secondary">
            {item.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
