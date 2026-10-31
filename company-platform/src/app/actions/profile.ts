'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';

import { getSessionActor } from '@/lib/auth';
import {
  AuthorizationError,
  requireOwnProfile,
  requireActor,
} from '@/lib/authorization';
import { getDb } from '@/lib/db';
import {
  auditEvents,
  certifications,
  educationEntries,
  experienceEntries,
  personProfiles,
  portfolioLinks,
  resumeAssets,
  users,
} from '@/lib/db/schema';
import { getStorage, looksLikePdf, MAX_RESUME_BYTES } from '@/lib/storage';
import {
  certificationSchema,
  educationEntrySchema,
  experienceEntrySchema,
  portfolioLinkSchema,
  profileSchema,
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

export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const parsed = profileSchema.safeParse({
      displayName: formData.get('displayName'),
      pronouns: formData.get('pronouns') ?? '',
      headline: formData.get('headline') ?? '',
      shortBio: formData.get('shortBio') ?? '',
      longBio: formData.get('longBio') ?? '',
      technicalSkills: splitList(formData.get('technicalSkills')),
      softSkills: splitList(formData.get('softSkills')),
      domains: splitList(formData.get('domains')),
      personalPortfolioUrl: formData.get('personalPortfolioUrl') ?? '',
      githubUrl: formData.get('githubUrl') ?? '',
      professionalProfileUrl: formData.get('professionalProfileUrl') ?? '',
      contactVisible: formData.get('contactVisible') === 'on',
    });
    if (!parsed.success) {
      return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
    }
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    await db
      .update(personProfiles)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(personProfiles.id, profile.id));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'profile.update',
      resourceType: 'person_profile',
      resourceId: profile.id,
    });
    revalidatePath('/member/profile');
    revalidatePath('/member/profile/preview');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

