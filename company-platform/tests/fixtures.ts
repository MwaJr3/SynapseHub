/** Shared DB fixtures for authorization and privacy tests. */
import { getDb } from '@/lib/db';
import {
  companies,
  companyMemberships,
  personProfiles,
  products,
  resumeAssets,
  users,
} from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';

export async function createTestCompany(slug: string): Promise<string> {
  const db = getDb();
  const id = `test-company-${slug}-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(companies).values({ id, slug: `${slug}-${id.slice(-8)}`, name: slug });
  return id;
}

export async function createTestUser(
  role: 'MEMBER' | 'EDITOR' | 'ADMIN' | 'PLATFORM_OPERATOR' = 'MEMBER',
  disabled = false,
): Promise<string> {
  const db = getDb();
  const id = `test-user-${crypto.randomUUID()}`;
  await db.insert(users).values({
    id,
    email: `${id}@example.com`,
    name: `Test ${role}`,
    passwordHash: await hashPassword('test-password-123'),
    role,
    disabledAt: disabled ? new Date() : null,
  });
  return id;
}

export async function createMembership(
  userId: string,
  companyId: string,
  role: 'MEMBER' | 'EDITOR' | 'ADMIN',
): Promise<void> {
  const db = getDb();
  await db.insert(companyMemberships).values({
    id: crypto.randomUUID(),
    userId,
    companyId,
    role,
  });
}

export async function createTestProfile(
  userId: string,
  publicationState: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' = 'DRAFT',
): Promise<string> {
  const db = getDb();
  const id = `test-profile-${crypto.randomUUID()}`;
  await db.insert(personProfiles).values({
    id,
    userId,
    slug: id,
    displayName: 'Test Person',
    publicationState,
  });
  return id;
}

export async function createTestProduct(
  companyId: string,
  publicationState: 'DRAFT' | 'PUBLISHED' = 'PUBLISHED',
): Promise<string> {
  const db = getDb();
  const id = `test-product-${crypto.randomUUID()}`;
  await db.insert(products).values({
    id,
    slug: id,
    name: 'Test Product',
    companyId,
    category: 'Cybersecurity',
    purpose: 'Test purpose',
    summary: 'Test summary',
    publicationState,
  });
  return id;
}

export async function createTestResume(
  personProfileId: string,
  published: boolean,
): Promise<string> {
  const db = getDb();
  const id = `test-resume-${crypto.randomUUID()}`;
  await db.insert(resumeAssets).values({
    id,
    personProfileId,
    filename: 'resume.pdf',
    storageKey: `test/${id}`,
    sizeBytes: 10,
    published,
  });
  return id;
}
