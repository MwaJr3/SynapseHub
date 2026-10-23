import { setUserDisabledAction } from '@/app/actions/review';
import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { isPlatformOperator } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { personProfiles, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminPeoplePage() {
  const actor = await requireUser();
  const canManageUsers = isPlatformOperator(actor) || actor.role === 'ADMIN';
  const db = getDb();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      disabledAt: users.disabledAt,
      profileSlug: personProfiles.slug,
      publicationState: personProfiles.publicationState,
    })
    .from(users)
    .leftJoin(personProfiles, eq(personProfiles.userId, users.id));

  return (
    <Section title="Members and profiles">
      {rows.length === 0 ? (
        <EmptyState>No member accounts.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Profile</th>
                <th className="py-2 pr-4">Publication</th>
                <th className="py-2">Account</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-line">
                  <td className="py-2 pr-4">
                    {row.name}
                    <span className="block text-xs text-muted">{row.email}</span>
                  </td>
                  <td className="py-2 pr-4"><Badge>{row.role}</Badge></td>
                  <td className="py-2 pr-4">{row.profileSlug ?? <span className="text-muted">none</span>}</td>
                  <td className="py-2 pr-4">
                    <Badge tone="accent">{row.publicationState ?? '—'}</Badge>
                  </td>
                  <td className="py-2">
                    {canManageUsers ? (
                      <form
                        action={async () => {
                          'use server';
                          await setUserDisabledAction(row.id, row.disabledAt == null);
                        }}
                      >
                        <button type="submit" className="btn btn-secondary">
                          {row.disabledAt == null ? 'Disable' : 'Enable'}
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-muted">
                        {row.disabledAt == null ? 'Active' : 'Disabled'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
