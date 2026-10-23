/**
 * Database-backed actor lookup. Lives outside the auth module root so tests
 * can exercise the real disabled-account behaviour without loading next-auth.
 */
import { eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

export interface LookupActor {
  id: string;
  name: string;
  email: string;
  role: 'MEMBER' | 'EDITOR' | 'ADMIN' | 'PLATFORM_OPERATOR';
}

export async function lookupActor(userId: string): Promise<LookupActor | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      disabledAt: users.disabledAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!row || row.disabledAt != null) return null;
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}
