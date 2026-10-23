'use server';

/** Public reporting action: anyone signed in can flag a job or company. */
import { getDb } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { reportSchema, zodFieldErrors, type ActionResult } from '@/lib/validation';

export async function createReportAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodFieldErrors(parsed.error) };
  }
  const db = getDb();
  await db.insert(reports).values({
    reporterId: actor.id,
    jobId: parsed.data.jobId,
    organizationId: parsed.data.organizationId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    status: 'OPEN',
  });
  await audit({
    actorId: actor.id,
    action: 'report.create',
    resourceType: 'report',
    resourceId: null,
    metadata: { reason: parsed.data.reason },
  });
  return { ok: true };
}
