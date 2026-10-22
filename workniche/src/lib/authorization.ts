/**
 * Authorization: roles decide actions, memberships decide companies, and
 * candidate data stays inside its own hiring team. Membership rows — not
 * role labels — are the source of truth inside an organization.
 */
import { and, eq } from 'drizzle-orm';

import { getDb, type Db } from '@/lib/db';
import {
  jobs,
  organizationMemberships,
  users,
} from '@/lib/db/schema';

export interface Actor {
  id: string;
  name: string;
  email: string;
  role: 'JOB_SEEKER' | 'EMPLOYER' | 'RECRUITER' | 'ADMIN';
}

export class AuthorizationError extends Error {
  status: 401 | 403 | 404;
  constructor(message: string, status: 401 | 403 | 404 = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.status = status;
  }
}

export function requireActor(actor: Actor | null): Actor {
  if (!actor) throw new AuthorizationError('You must be signed in.', 401);
  return actor;
}

export function requireAdmin(actor: Actor | null): Actor {
  const user = requireActor(actor);
  if (user.role !== 'ADMIN') {
    throw new AuthorizationError('Administrator access is required.');
  }
  return user;
}

export async function isActiveUser(
  userId: string,
  db: Db = getDb(),
): Promise<boolean> {
  const [row] = await db
    .select({ suspendedAt: users.suspendedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(row) && row!.suspendedAt == null;
}

export type MembershipRole = 'OWNER' | 'ADMIN' | 'RECRUITER';

/**
 * The membership row is the source of truth for what a user may do inside an
 * organization. Missing membership means no access at all.
 */
export async function getMembership(
  actorId: string,
  organizationId: string,
  db: Db = getDb(),
): Promise<{ role: MembershipRole } | null> {
  const [row] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.userId, actorId),
        eq(organizationMemberships.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function requireOrgMember(
  actor: Actor | null,
  organizationId: string,
  db: Db = getDb(),
): Promise<MembershipRole> {
  const user = requireActor(actor);
  const membership = await getMembership(user.id, organizationId, db);
  if (!membership) {
    // 404 rather than 403: an outsider learns nothing about the org.
    throw new AuthorizationError('Organization not found.', 404);
  }
  return membership.role;
}

/** Creating/publishing jobs, reviewing candidates: OWNER/ADMIN/RECRUITER. */
export async function requireJobAccess(
  actor: Actor | null,
  jobId: string,
  db: Db = getDb(),
): Promise<{ job: typeof jobs.$inferSelect; role: MembershipRole }> {
  const user = requireActor(actor);
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new AuthorizationError('Job not found.', 404);
  const role = await requireOrgMember(user, job.organizationId, db);
  return { job, role };
}

/** Organization settings and membership management: OWNER/ADMIN only. */
export async function requireOrgAdmin(
  actor: Actor | null,
  organizationId: string,
  db: Db = getDb(),
): Promise<MembershipRole> {
  const role = await requireOrgMember(actor, organizationId, db);
  if (role !== 'OWNER' && role !== 'ADMIN') {
    throw new AuthorizationError(
      'Only organization administrators can change these settings.',
    );
  }
  return role;
}

/**
 * Can this actor see the candidate behind an application? Hiring teams of the
 * job's organization can; nobody else (except an admin) can — least of all a
 * different employer. Takes the application's job id.
 */
export async function requireApplicationAccess(
  actor: Actor | null,
  applicationJobId: string,
  db: Db = getDb(),
): Promise<void> {
  const user = requireActor(actor);
  if (user.role === 'ADMIN') return;
  await requireJobAccess(user, applicationJobId, db);
}

export function isHiringRole(role: string): boolean {
  return role === 'EMPLOYER' || role === 'RECRUITER' || role === 'ADMIN';
}

export type ProfileVisibility = 'PUBLIC' | 'VERIFIED_EMPLOYERS' | 'PRIVATE';

/**
 * May `viewer` see contact-level fields of `subjectId`'s profile at this
 * visibility level? Owners and platform administrators always may; hiring
 * teams see VERIFIED_EMPLOYERS profiles; anything else needs PUBLIC. This
 * is enforced where data is fetched — hidden fields are never transmitted.
 */
export function visibilityRule(
  viewer: Actor,
  subjectId: string,
  visibility: ProfileVisibility,
): boolean {
  if (viewer.id === subjectId || viewer.role === 'ADMIN') return true;
  if (visibility === 'PUBLIC') return true;
  if (visibility === 'VERIFIED_EMPLOYERS') return isHiringRole(viewer.role);
  return false;
}

/** Members who can be assigned to a candidate: the org's hiring roles. */
export async function listAssignableMembers(
  organizationId: string,
  db: Db = getDb(),
): Promise<Array<{ userId: string; name: string; role: MembershipRole }>> {
  return db
    .select({
      userId: users.id,
      name: users.name,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, organizationId));
}
