/** Shared fixtures. */
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import {
  applications,
  jobQuestions,
  jobs,
  jobSkills,
  organizationMemberships,
  organizations,
  profiles,
  resumes,
  skills,
  users,
} from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';

let counter = 0;

export function uniqueSlug(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export async function makeUser(
  role: 'JOB_SEEKER' | 'EMPLOYER' | 'RECRUITER' | 'ADMIN' = 'JOB_SEEKER',
  overrides: Partial<typeof users.$inferInsert> = {},
): Promise<typeof users.$inferSelect> {
  const db = getDb();
  const [row] = await db
    .insert(users)
    .values({
      name: `Test User ${uniqueSlug('u')}`,
      email: `${uniqueSlug('user')}@test.example`,
      passwordHash: await hashPassword('test-password-123'),
      role,
      ...overrides,
    })
    .returning();
  return row!;
}

export async function makeOrg(
  overrides: Partial<typeof organizations.$inferInsert> = {},
): Promise<typeof organizations.$inferSelect> {
  const db = getDb();
  const [row] = await db
    .insert(organizations)
    .values({
      name: `Test Org ${uniqueSlug('o')}`,
      slug: uniqueSlug('org'),
      ...overrides,
    })
    .returning();
  return row!;
}

export async function addMember(
  orgId: string,
  userId: string,
  role: 'OWNER' | 'ADMIN' | 'RECRUITER' = 'RECRUITER',
): Promise<void> {
  await getDb()
    .insert(organizationMemberships)
    .values({ organizationId: orgId, userId, role });
}

export async function makeJob(
  orgId: string,
  overrides: Partial<typeof jobs.$inferInsert> = {},
): Promise<typeof jobs.$inferSelect> {
  const db = getDb();
  const [row] = await db
    .insert(jobs)
    .values({
      organizationId: orgId,
      title: `Test Job ${uniqueSlug('j')}`,
      slug: uniqueSlug('job'),
      employmentType: 'FULL_TIME',
      experienceLevel: 'MID',
      workplaceType: 'REMOTE',
      description: 'A sufficiently long description for a test job listing.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      ...overrides,
    })
    .returning();
  return row!;
}

export async function addSkillToJob(jobId: string, name: string): Promise<void> {
  const db = getDb();
  const [skill] = await db
    .insert(skills)
    .values({ name })
    .onConflictDoNothing()
    .returning();
  let skillId = skill?.id;
  if (!skillId) {
    const [existing] = await db
      .select()
      .from(skills)
      .where(eq(skills.name, name))
      .limit(1);
    skillId = existing!.id;
  }
  await db.insert(jobSkills).values({ jobId, skillId }).onConflictDoNothing();
}

export async function makeApplication(
  jobId: string,
  applicantId: string,
  overrides: Partial<typeof applications.$inferInsert> = {},
): Promise<typeof applications.$inferSelect> {
  const db = getDb();
  const [row] = await db
    .insert(applications)
    .values({ jobId, applicantId, ...overrides })
    .returning();
  return row!;
}

export async function addQuestion(
  jobId: string,
  question: string,
): Promise<void> {
  await getDb()
    .insert(jobQuestions)
    .values({ jobId, question, required: true, position: 0 });
}

export async function makeProfile(
  userId: string,
  overrides: Partial<typeof profiles.$inferInsert> = {},
): Promise<typeof profiles.$inferSelect> {
  const db = getDb();
  const [row] = await db
    .insert(profiles)
    .values({ userId, ...overrides })
    .returning();
  return row!;
}

export async function makeResume(
  userId: string,
): Promise<typeof resumes.$inferSelect> {
  const db = getDb();
  const [row] = await db
    .insert(resumes)
    .values({
      userId,
      filename: 'resume.pdf',
      storageKey: 'test-key',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      isDefault: true,
    })
    .returning();
  return row!;
}
