import type { JSX } from 'react';
import { eq } from 'drizzle-orm';

import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { organizationMemberships, organizations, users } from '@/lib/db/schema';
import { resolveEmployerContext } from '@/lib/employer-context';
import { InviteMemberForm } from '@/components/server-forms';
import { Avatar, VerificationBadge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Organization' };

export default async function OrganizationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<JSX.Element> {
  const actor = await requireUser();
  const params = await searchParams;
  const context = await resolveEmployerContext(actor, params.org);
  const db = getDb();

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, context.organizationId))
    .limit(1);

  const members = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, context.organizationId));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{org?.name}</h1>
        <VerificationBadge status={org?.verificationStatus ?? 'UNVERIFIED'} />
      </div>

      <section className="card">
        <h2 className="text-lg font-semibold">Company profile</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium">Industry</dt>
            <dd className="text-ink-muted">{org?.industry || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium">Headquarters</dt>
            <dd className="text-ink-muted">{org?.headquarters || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium">Remote policy</dt>
            <dd className="text-ink-muted">{org?.remotePolicy || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium">Website</dt>
            <dd className="text-ink-muted">
              {org?.website ? (
                <a href={org.website} className="text-brand-700" rel="noopener noreferrer">
                  {org.website}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-3 whitespace-pre-wrap text-ink-muted">
          {org?.description || 'No description yet.'}
        </p>
      </section>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Hiring team</h2>
        <ul className="space-y-2">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3">
              <Avatar name={member.name} />
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-xs text-ink-subtle">
                  {member.role} · {member.email}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {context.role === 'OWNER' || context.role === 'ADMIN' ? (
          <InviteMemberForm organizationId={context.organizationId} />
        ) : (
          <p className="text-sm text-ink-muted">
            Only organization owners and admins can add members.
          </p>
        )}
      </section>
    </div>
  );
}
