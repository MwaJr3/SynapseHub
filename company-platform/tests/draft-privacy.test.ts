/**
 * Draft privacy: unpublished content is invisible to public queries, and
 * private/withdrawn resumes are never downloadable to anyone but their owner.
 */
import { describe, expect, it } from 'vitest';

import {
  getCaseStudyBySlug,
  getPublishedPersonBySlug,
  getPublishedProductBySlug,
  getPublishedSolutionBySlug,
  listPublishedPeople,
  listPublishedProducts,
} from '@/lib/queries';
import { canDownloadResume } from '@/lib/resume-policy';
import { looksLikePdf, MAX_RESUME_BYTES } from '@/lib/storage';
import { getDb } from '@/lib/db';
import { caseStudies, solutionAreas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  createTestCompany,
  createTestProfile,
  createTestProduct,
  createTestUser,
} from './fixtures';

describe('draft content is publicly unreadable', () => {
  it('draft products are excluded from public queries', async () => {
    const company = await createTestCompany('draft-co');
    const draftId = await createTestProduct(company, 'DRAFT');
    const publishedId = await createTestProduct(company, 'PUBLISHED');
    const db = getDb();
    const { products } = await import('@/lib/db/schema');
    const [draft] = await db.select().from(products).where(eq(products.id, draftId));
    const [published] = await db.select().from(products).where(eq(products.id, publishedId));

    expect(await getPublishedProductBySlug(draft!.slug, db)).toBeNull();
    expect(await getPublishedProductBySlug(published!.slug, db)).not.toBeNull();

    const listed = await listPublishedProducts(db);
    expect(listed.some((row) => row.slug === draft!.slug)).toBe(false);
    expect(listed.some((row) => row.slug === published!.slug)).toBe(true);
  });

  it('draft case studies and solutions are excluded', async () => {
    const company = await createTestCompany('draft-co-2');
    const productId = await createTestProduct(company, 'PUBLISHED');
    const db = getDb();

    await db.insert(caseStudies).values({
      id: crypto.randomUUID(),
      slug: `draft-study-${crypto.randomUUID()}`,
      productId,
      title: 'Draft study',
      problem: 'Draft problem statement',
      solution: 'Draft solution statement',
      architecture: 'Draft architecture statement',
      testingNote: 'Draft testing',
      publicationState: 'DRAFT',
    });
    await db.insert(solutionAreas).values({
      id: crypto.randomUUID(),
      slug: `draft-solution-${crypto.randomUUID()}`,
      title: 'Draft solution',
      companyId: company,
      problem: 'Draft problem',
      approach: 'Draft approach',
      publicationState: 'DRAFT',
    });

    const [studyRow] = await db
      .select()
      .from(caseStudies)
      .where(eq(caseStudies.productId, productId))
      .limit(1);
    const [solutionRow] = await db
      .select()
      .from(solutionAreas)
      .where(eq(solutionAreas.companyId, company))
      .limit(1);

    expect(await getCaseStudyBySlug(studyRow!.slug, db)).toBeNull();
    expect(await getPublishedSolutionBySlug(solutionRow!.slug, db)).toBeNull();
  });

  it('draft profiles are not listed or readable publicly', async () => {
    const user = await createTestUser('MEMBER');
    await createTestProfile(user, 'DRAFT');
    const db = getDb();
    const listed = await listPublishedPeople(db);
    const { personProfiles } = await import('@/lib/db/schema');
    const [profile] = await db.select().from(personProfiles).where(eq(personProfiles.userId, user));

    expect(await getPublishedPersonBySlug(profile!.slug, db)).toBeNull();
    expect(listed.some((row) => row.slug === profile!.slug)).toBe(false);
  });
});

describe('resume download policy', () => {
  const base = {
    resumePublished: false,
    resumeDeleted: false,
    profilePublished: true,
    ownerUserId: 'owner-1',
  };

  it('private resumes are downloadable only by their owner', () => {
    expect(canDownloadResume(base, 'owner-1')).toBe(true);
    expect(canDownloadResume(base, 'stranger')).toBe(false);
    expect(canDownloadResume(base, null)).toBe(false);
  });

  it('published resumes become publicly downloadable', () => {
    const published = { ...base, resumePublished: true };
    expect(canDownloadResume(published, null)).toBe(true);
  });

  it('withdrawal of the profile kills downloads immediately', () => {
    const withdrawn = {
      ...base,
      resumePublished: true,
      profilePublished: false,
    };
    expect(canDownloadResume(withdrawn, null)).toBe(false);
    expect(canDownloadResume(withdrawn, 'stranger')).toBe(false);
    // The owner can still fetch their own file.
    expect(canDownloadResume(withdrawn, 'owner-1')).toBe(true);
  });

  it('deleted resumes are unreadable even to the owner', () => {
    expect(
      canDownloadResume({ ...base, resumeDeleted: true }, 'owner-1'),
    ).toBe(false);
  });
});

describe('resume file validation', () => {
  it('accepts only PDF-signature files within the size cap', () => {
    const pdf = new TextEncoder().encode('%PDF-1.7\n...');
    expect(looksLikePdf(pdf)).toBe(true);
    expect(looksLikePdf(new TextEncoder().encode('<html>'))).toBe(false);
    expect(looksLikePdf(new Uint8Array(0))).toBe(false);
    expect(MAX_RESUME_BYTES).toBe(5 * 1024 * 1024);
  });
});
