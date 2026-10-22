/** Audit trail: who did what to which record, append-only. */
import { desc, eq } from 'drizzle-orm';

import { getDb, type Db } from '@/lib/db';
import { auditEvents } from '@/lib/db/schema';

export interface AuditInput {
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function audit(
  input: AuditInput,
  db: Db = getDb(),
): Promise<void> {
  await db.insert(auditEvents).values({
    actorId: input.actorId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata ?? {},
  });
}

export interface AuditRow {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export async function listAuditEvents(
  limit = 100,
  db: Db = getDb(),
): Promise<AuditRow[]> {
  const rows = await db
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    metadata: row.metadata ?? {},
    createdAt: row.createdAt,
  }));
}
