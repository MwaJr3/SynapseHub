import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getCompanyAuthorities } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { companies, products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { PublishToggle } from '../publish-toggle';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const actor = await requireUser();
  const db = getDb();
  const authorities = await getCompanyAuthorities(actor.id, db);
  const editableCompanyIds = authorities
    .filter((entry) => entry.role !== 'MEMBER')
    .map((entry) => entry.companyId);

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      publicationState: products.publicationState,
      status: products.status,
      companyId: products.companyId,
      companyName: companies.name,
    })
    .from(products)
    .innerJoin(companies, eq(companies.id, products.companyId));

  return (
    <Section title="Products">
      {rows.length === 0 ? (
        <EmptyState>No products in the catalogue.</EmptyState>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Company</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Publication</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const editable = editableCompanyIds.includes(row.companyId);
                return (
                  <tr key={row.id} className="border-b border-line">
                    <td className="py-2 pr-4">
                      {row.name}
                      <span className="block text-xs text-muted">{row.slug}</span>
                    </td>
                    <td className="py-2 pr-4">{row.companyName}</td>
                    <td className="py-2 pr-4"><Badge>{row.status}</Badge></td>
                    <td className="py-2 pr-4"><Badge tone="accent">{row.publicationState}</Badge></td>
                    <td className="py-2">
                      {editable ? (
                        <PublishToggle
                          entityType="PRODUCT"
                          entityId={row.id}
                          currentState={row.publicationState}
                          label={row.name}
                        />
                      ) : (
                        <span className="text-xs text-muted">
                          View only — no editorial authority for this company
                        </span>
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
