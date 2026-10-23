import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { AuthorizationError } from '@/lib/authorization';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  const actor = await requireUser();
  if (actor.role !== 'ADMIN') {
    throw new AuthorizationError('Administrator access is required.');
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Administration" className="flex flex-row flex-wrap gap-2 lg:flex-col">
        {([
          ['Overview', '/admin'],
          ['Reports', '/admin/reports'],
          ['Organizations', '/admin/organizations'],
          ['Users', '/admin/users'],
        ] as const).map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}
