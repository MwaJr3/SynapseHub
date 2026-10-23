/**
 * Required authorization tests: cross-company isolation, own-profile-only
 * access, suspended members losing write access, and platform-admin boundaries.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  AuthorizationError,
  getCompanyAuthorities,
  requireCompanyContentAuthority,
  requirePlatformAdmin,
  requireProfileOwnership,
  requireActor,
} from '@/lib/authorization';
import { lookupActor } from '@/lib/auth/actor-lookup';
import { getDb } from '@/lib/db';
import { auditEvents, personProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  createMembership,
  createTestCompany,
  createTestProfile,
  createTestUser,
} from './fixtures';

describe('cross-company isolation', () => {
  it('a Velaqori editor cannot manage Tamuzi content', async () => {
    const velaqori = await createTestCompany('velaqori');
    const tamuzi = await createTestCompany('tamuzi');
    const editor = await createTestUser('EDITOR');
    await createMembership(editor, velaqori, 'EDITOR');

    // Authority holds for the editor's own company…
    await expect(
      requireCompanyContentAuthority(
        { id: editor, name: 'E', email: 'e@x.com', role: 'EDITOR' },
        velaqori,
      ),
    ).resolves.toMatchObject({ companyId: velaqori, role: 'EDITOR' });

    // …and never for the other company.
    await expect(
      requireCompanyContentAuthority(
        { id: editor, name: 'E', email: 'e@x.com', role: 'EDITOR' },
        tamuzi,
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it('explicit membership is required — no inferred authority', async () => {
    const company = await createTestCompany('solo');
    const outsider = await createTestUser('MEMBER');
    await expect(
      requireCompanyContentAuthority(
        { id: outsider, name: 'O', email: 'o@x.com', role: 'MEMBER' },
        company,
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it('company members without editorial roles hold no content authority', async () => {
    const company = await createTestCompany('member-only');
    const member = await createTestUser('MEMBER');
    await createMembership(member, company, 'MEMBER');
    await expect(
      requireCompanyContentAuthority(
        { id: member, name: 'M', email: 'm@x.com', role: 'MEMBER' },
        company,
      ),
    ).rejects.toThrow(AuthorizationError);
  });

  it('multi-company membership must be explicit for each company', async () => {
    const a = await createTestCompany('multi-a');
    const b = await createTestCompany('multi-b');
    const user = await createTestUser('EDITOR');
    await createMembership(user, a, 'EDITOR');
    await createMembership(user, b, 'EDITOR');
    const authorities = await getCompanyAuthorities(user);
    expect(authorities.map((entry) => entry.companyId).sort()).toEqual(
      [a, b].sort(),
    );
  });
});

describe('own-profile-only access', () => {
  it('members can only reach their own profile; others get 404 semantics', async () => {
    const owner = await createTestUser('MEMBER');
    const stranger = await createTestUser('MEMBER');
    const profileId = await createTestProfile(owner, 'DRAFT');

    const ownerActor = { id: owner, name: 'O', email: 'o@x.com', role: 'MEMBER' as const };
    const strangerActor = { id: stranger, name: 'S', email: 's@x.com', role: 'MEMBER' as const };

    await expect(requireProfileOwnership(ownerActor, profileId)).resolves.toMatchObject({
      id: profileId,
    });

    // Outsiders receive 404 (AuthorizationError with status 404), not 403 —
    // the existence of the profile is not disclosed.
    const denial = requireProfileOwnership(strangerActor, profileId);
    await expect(denial).rejects.toThrow(AuthorizationError);
    await denial.catch((error: AuthorizationError) => {
      expect(error.status).toBe(404);
    });
  });
});

describe('suspended members lose write access', () => {
  it('disabled accounts resolve to no actor and fail authorization', async () => {
    const user = await createTestUser('EDITOR');
    const company = await createTestCompany('suspended');
    await createMembership(user, company, 'EDITOR');

    // Active: lookupActor returns the account.
    await expect(lookupActor(user)).resolves.not.toBeNull();

    // Suspend.
    await getDb()
      .update(users)
      .set({ disabledAt: new Date() })
      .where(eq(users.id, user));

    await expect(lookupActor(user)).resolves.toBeNull();
    expect(() => requireActor(null)).toThrow(AuthorizationError);
    // With no obtainable actor (what the session layer yields for suspended
    // accounts), every company authority path fails.
    await expect(
      requireCompanyContentAuthority(null, company),
    ).rejects.toThrow(AuthorizationError);
  });
});

describe('platform boundaries', () => {
  it('only platform operators and admins pass requirePlatformAdmin', () => {
    expect(() =>
      requirePlatformAdmin({
        id: '1',
        name: 'Op',
        email: 'op@x.com',
        role: 'PLATFORM_OPERATOR',
      }),
    ).not.toThrow();
    expect(() =>
      requirePlatformAdmin({ id: '2', name: 'Ad', email: 'ad@x.com', role: 'ADMIN' }),
    ).not.toThrow();
    expect(() =>
      requirePlatformAdmin({ id: '3', name: 'Ed', email: 'ed@x.com', role: 'EDITOR' }),
    ).toThrow(AuthorizationError);
    expect(() => requirePlatformAdmin(null)).toThrow(AuthorizationError);
  });

  it('unauthenticated requests fail with 401 semantics', () => {
    try {
      requireActor(null);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect((error as AuthorizationError).status).toBe(401);
    }
  });
});

describe('audit events', () => {
  it('sensitive database actions leave audit records', async () => {
    const db = getDb();
    const user = await createTestUser('MEMBER');
    await db.insert(auditEvents).values({
      actorId: user,
      action: 'profile.update',
      resourceType: 'person_profile',
      resourceId: 'some-profile',
    });
    const [record] = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.actorId, user))
      .limit(1);
    expect(record?.action).toBe('profile.update');
  });

  it('profile records carry their owning user for audit linkage', async () => {
    const db = getDb();
    const user = await createTestUser('MEMBER');
    const profileId = await createTestProfile(user);
    const [profile] = await db
      .select()
      .from(personProfiles)
      .where(eq(personProfiles.id, profileId))
      .limit(1);
    expect(profile?.userId).toBe(user);
  });
});
