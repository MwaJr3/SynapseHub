import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';

export default async function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<JSX.Element> {
  await requireUser();
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav aria-label="Employer" className="flex flex-row flex-wrap gap-2 lg:flex-col">
        {([
          ['Overview', '/employer'],
          ['Jobs', '/employer/jobs'],
          ['Candidates', '/employer/candidates'],
          ['Organization', '/employer/organization'],
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
