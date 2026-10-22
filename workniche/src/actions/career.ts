'use server';

/**
 * Career actions: job alerts and dashboard mutations that belong to the
 * candidate side. Alert matching itself is server-driven — users describe
 * preferences, never raw SQL.
 */
import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { jobAlerts, notifications, savedJobs } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import {
  jobAlertSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

export async function createJobAlertAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = jobAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [row] = await db
    .insert(jobAlerts)
    .values({
      userId: actor.id,
      keywords: parsed.data.keywords,
      categories: parsed.data.categories,
      skills: parsed.data.skills,
      location: parsed.data.location,
      remoteOnly: parsed.data.remoteOnly,
      salaryMin: parsed.data.salaryMin,
      employmentTypes: parsed.data.employmentTypes,
      enabled: parsed.data.enabled,
    })
    .returning({ id: jobAlerts.id });
  await audit({
    actorId: actor.id,
    action: 'alert.create',
    resourceType: 'job_alert',
    resourceId: row?.id ?? null,
  });
  return { ok: true };
}

export async function updateJobAlertAction(
  alertId: string,
  input: unknown,
): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = jobAlertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [row] = await db
    .select({ id: jobAlerts.id })
    .from(jobAlerts)
    .where(and(eq(jobAlerts.id, alertId), eq(jobAlerts.userId, actor.id)))
    .limit(1);
  if (!row) return { ok: false, error: 'Alert not found.' };
  await db
    .update(jobAlerts)
    .set({
      keywords: parsed.data.keywords,
      categories: parsed.data.categories,
      skills: parsed.data.skills,
      location: parsed.data.location,
      remoteOnly: parsed.data.remoteOnly,
      salaryMin: parsed.data.salaryMin,
      employmentTypes: parsed.data.employmentTypes,
      enabled: parsed.data.enabled,
    })
    .where(eq(jobAlerts.id, alertId));
  return { ok: true };
}

export async function deleteJobAlertAction(alertId: string): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  await db
    .delete(jobAlerts)
    .where(and(eq(jobAlerts.id, alertId), eq(jobAlerts.userId, actor.id)));
  return { ok: true };
}

export async function toggleJobAlertAction(
  alertId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  await db
    .update(jobAlerts)
    .set({ enabled })
    .where(and(eq(jobAlerts.id, alertId), eq(jobAlerts.userId, actor.id)));
  return { ok: true };
}

export async function markNotificationReadAction(
  notificationId: string,
): Promise<ActionResult> {
  const actor = await requireUser();
  const { markRead } = await import('@/lib/notifications');
  await markRead(notificationId, actor.id);
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const actor = await requireUser();
  const { markAllRead } = await import('@/lib/notifications');
  await markAllRead(actor.id);
  return { ok: true };
}

export async function removeSavedJobAction(jobId: string): Promise<ActionResult> {
  const actor = await requireUser();
  const db = getDb();
  await db
    .delete(savedJobs)
    .where(and(eq(savedJobs.userId, actor.id), eq(savedJobs.jobId, jobId)));
  return { ok: true };
}
