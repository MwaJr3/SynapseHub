'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, inArray } from 'drizzle-orm';

import { getSessionActor } from '@/lib/auth';
import {
  AuthorizationError,
  requirePlatformAdmin,
} from '@/lib/authorization';
import { getDb } from '@/lib/db';
import {
  auditEvents,
  publicationReviews,
  personProfiles,
  resumeAssets,
  users,
} from '@/lib/db/schema';
import {
  reviewDecisionSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

function errorResult(error: unknown): ActionResult {
  if (error instanceof AuthorizationError) {
    return { ok: false, error: error.message };
  }
  console.error(error);
  return { ok: false, error: 'Something went wrong. Please try again.' };
}

export async function reviewProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = requirePlatformAdmin(await getSessionActor());
    const parsed = reviewDecisionSchema.safeParse({
      personProfileId: formData.get('personProfileId'),
      decision: formData.get('decision'),
      note: formData.get('note') ?? '',
    });
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
    }
    const db = getDb();
    const { personProfileId, decision, note } = parsed.data;
    const [profile] = await db
      .select()
      .from(personProfiles)
      .where(eq(personProfiles.id, personProfileId))
      .limit(1);
    if (!profile) return { ok: false, error: 'Profile not found.' };

    const nextState =
      decision === 'APPROVE'
        ? 'PUBLISHED'
        : decision === 'UNPUBLISH'
          ? 'UNPUBLISHED'
          : 'REJECTED';

    await db
      .update(personProfiles)
      .set({
        publicationState: nextState,
        reviewerNote: note,
        publishedAt: decision === 'APPROVE' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(personProfiles.id, profile.id));

    if (decision !== 'APPROVE') {
      // Unpublishing or rejecting also disables resume downloads.
      await db
        .update(resumeAssets)
        .set({ published: false })
        .where(eq(resumeAssets.personProfileId, profile.id));
    }

    await db.insert(publicationReviews).values({
      id: crypto.randomUUID(),
      personProfileId: profile.id,
      reviewerId: actor.id,
      decision,
      note,
    });
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: `review.profile_${decision.toLowerCase()}`,
      resourceType: 'person_profile',
      resourceId: profile.id,
      metadata: { note },
    });
    revalidatePath('/admin/review-queue');
    revalidatePath('/people');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function setUserDisabledAction(
  userId: string,
  disabled: boolean,
): Promise<ActionResult> {
  try {
    const actor = requirePlatformAdmin(await getSessionActor());
    if (userId === actor.id) {
      return { ok: false, error: 'You cannot disable your own account.' };
    }
    const db = getDb();
    await db
      .update(users)
      .set({ disabledAt: disabled ? new Date() : null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: disabled ? 'user.disable' : 'user.enable',
      resourceType: 'user',
      resourceId: userId,
    });
    revalidatePath('/admin/people');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function revokePendingSubmissionsAction(): Promise<ActionResult> {
  try {
    const actor = requirePlatformAdmin(await getSessionActor());
    const db = getDb();
    const pending = await db
      .select({ id: personProfiles.id })
      .from(personProfiles)
      .where(eq(personProfiles.publicationState, 'PENDING_REVIEW'));
    if (pending.length === 0) return { ok: true };
    await db
      .update(personProfiles)
      .set({ publicationState: 'DRAFT', updatedAt: new Date() })
      .where(
        inArray(
          personProfiles.id,
          pending.map((row) => row.id),
        ),
      );
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'review.revoke_pending',
      resourceType: 'person_profile',
      metadata: { count: pending.length },
    });
    revalidatePath('/admin/review-queue');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function getPendingReviewCount(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: personProfiles.id })
    .from(personProfiles)
    .where(eq(personProfiles.publicationState, 'PENDING_REVIEW'));
  return rows.length;
}

export { and };
