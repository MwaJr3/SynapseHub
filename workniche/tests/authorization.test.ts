import { describe, expect, it } from 'vitest';

import {
  AuthorizationError,
  getMembership,
  isHiringRole,
  requireAdmin,
  requireApplicationAccess,
  requireJobAccess,
  requireOrgAdmin,
  requireOrgMember,
  visibilityRule,
  type Actor,
} from '@/lib/authorization';
import { getDb } from '@/lib/db';
import {
  addMember,
  makeApplication,
  makeJob,
  makeOrg,
  makeUser,
} from './helpers';

function actorFor(
  id: string,
  role: Actor['role'] = 'EMPLOYER',
): Actor {
  return { id, name: 'Test', email: 't@test.example', role };
}

describe('organization membership', () => {
  it('is decided by the membership row, not the role label', async () => {
    const org = await makeOrg();
    const member = await makeUser('EMPLOYER');
    const stranger = await makeUser('EMPLOYER');
    await addMember(org.id, member.id, 'RECRUITER');

    expect(await getMembership(member.id, org.id)).toEqual({ role: 'RECRUITER' });
    expect(await getMembership(stranger.id, org.id)).toBeNull();

    // An employer with no membership gets a 404 — the org's existence is not leaked.
    await expect(requireOrgMember(actorFor(stranger.id), org.id)).rejects.toMatchObject({
      status: 404,
    });
    expect(await requireOrgMember(actorFor(member.id), org.id)).toBe('RECRUITER');
  });

  it('limits settings changes to OWNER/ADMIN', async () => {
    const org = await makeOrg();
    const recruiter = await makeUser('EMPLOYER');
    const owner = await makeUser('EMPLOYER');
    await addMember(org.id, recruiter.id, 'RECRUITER');
    await addMember(org.id, owner.id, 'OWNER');

    await expect(requireOrgAdmin(actorFor(recruiter.id), org.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
    expect(await requireOrgAdmin(actorFor(owner.id), org.id)).toBe('OWNER');
  });

  it('keeps membership authoritative even for admins, who bypass at the application layer', async () => {
    const admin = await makeUser('ADMIN');
    const org = await makeOrg();
    const job = await makeJob(org.id);
    // Platform admins are not silently members of every organization...
    await expect(requireOrgMember(actorFor(admin.id, 'ADMIN'), org.id)).rejects.toMatchObject({
      status: 404,
    });
    // ...but candidate-file access explicitly includes admins.
    await expect(
      requireApplicationAccess(actorFor(admin.id, 'ADMIN'), job.id),
    ).resolves.toBeUndefined();
  });
});

describe('candidate data access', () => {
  it('blocks hiring teams of other companies', async () => {
    const orgA = await makeOrg();
    const orgB = await makeOrg();
    const jobA = await makeJob(orgA.id);
    const applicant = await makeUser();
    const application = await makeApplication(jobA.id, applicant.id);

    const outsider = await makeUser('EMPLOYER');
    await addMember(orgB.id, outsider.id, 'OWNER');

    await expect(
      requireApplicationAccess(actorFor(outsider.id), jobA.id),
    ).rejects.toMatchObject({ status: 404 });

    const colleague = await makeUser('EMPLOYER');
    await addMember(orgA.id, colleague.id, 'RECRUITER');
    await expect(
      requireApplicationAccess(actorFor(colleague.id), jobA.id),
    ).resolves.toBeUndefined();

    // And the applicant's own job access is denied too.
    await expect(
      requireApplicationAccess(actorFor(applicant.id, 'JOB_SEEKER'), jobA.id),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it('requireJobAccess returns the job with the membership role', async () => {
    const org = await makeOrg();
    const job = await makeJob(org.id);
    const owner = await makeUser('EMPLOYER');
    await addMember(org.id, owner.id, 'OWNER');
    const result = await requireJobAccess(actorFor(owner.id), job.id);
    expect(result.job.id).toBe(job.id);
    expect(result.role).toBe('OWNER');
  });

  it('requireAdmin rejects non-admins', () => {
    expect(() => requireAdmin(actorFor('x', 'EMPLOYER'))).toThrow(AuthorizationError);
    expect(requireAdmin(actorFor('x', 'ADMIN')).id).toBe('x');
  });
});

describe('visibilityRule', () => {
  const subject = 'subject-1';
  it('honours each visibility level', () => {
    const viewer = actorFor('viewer', 'EMPLOYER');
    expect(visibilityRule(viewer, subject, 'PUBLIC')).toBe(true);
    expect(visibilityRule(viewer, subject, 'VERIFIED_EMPLOYERS')).toBe(true);
    expect(visibilityRule(viewer, subject, 'PRIVATE')).toBe(false);
    expect(visibilityRule(actorFor('viewer', 'JOB_SEEKER'), subject, 'VERIFIED_EMPLOYERS')).toBe(false);
    expect(visibilityRule(actorFor(subject, 'JOB_SEEKER'), subject, 'PRIVATE')).toBe(true);
    expect(visibilityRule(actorFor('admin', 'ADMIN'), subject, 'PRIVATE')).toBe(true);
  });

  it('classifies hiring roles', () => {
    expect(isHiringRole('EMPLOYER')).toBe(true);
    expect(isHiringRole('RECRUITER')).toBe(true);
    expect(isHiringRole('ADMIN')).toBe(true);
    expect(isHiringRole('JOB_SEEKER')).toBe(false);
  });
});

describe('getMembership wiring', () => {
  it('reads through the database facade', async () => {
    const org = await makeOrg();
    const user = await makeUser();
    await addMember(org.id, user.id, 'ADMIN');
    expect(await getMembership(user.id, org.id, getDb())).toEqual({ role: 'ADMIN' });
  });
});
