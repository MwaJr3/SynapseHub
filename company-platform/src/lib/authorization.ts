/**
 * Authorization: platform roles decide platform powers, company memberships
 * decide company powers. A company editor never reaches the other company's
 * records unless an explicit second membership says so. Public rendering
 * only ever sees published content — enforced at query time.
 */
import { eq } from 'drizzle-orm';

import { getDb, type Db } from '@/lib/db';
import { companyMemberships, personProfiles } from '@/lib/db/schema';
import type { Actor } from '@/lib/auth';

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

export function isPlatformOperator(actor: Actor | null): boolean {
  return actor?.role === 'PLATFORM_OPERATOR';
}

export interface CompanyAuthority {
  companyId: string;
  role: 'MEMBER' | 'EDITOR' | 'ADMIN';
}

/** The membership rows a user actually holds — never inferred. */
export async function getCompanyAuthorities(
  userId: string,
  db: Db = getDb(),
): Promise<CompanyAuthority[]> {
  const rows = await db
    .select({
      companyId: companyMemberships.companyId,
      role: companyMemberships.role,
    })
    .from(companyMemberships)
    .where(eq(companyMemberships.userId, userId));
  return rows;
}

/**
 * Company-scoped content authority: editors and admins may manage content for
 * the company they hold a membership in. Platform operators do not gain
 * business content authority here by default — that is a deliberate boundary.
 */
export async function requireCompanyContentAuthority(
  actor: Actor | null,
  companyId: string,
  db: Db = getDb(),
): Promise<CompanyAuthority> {
  const user = requireActor(actor);
  const authorities = await getCompanyAuthorities(user.id, db);
  const match = authorities.find((entry) => entry.companyId === companyId);
  if (!match || match.role === 'MEMBER') {
    throw new AuthorizationError(
      'You do not have editorial authority for this company.',
    );
  }
  return match;
}

/** Platform-level administration (users, cross-company settings). */
export function requirePlatformAdmin(actor: Actor | null): Actor {
  const user = requireActor(actor);
  if (user.role !== 'ADMIN' && user.role !== 'PLATFORM_OPERATOR') {
    throw new AuthorizationError('Platform administration is required.');
  }
  return user;
}

export async function requireProfileOwnership(
  actor: Actor | null,
  personProfileId: string,
  db: Db = getDb(),
): Promise<typeof personProfiles.$inferSelect> {
  const user = requireActor(actor);
  const [profile] = await db
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.id, personProfileId))
    .limit(1);
  if (!profile) throw new AuthorizationError('Profile not found.', 404);
  const owns = profile.userId === user.id;
  const canReview =
    user.role === 'ADMIN' || user.role === 'PLATFORM_OPERATOR';
  if (!owns && !canReview) {
    // 404 rather than 403: outsiders learn nothing about the profile.
    throw new AuthorizationError('Profile not found.', 404);
  }
  return profile;
}

export async function requireOwnProfile(
  actor: Actor | null,
  db: Db = getDb(),
): Promise<typeof personProfiles.$inferSelect> {
  const user = requireActor(actor);
  const [profile] = await db
    .select()
    .from(personProfiles)
    .where(eq(personProfiles.userId, user.id))
    .limit(1);
  if (!profile) throw new AuthorizationError('Profile not found.', 404);
  return profile;
}

export function isApprovedRole(role: string): boolean {
  return role === 'EDITOR' || role === 'ADMIN' || role === 'PLATFORM_OPERATOR';
}
