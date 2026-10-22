import Link from 'next/link';
import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { OrganizationForm } from '@/components/organization-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Join as an employer' };

export default async function EmployerJoinPage(): Promise<JSX.Element> {
  await requireUser();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Set up your organization</h1>
        <p className="mt-2 text-ink-muted">
          You are not a member of any organization yet. Create one to post jobs and
          review candidates — or ask an owner to add your account to an existing
          team.
        </p>
      </div>
      <OrganizationForm />
      <p className="text-sm text-ink-muted">
        New organizations start <strong>unverified</strong>. Platform administrators
        review and change verification states; the label is shown everywhere the
        company appears.
      </p>
      <p className="text-sm">
        <Link href="/employer" className="text-brand-700">← Back</Link>
      </p>
    </div>
  );
}
