import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getCompanyAuthorities } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { caseStudies, companies, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PublishToggle } from '../publish-toggle';

export const dynamic = 'force-dynamic';

export default async function AdminCaseStudiesPage() {
  const actor = await requireUser();
  const db = getDb();
  const authorities = await getCompanyAuthorities(actor.id, db);
  const editableCompanyIds = authorities
    .filter((entry) => entry.role !== 'MEMBER')
    .map((entry) => entry.companyId);

  const rows = await db
    .select({
      id: caseStudies.id,
      title: caseStudies.title,
      slug: caseStudies.slug,
      publicationState: caseStudies.publicationState,
      productName: products.name,
      companyId: products.companyId,
      companyName: companies.name,
    })
    .from(caseStudies)
    .innerJoin(products, eq(products.id, caseStudies.productId))
    .innerJoin(companies, eq(companies.id, products.companyId));

  return (
    <Section title="Case studies">
      {rows.length === 0 ? (
        <EmptyState>No case studies yet.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-4">Case study</th>
                <th scope="col" className="py-2 pr-4">Product</th>
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
                    <td className="py-2 pr-4">{row.productName}</td>
                    <td className="py-2 pr-4">{row.companyName}</td>
                    <td className="py-2 pr-4"><Badge tone="accent">{row.publicationState}</Badge></td>
                    <td className="py-2">
                      {editable ? (
                        <PublishToggle
                          entityType="CASE_STUDY"
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
