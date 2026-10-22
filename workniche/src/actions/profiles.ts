'use server';

/** Seeker profile + resume management. Resumes are private by construction. */
import { and, eq, isNull } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { profiles, resumes } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import {
  profileSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';
import {
  getStorage,
  isAllowedResumeType,
  MAX_RESUME_BYTES,
} from '@/lib/storage';

export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, actor.id))
    .limit(1);

  const values = {
    headline: parsed.data.headline,
    bio: parsed.data.bio,
    location: parsed.data.location,
    remotePreference: parsed.data.remotePreference,
    yearsExperience: parsed.data.yearsExperience,
    skills: parsed.data.skills,
    technologies: parsed.data.technologies,
    education: parsed.data.education,
    certifications: parsed.data.certifications,
    portfolioUrl: parsed.data.portfolioUrl,
    githubUrl: parsed.data.githubUrl,
    linkedinUrl: parsed.data.linkedinUrl,
    websiteUrl: parsed.data.websiteUrl,
    availability: parsed.data.availability,
    preferredEmploymentTypes: parsed.data.preferredEmploymentTypes,
    salaryExpectationMin: parsed.data.salaryExpectationMin,
    salaryExpectationMax: parsed.data.salaryExpectationMax,
    salaryCurrency: parsed.data.salaryCurrency,
    visibility: parsed.data.visibility,
    showEmail: parsed.data.showEmail,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(profiles).set(values).where(eq(profiles.id, existing.id));
  } else {
    await db.insert(profiles).values({ ...values, userId: actor.id });
  }
  await audit({
    actorId: actor.id,
    action: 'profile.save',
    resourceType: 'profile',
    resourceId: actor.id,
  });
  return { ok: true };
}

export async function uploadResumeAction(
  formData: FormData,
): Promise<ActionResult & { resumeId?: string }> {
  const actor = await requireUser();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return { ok: false, error: 'Choose a file to upload.' };
  }
  if (file.size === 0) return { ok: false, error: 'The file is empty.' };
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, error: 'Resumes must be 5 MB or smaller.' };
  }
  const mime = file.type || 'application/octet-stream';
  if (!isAllowedResumeType(mime)) {
    return { ok: false, error: 'Upload a PDF, DOC or DOCX file.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await getStorage().put(file.name, bytes);
  const db = getDb();

  // First resume becomes the default automatically.
  const existing = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(and(eq(resumes.userId, actor.id), isNull(resumes.deletedAt)))
    .limit(1);

  const [row] = await db
    .insert(resumes)
    .values({
      userId: actor.id,
      filename: file.name,
      storageKey: stored.key,
      mimeType: mime,
      sizeBytes: stored.size,
      isDefault: existing.length === 0,
    })
    .returning({ id: resumes.id });

  await audit({
    actorId: actor.id,
    action: 'resume.upload',
    resourceType: 'resume',
    resourceId: row?.id ?? null,
  });
  return { ok: true, resumeId: row?.id };
}

export async function deleteResumeAction(resumeId: string): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, actor.id)))
    .limit(1);
  if (!row || row.deletedAt != null) {
    return { ok: false, error: 'Resume not found.' };
  }
  // Soft delete: applications that reference it keep working.
  await db
    .update(resumes)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(eq(resumes.id, resumeId));
  await audit({
    actorId: actor.id,
    action: 'resume.delete',
    resourceType: 'resume',
    resourceId: resumeId,
  });
  return { ok: true };
}

export async function setDefaultResumeAction(resumeId: string): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, resumeId), eq(resumes.userId, actor.id), isNull(resumes.deletedAt)))
    .limit(1);
  if (!row) return { ok: false, error: 'Resume not found.' };
  await db
    .update(resumes)
    .set({ isDefault: false })
    .where(eq(resumes.userId, actor.id));
  await db.update(resumes).set({ isDefault: true }).where(eq(resumes.id, resumeId));
  return { ok: true };
}