function splitList(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

type EntryKind = 'education' | 'experience' | 'certification' | 'link';

export async function addEntryAction(
  kind: EntryKind,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    const common = {
      personProfileId: profile.id,
      position: Date.now() % 100000,
    };
    if (kind === 'education') {
      const parsed = educationEntrySchema.safeParse({
        institution: formData.get('institution'),
        qualification: formData.get('qualification'),
        subject: formData.get('subject') ?? '',
        period: formData.get('period') ?? '',
        description: formData.get('description') ?? '',
      });
      if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
      await db.insert(educationEntries).values({ id: crypto.randomUUID(), ...common, ...parsed.data });
    } else if (kind === 'experience') {
      const parsed = experienceEntrySchema.safeParse({
        role: formData.get('role'),
        organization: formData.get('organization'),
        period: formData.get('period') ?? '',
        description: formData.get('description') ?? '',
        linkUrl: formData.get('linkUrl') ?? '',
      });
      if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
      await db.insert(experienceEntries).values({ id: crypto.randomUUID(), ...common, ...parsed.data });
    } else if (kind === 'certification') {
      const parsed = certificationSchema.safeParse({
        name: formData.get('name'),
        issuer: formData.get('issuer') ?? '',
        period: formData.get('period') ?? '',
        note: formData.get('note') ?? '',
      });
      if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
      await db.insert(certifications).values({ id: crypto.randomUUID(), ...common, ...parsed.data });
    } else {
      const parsed = portfolioLinkSchema.safeParse({
        label: formData.get('label'),
        url: formData.get('url'),
      });
      if (!parsed.success) return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
      await db.insert(portfolioLinks).values({ id: crypto.randomUUID(), ...common, ...parsed.data });
    }
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: `profile.${kind}_add`,
      resourceType: 'person_profile',
      resourceId: profile.id,
    });
    revalidatePath('/member/profile');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteEntryAction(
  kind: EntryKind,
  entryId: string,
): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    const table =
      kind === 'education'
        ? educationEntries
        : kind === 'experience'
          ? experienceEntries
          : kind === 'certification'
            ? certifications
            : portfolioLinks;
    await db
      .delete(table)
      .where(
        and(
          eq(table.id, entryId),
          eq(table.personProfileId, profile.id),
        ),
      );
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: `profile.${kind}_delete`,
      resourceType: 'person_profile',
      resourceId: entryId,
    });
    revalidatePath('/member/profile');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function uploadResumeAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    const file = formData.get('resume');
    if (!(file instanceof File)) {
      return { ok: false, error: 'Choose a PDF file to upload.' };
    }
    if (file.size > MAX_RESUME_BYTES) {
      // Read off the constant so the message cannot drift from the check.
      return {
        ok: false,
        error: `Resume files must be ${Math.floor(MAX_RESUME_BYTES / (1024 * 1024))} MB or smaller.`,
      };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!looksLikePdf(bytes)) {
      return { ok: false, error: 'Resume files must be valid PDF documents.' };
    }
    const storage = getStorage();
    const stored = await storage.put(file.name, bytes);
    await db.insert(resumeAssets).values({
      id: crypto.randomUUID(),
      personProfileId: profile.id,
      filename: file.name,
      storageKey: stored.key,
      sizeBytes: stored.size,
      published: false,
    });
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'resume.upload',
      resourceType: 'resume_asset',
      resourceId: profile.id,
      metadata: { filename: file.name, size: stored.size },
    });
    revalidatePath('/member/resume');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function setResumePublishedAction(
  resumeId: string,
  published: boolean,
): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    const [updated] = await db
      .update(resumeAssets)
      .set({ published })
      .where(
        and(
          eq(resumeAssets.id, resumeId),
          eq(resumeAssets.personProfileId, profile.id),
        ),
      )
      .returning({ id: resumeAssets.id });
    if (!updated) return { ok: false, error: 'Resume not found.' };
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: published ? 'resume.publish' : 'resume.unpublish',
      resourceType: 'resume_asset',
      resourceId: updated.id,
    });
    revalidatePath('/member/resume');
    revalidatePath('/member/publication-status');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function deleteResumeAction(resumeId: string): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    const [row] = await db
      .select()
      .from(resumeAssets)
      .where(
        and(
          eq(resumeAssets.id, resumeId),
          eq(resumeAssets.personProfileId, profile.id),
        ),
      )
      .limit(1);
    if (!row) return { ok: false, error: 'Resume not found.' };
    await getStorage().remove(row.storageKey);
    await db.delete(resumeAssets).where(eq(resumeAssets.id, row.id));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'resume.delete',
      resourceType: 'resume_asset',
      resourceId: row.id,
    });
    revalidatePath('/member/resume');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function submitProfileAction(): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    if (profile.publicationState === 'PUBLISHED') {
      return {
        ok: false,
        error: 'Your profile is published. Withdraw it first to submit new changes.',
      };
    }
    await db
      .update(personProfiles)
      .set({
        publicationState: 'PENDING_REVIEW',
        lastSubmittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(personProfiles.id, profile.id));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'profile.submit_review',
      resourceType: 'person_profile',
      resourceId: profile.id,
    });
    revalidatePath('/member/publication-status');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function withdrawProfileAction(): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const db = getDb();
    const profile = await requireOwnProfile(actor, db);
    await db
      .update(personProfiles)
      .set({
        publicationState: 'DRAFT',
        publishedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(personProfiles.id, profile.id));
    // Withdrawal unpublishes any resume download immediately.
    await db
      .update(resumeAssets)
      .set({ published: false })
      .where(eq(resumeAssets.personProfileId, profile.id));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'profile.withdraw',
      resourceType: 'person_profile',
      resourceId: profile.id,
    });
    revalidatePath('/member/publication-status');
    revalidatePath('/member/resume');
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateAccountAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actor = requireActor(await getSessionActor());
    const name = String(formData.get('name') ?? '').trim();
    if (name.length < 2) return { ok: false, error: 'Name is required.' };
    const db = getDb();
    await db.update(users).set({ name, updatedAt: new Date() }).where(eq(users.id, actor.id));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'account.update',
      resourceType: 'user',
      resourceId: actor.id,
    });
    return { ok: true };
  } catch (error) {
    return errorResult(error);
  }
}
