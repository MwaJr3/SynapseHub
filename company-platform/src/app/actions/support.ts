'use server';

/**
 * Support-inbox actions.
 *
 * A person may only move a request that belongs to a company they hold an
 * editorial role in — the same boundary as every other admin action. Every change
 * is written to the audit log, because "who closed this" is the sort of question
 * that gets asked later.
 */
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { getSessionActor } from '@/lib/auth';
import {
  AuthorizationError,
  getCompanyAuthorities,
  type CompanyAuthority,
} from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { auditEvents, supportRequests } from '@/lib/db/schema';
import type { ActionResult } from '@/lib/validation';

const STATUSES = ['OPEN', 'ACKED', 'CLOSED'] as const;
type Status = (typeof STATUSES)[number];

export async function setSupportStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const actor = await getSessionActor();
  if (!actor) return { ok: false, error: 'You must be signed in.' };

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') as Status;
  if (!STATUSES.includes(status)) return { ok: false, error: 'Unknown status.' };

  const db = getDb();
  try {
    const [request] = await db
      .select({ id: supportRequests.id, companyId: supportRequests.companyId, reference: supportRequests.reference })
      .from(supportRequests)
      .where(eq(supportRequests.id, id))
      .limit(1);
    if (!request) return { ok: false, error: 'No such request.' };

    const authorities: CompanyAuthority[] = await getCompanyAuthorities(actor.id, db);
    const scoped = authorities.some(
      (entry) => entry.companyId === request.companyId && entry.role !== 'MEMBER',
    );
    const platform = actor.role === 'ADMIN' || actor.role === 'PLATFORM_OPERATOR';
    if (!scoped && !platform) {
      return { ok: false, error: 'You do not hold a role for that company.' };
    }

    await db
      .update(supportRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(supportRequests.id, id));
    await db.insert(auditEvents).values({
      actorId: actor.id,
      action: 'SUPPORT_STATUS_CHANGED',
      resourceType: 'SUPPORT_REQUEST',
      resourceId: id,
      metadata: { reference: request.reference, status },
    });
    revalidatePath('/admin/support');
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthorizationError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: 'Something went wrong. Please try again.' };
  }
}
