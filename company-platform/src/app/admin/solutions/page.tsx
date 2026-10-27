import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getCompanyAuthorities } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { companies, solutionAreas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PublishToggle } from '../publish-toggle';

export const dynamic = 'force-dynamic';

export default async function AdminSolutionsPage() {
  const actor = await requireUser();
  const db = getDb();
  const authorities = await getCompanyAuthorities(actor.id, db);
  const editableCompanyIds = authorities
    .filter((entry) => entry.role !== 'MEMBER')
    .map((entry) => entry.companyId);

  const rows = await db
    .select({
      id: solutionAreas.id,
      title: solutionAreas.title,
      slug: solutionAreas.slug,
      publicationState: solutionAreas.publicationState,
      companyId: solutionAreas.companyId,
      companyName: companies.name,
    })
    .from(solutionAreas)
    .innerJoin(companies, eq(companies.id, solutionAreas.companyId));

  return (
    <Section title="Solution areas">
      {rows.length === 0 ? (
        <EmptyState>No solution areas yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-4">Solution</th>
                <th scope="col" className="py-2 pr-4">Company</th>
                <th scope="col" className="py-2 pr-4">Publication</th>
                <th scope="col" className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const editable = editableCompanyIds.includes(row.companyId);
                return (
                  <tr key={row.id} className="border-b border-line">
                    <td className="py-2 pr-4">
                      {row.title}
                      <span className="block text-xs text-muted">{row.slug}</span>
                    </td>
                    <td className="py-2 pr-4">{row.companyName}</td>
                    <td className="py-2 pr-4"><Badge tone="accent">{row.publicationState}</Badge></td>
                    <td className="py-2">
                      {editable ? (
                        <PublishToggle
                          entityType="SOLUTION"
                          entityId={row.id}
                          currentState={row.publicationState}
                          label={row.title}
                        />
                      ) : (
                        <span className="text-xs text-muted">View only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
