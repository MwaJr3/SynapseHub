'use server';

/**
 * Platform administration: moderation queues, verification decisions,
 * suspension, and analytics that only count what the database actually
 * holds — no invented metrics anywhere.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { getDb, rowsOf, type Db } from '@/lib/db';
import {
  auditEvents,
  jobs,
  moderationActions,
  organizations,
  reports,
  users,
} from '@/lib/db/schema';
import { requireUser, getSessionActor } from '@/lib/auth';
import { AuthorizationError, requireAdmin } from '@/lib/authorization';
import { audit } from '@/lib/audit';
import {
  moderationSchema,
  zodFieldErrors,
  type ActionResult,
} from '@/lib/validation';

export async function moderateReportAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  requireAdmin(actor);
  const parsed = moderationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.id, parsed.data.reportId))
    .limit(1);
  if (!report) return { ok: false, error: 'Report not found.' };

  const actionLabels: Record<string, string> = {
    RESOLVE: 'RESOLVED',
    DISMISS: 'DISMISSED',
    SUSPEND_ORG: 'RESOLVED',
    UNSUSPEND_ORG: 'RESOLVED',
    REMOVE_JOB: 'RESOLVED',
  };

  await db
    .update(reports)
    .set({
      status: actionLabels[parsed.data.action] as never,
      resolutionNote: parsed.data.note,
      resolvedAt: new Date(),
    })
    .where(eq(reports.id, report.id));

  if (parsed.data.action === 'REMOVE_JOB' && report.jobId) {
    await db
      .update(jobs)
      .set({ status: 'CLOSED', closedAt: new Date(), updatedAt: new Date() })
      .where(eq(jobs.id, report.jobId));
  }
  if (parsed.data.action === 'SUSPEND_ORG' && report.organizationId) {
    await db
      .update(organizations)
      .set({ verificationStatus: 'SUSPENDED', updatedAt: new Date() })
      .where(eq(organizations.id, report.organizationId));
  }
  if (parsed.data.action === 'UNSUSPEND_ORG' && report.organizationId) {
    await db
      .update(organizations)
      .set({ verificationStatus: 'UNDER_REVIEW', updatedAt: new Date() })
      .where(eq(organizations.id, report.organizationId));
  }

  await db.insert(moderationActions).values({
    adminId: actor.id,
    action: parsed.data.action,
    targetType: 'report',
    targetId: report.id,
    reason: parsed.data.note,
  });
  await audit({
    actorId: actor.id,
    action: `admin.${parsed.data.action.toLowerCase()}`,
    resourceType: 'report',
    resourceId: report.id,
  });
  return { ok: true };
}

export async function setOrganizationVerificationAction(
  organizationId: string,
  status: 'UNVERIFIED' | 'UNDER_REVIEW' | 'VERIFIED' | 'SUSPENDED',
): Promise<ActionResult> {
  const actor = await requireUser();
  requireAdmin(actor);
  const db = getDb();
  await db
    .update(organizations)
    .set({ verificationStatus: status, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId));
  await audit({
    actorId: actor.id,
    action: 'admin.organization_verification',
    resourceType: 'organization',
    resourceId: organizationId,
    metadata: { status },
  });
  return { ok: true };
}

export async function setUserSuspendedAction(
  userId: string,
  suspended: boolean,
): Promise<ActionResult> {
  const actor = await requireUser();
  requireAdmin(actor);
  if (userId === actor.id) {
    return { ok: false, error: 'You cannot suspend your own account.' };
  }
  const db = getDb();
  await db
    .update(users)
    .set({ suspendedAt: suspended ? new Date() : null, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await audit({
    actorId: actor.id,
    action: suspended ? 'admin.user_suspend' : 'admin.user_unsuspend',
    resourceType: 'user',
    resourceId: userId,
  });
  return { ok: true };
}

/** Honest platform analytics: raw counts from the database, nothing else. */
export async function platformAnalytics(
  db: Db = getDb(),
): Promise<{
  usersByRole: Record<string, number>;
  jobsByStatus: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  organizationsByVerification: Record<string, number>;
  openReports: number;
}> {
  const usersByRole: Record<string, number> = {};
  for (const row of rowsOf(
    await db.execute(sql`SELECT role::text AS role, count(*)::int AS n FROM users GROUP BY role`),
  )) {
    usersByRole[String(row.role)] = Number(row.n);
  }
  const jobsByStatus: Record<string, number> = {};
  for (const row of rowsOf(
    await db.execute(sql`SELECT status::text AS status, count(*)::int AS n FROM jobs GROUP BY status`),
  )) {
    jobsByStatus[String(row.status)] = Number(row.n);
  }
  const applicationsByStatus: Record<string, number> = {};
  for (const row of rowsOf(
    await db.execute(sql`SELECT status::text AS status, count(*)::int AS n FROM applications GROUP BY status`),
  )) {
    applicationsByStatus[String(row.status)] = Number(row.n);
  }
  const organizationsByVerification: Record<string, number> = {};
  for (const row of rowsOf(
    await db.execute(
      sql`SELECT verification_status::text AS status, count(*)::int AS n FROM organizations GROUP BY verification_status`,
    ),
  )) {
    organizationsByVerification[String(row.status)] = Number(row.n);
  }
  const openReports = Number(
    rowsOf(
      await db.execute(sql`SELECT count(*)::int AS n FROM reports WHERE status IN ('OPEN', 'UNDER_REVIEW')`),
    )[0]?.n ?? 0,
  );
  return {
    usersByRole,
    jobsByStatus,
    applicationsByStatus,
    organizationsByVerification,
    openReports,
  };
}
