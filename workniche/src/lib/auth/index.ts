/**
 * Session helpers. Server components call `getSessionActor` / `requireUser`;
 * the Auth.js configuration lives in auth.config.ts (imported by route.ts).
 */
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/config';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import type { Actor } from '@/lib/authorization';

export async function loadActor(userId: string): Promise<Actor | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      suspendedAt: users.suspendedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row || row.suspendedAt != null) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

/** Cached per request: every call in one render shares one lookup. */
export const getSessionActor = cache(async (): Promise<Actor | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return loadActor(userId);
});

/** Pages that require sign-in call this; it redirects instead of throwing. */
export async function requireUser(): Promise<Actor> {
  const actor = await getSessionActor();
  if (!actor) redirect('/login');
  return actor;
}
