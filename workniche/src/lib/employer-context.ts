/**
 * Employer pages resolve "which organization am I acting for?" once:
 * the ?org= query param if it names one of the actor's memberships, else
 * their first membership. Never trusts the param alone.
 */
import { redirect } from 'next/navigation';

import type { Actor } from '@/lib/authorization';
import { listUserMemberships } from '@/lib/queries';

export interface EmployerContext {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  verificationStatus: string;
  role: string;
  memberships: Awaited<ReturnType<typeof listUserMemberships>>;
}

export async function resolveEmployerContext(
  actor: Actor,
  orgParam: string | string[] | undefined,
): Promise<EmployerContext> {
  const memberships = await listUserMemberships(actor.id);
  const requested = Array.isArray(orgParam) ? orgParam[0] : orgParam;
  const chosen =
    memberships.find((membership) => membership.organizationId === requested) ??
    memberships[0];
  if (!chosen) redirect('/employer/join');
  return {
    organizationId: chosen.organizationId,
    organizationName: chosen.organizationName,
    organizationSlug: chosen.organizationSlug,
    verificationStatus: chosen.verificationStatus,
    role: chosen.role,
    memberships,
  };
}
