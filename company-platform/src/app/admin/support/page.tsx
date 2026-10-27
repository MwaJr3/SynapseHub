import { Badge, EmptyState, Section } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { getCompanyAuthorities, isPlatformOperator } from '@/lib/authorization';
import { getDb } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { listSupportRequests } from '@/lib/support/requests';
import { SupportStatusForm } from './status-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Support inbox', robots: { index: false, follow: false } };

export default async function AdminSupportPage() {
  const actor = await requireUser();
  const db = getDb();
  const authorities = await getCompanyAuthorities(actor.id, db);
  const companyIds = authorities.filter((entry) => entry.role !== 'MEMBER').map((entry) => entry.companyId);

  // A platform operator sees every queue; an editor sees only their company's.
  const platform = isPlatformOperator(actor) || actor.role === 'ADMIN';
  const scopedIds =
    platform && companyIds.length === 0
      ? (await db.select({ id: companies.id }).from(companies)).map((row) => row.id)
      : companyIds;

  const requests = await listSupportRequests(db, scopedIds);

  return (
    <Section title="Support inbox">
      <p className="text-sm text-muted">
        Requests raised from the two assistants. Each one carries the conversation that led to it. This inbox is
        read-and-triage only: nothing is emailed from here, so the page never claims a reply was sent.
      </p>

      {requests.length === 0 ? (
        <div className="mt-4">
          <EmptyState>No support requests yet.</EmptyState>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {requests.map((request) => (
            <article key={request.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  {request.reference} · {request.name}
                  <span className="ml-2 font-normal text-muted">{request.companyName}</span>
                </h2>
                <Badge tone={request.status === 'OPEN' ? 'accent' : 'neutral'}>{request.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">
                {request.email} · from the {request.assistant} assistant · {request.turns} message
                {request.turns === 1 ? '' : 's'} · {request.createdAt.toISOString().slice(0, 16).replace('T', ' ')} UTC
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm">{request.message}</p>
              <div className="mt-3">
                <SupportStatusForm id={request.id} status={request.status} reference={request.reference} />
              </div>
            </article>
          ))}
        </div>
      )}
    </Section>
  );
}
