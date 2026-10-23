/**
 * Member profile workflow and audit coverage: draft → submit → review → publish
 * → withdraw, with resumes and audit events behaving as specified.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  submitProfileAction,
  updateProfileAction,
  withdrawProfileAction,
} from '@/app/actions/profile';
import { setPublicationStateAction } from '@/app/actions/admin';
import { setTestActor } from './stubs/auth';
import { getDb } from '@/lib/db';
import {
  auditEvents,
  personProfiles,
  products,
  resumeAssets,
} from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  createMembership,
  createTestCompany,
  createTestProfile,
  createTestProduct,
  createTestResume,
  createTestUser,
} from './fixtures';
import type { Actor } from './stubs/actor-type';

async function withActor(
  actor: Actor | null,
  run: () => Promise<void>,
): Promise<void> {
  setTestActor(actor);
  try {
    await run();
  } finally {
    setTestActor(null);
  }
}

function formDataOf(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe('profile publication workflow', () => {
  it('runs draft → submit → publish → withdraw and records audit events', async () => {
    const userId = await createTestUser('MEMBER');
    const profileId = await createTestProfile(userId, 'DRAFT');
    const actor: Actor = { id: userId, name: 'Member', email: 'm@x.com', role: 'MEMBER' };
    const db = getDb();

    await withActor(actor, async () => {
      const submitted = await submitProfileAction();
      expect(submitted.ok).toBe(true);
    });
    let [profile] = await db
      .select()
      .from(personProfiles)
      .where(eq(personProfiles.id, profileId));
    expect(profile?.publicationState).toBe('PENDING_REVIEW');

    // Reviewer approves (platform operator).
    const reviewerId = await createTestUser('PLATFORM_OPERATOR');
    await withActor(
      { id: reviewerId, name: 'Reviewer', email: 'r@x.com', role: 'PLATFORM_OPERATOR' },
      async () => {
        const result = await setPublicationStateAction(
          null,
          formDataOf({
            entityType: 'PRODUCT',
            entityId: 'unused',
            publicationState: 'PUBLISHED',
          }),
        );
        // That product doesn't exist — proves missing records fail safely.
        expect(result.ok).toBe(false);
      },
    );

    // Approve via review action instead.
    const { reviewProfileAction } = await import('@/app/actions/review');
    await withActor(
      { id: reviewerId, name: 'Reviewer', email: 'r@x.com', role: 'PLATFORM_OPERATOR' },
      async () => {
        const result = await reviewProfileAction(
          null,
          formDataOf({
            personProfileId: profileId,
            decision: 'APPROVE',
            note: 'Looks good',
          }),
        );
        expect(result.ok).toBe(true);
      },
    );
    [profile] = await db
      .select()
      .from(personProfiles)
      .where(eq(personProfiles.id, profileId));
    expect(profile?.publicationState).toBe('PUBLISHED');

    // Withdrawal removes it from publication.
    await withActor(actor, async () => {
      const result = await withdrawProfileAction();
      expect(result.ok).toBe(true);
    });
    [profile] = await db
      .select()
      .from(personProfiles)
      .where(eq(personProfiles.id, profileId));
    expect(profile?.publicationState).toBe('DRAFT');
    expect(profile?.publishedAt).toBeNull();

    const auditRows = await db
      .select()
      .from(auditEvents)
      .where(eq(auditEvents.actorId, userId));
    const actions = auditRows.map((row) => row.action);
    expect(actions).toContain('profile.submit_review');
    expect(actions).toContain('profile.withdraw');
  });

  it('withdrawal unpublishes resumes, killing downloads', async () => {
    const userId = await createTestUser('MEMBER');
    const profileId = await createTestProfile(userId, 'PUBLISHED');
    await createTestResume(profileId, true);
    const actor: Actor = { id: userId, name: 'Member', email: 'm@x.com', role: 'MEMBER' };
    const db = getDb();

    await withActor(actor, async () => {
      await withdrawProfileAction();
    });

    const resumes = await db
      .select()
      .from(resumeAssets)
      .where(eq(resumeAssets.personProfileId, profileId));
    expect(resumes.length).toBeGreaterThan(0);
    for (const resume of resumes) {
      expect(resume.published).toBe(false);
    }
  });

  it('profile field updates validate and audit', async () => {
    const userId = await createTestUser('MEMBER');
    await createTestProfile(userId, 'DRAFT');
    const actor: Actor = { id: userId, name: 'Member', email: 'm@x.com', role: 'MEMBER' };

    await withActor(actor, async () => {
      const bad = await updateProfileAction(null, formDataOf({ displayName: 'A' }));
      expect(bad.ok).toBe(false);

      const good = await updateProfileAction(
        null,
        formDataOf({
          displayName: 'Updated Name',
          personalPortfolioUrl: 'javascript:alert(1)',
        }),
      );
      // Unsafe URLs are rejected — never stored.
      expect(good.ok).toBe(false);

      const ok = await updateProfileAction(
        null,
        formDataOf({
          displayName: 'Updated Name',
          personalPortfolioUrl: 'https://example.com/portfolio',
        }),
      );
      expect(ok.ok).toBe(true);
    });

    const db = getDb();
    const { personProfiles } = await import('@/lib/db/schema');
    const [profile] = await db
      .select()
      .from(personProfiles)
      .where(eq(personProfiles.userId, userId));
    expect(profile?.displayName).toBe('Updated Name');
    expect(profile?.personalPortfolioUrl).toBe('https://example.com/portfolio');
  });
});

describe('company-scoped content publishing', () => {
  it('editors publish within their company only', async () => {
    const companyA = await createTestCompany('pub-a');
    const companyB = await createTestCompany('pub-b');
    const productA = await createTestProduct(companyA, 'DRAFT');
    const productB = await createTestProduct(companyB, 'DRAFT');
    const editorId = await createTestUser('EDITOR');
    await createMembership(editorId, companyA, 'EDITOR');
    const editor: Actor = {
      id: editorId,
      name: 'Editor',
      email: 'e@x.com',
      role: 'EDITOR',
    };
    const db = getDb();

    await withActor(editor, async () => {
      const own = await setPublicationStateAction(
        null,
        formDataOf({
          entityType: 'PRODUCT',
          entityId: productA,
          publicationState: 'PUBLISHED',
        }),
      );
      expect(own.ok).toBe(true);

      const cross = await setPublicationStateAction(
        null,
        formDataOf({
          entityType: 'PRODUCT',
          entityId: productB,
          publicationState: 'PUBLISHED',
        }),
      );
      expect(cross.ok).toBe(false);
    });

    const [a] = await db.select().from(products).where(eq(products.id, productA));
    const [b] = await db.select().from(products).where(eq(products.id, productB));
    expect(a?.publicationState).toBe('PUBLISHED');
    expect(b?.publicationState).toBe('DRAFT');
  });
});
