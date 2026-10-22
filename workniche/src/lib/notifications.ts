/**
 * In-app notifications. A dedupe key makes retried workers safe: the same
 * (alert, job) or (application, deadline day) pair can only ever produce one
 * notification.
 */
import { and, desc, eq, sql } from 'drizzle-orm';

import { getDb, rowsOf, type Db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';

export interface NotifyInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  dedupeKey?: string;
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth += 1) {
    const code = (current as { code?: string }).code;
    if (code === '23505') return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function notify(
  input: NotifyInput,
  db: Db = getDb(),
): Promise<boolean> {
  if (input.dedupeKey) {
    try {
      const inserted = await db
        .insert(notifications)
        .values({
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body ?? '',
          link: input.link ?? '',
          dedupeKey: input.dedupeKey,
        })
        .onConflictDoNothing()
        .returning({ id: notifications.id });
      // Zero rows means the dedupe key already existed.
      return inserted.length > 0;
    } catch (error) {
      // Unwrap driver-wrapped unique violations (DrizzleQueryError → cause).
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? '',
    link: input.link ?? '',
    dedupeKey: null,
  });
  return true;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  readAt: Date | null;
  createdAt: Date;
}

export async function listNotifications(
  userId: string,
  limit = 50,
  db: Db = getDb(),
): Promise<NotificationRow[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    link: row.link ?? '',
    readAt: row.readAt,
    createdAt: row.createdAt,
  }));
}

export async function unreadCount(userId: string, db: Db = getDb()): Promise<number> {
  const result: unknown = await db.execute(
    sql`SELECT count(*)::int AS n FROM notifications WHERE user_id = ${userId} AND read_at IS NULL`,
  );
  const rows = rowsOf(result);
  return Number(rows[0]?.n ?? 0);
}

export async function markRead(
  notificationId: string,
  userId: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string, db: Db = getDb()): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(eq(notifications.userId, userId));
}
