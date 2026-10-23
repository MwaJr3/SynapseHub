import type { JSX } from 'react';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { formatDate } from '@/lib/format';
import { SuspendUserButton } from '@/components/server-forms';
import { Avatar, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Users' };

export default async function AdminUsersPage(): Promise<JSX.Element> {
  const db = getDb();
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <ul className="space-y-2">
        {rows.map((user) => (
          <li key={user.id} className="card flex flex-wrap items-center gap-3">
            <Avatar name={user.name} />
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-ink-subtle">
                {user.email} · joined {formatDate(user.createdAt)}
              </p>
            </div>
            <Badge tone={user.role === 'ADMIN' ? 'info' : 'neutral'}>{user.role}</Badge>
            {user.suspendedAt != null ? <Badge tone="bad">Suspended</Badge> : null}
            <span className="ml-auto">
              <SuspendUserButton userId={user.id} suspended={user.suspendedAt != null} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
