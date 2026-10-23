import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { companies, companyMemberships, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function AdminCompaniesPage() {
  await requireUser();
  const db = getDb();
  const rows = await db.select().from(companies);

  return (
    <div className="space-y-4">
      <Section title="Company records">
        {rows.length === 0 ? (
          <EmptyState>No companies configured.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {rows.map((company) => {
              return <CompanyRow key={company.id} company={company} />;
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}

async function CompanyRow({
  company,
}: {
  company: typeof companies.$inferSelect;
}) {
  const db = getDb();
  const memberships = await db
    .select({ name: users.name, email: users.email, role: companyMemberships.role })
    .from(companyMemberships)
    .innerJoin(users, eq(users.id, companyMemberships.userId))
    .where(eq(companyMemberships.companyId, company.id));

  return (
    <li className="rounded-md border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <strong>{company.name}</strong>
        <Badge>{company.slug}</Badge>
        <Badge tone="accent">{company.accentToken === 'vela' ? 'Velaqori tokens' : 'Tamuzi tokens'}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{company.overview}</p>
      <p className="mt-2 text-xs text-muted">{company.workingNameNotice}</p>
      <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Legal name (configurable)</dt>
          <dd>{company.legalName || <span className="text-muted">Not supplied</span>}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Contact email (configurable)</dt>
          <dd>{company.contactEmail || <span className="text-muted">Not configured</span>}</dd>
        </div>
      </dl>
      <div className="mt-3">
        <p className="text-xs text-muted">Explicit memberships</p>
        {memberships.length === 0 ? (
          <p className="text-sm text-muted">No explicit memberships.</p>
        ) : (
          <ul className="mt-1 space-y-0.5 text-sm">
            {memberships.map((member) => (
              <li key={member.email}>
                {member.name} <span className="text-muted">({member.email})</span>{' '}
                <Badge>{member.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
