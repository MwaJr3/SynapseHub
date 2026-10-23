import type { JSX } from 'react';

import { requireUser } from '@/lib/auth';
import { resolveEmployerContext } from '@/lib/employer-context';
import { JobForm } from '@/components/job-form';
import { BackLink } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Post a job' };

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const actor = await requireUser();
  const params = await searchParams;
  const context = await resolveEmployerContext(actor, params.org);

  return (
    <div className="space-y-4">
      <BackLink href="/employer/jobs">Back to jobs</BackLink>
      <h1 className="text-2xl font-bold">Post a job at {context.organizationName}</h1>
      <JobForm organizationId={context.organizationId} />
    </div>
  );
}
