import { useState } from 'react';
import { usePageParam } from '../hooks/usePageParam';
import { useQuery } from '@tanstack/react-query';
import { FileClock, LockKeyhole } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { api, formatDate } from '../services/api';
import type { AuditEvent, Page } from '../types';
import { Badge, Card, EmptyState, ErrorState, LoadingRows, PageHeader, Pagination } from '../components/ui';

export default function AuditPage() {
  const { selectedTenantId } = useAuth();
  const [page, setPage] = usePageParam();
  const [action, setAction] = useState('');
  const query = useQuery({ queryKey: ['audit', selectedTenantId, page, action], queryFn: () => api<Page<AuditEvent>>(`/audit-events?page=${page}&page_size=30&action=${encodeURIComponent(action)}`), enabled: Boolean(selectedTenantId) });
  return <div><PageHeader eyebrow="Security / evidence" title="Audit trail" description="Security-sensitive events are written in the same transaction as the mutation. Update and delete privileges are revoked from the runtime role." action={<Badge tone="green"><LockKeyhole size={12} /> Append only</Badge>} />
    <div className="mb-5 max-w-sm"><label className="label">Filter by exact action</label><input className="input" placeholder="e.g. project.created" value={action} onChange={event => { setAction(event.target.value); setPage(1); }} /></div>
    {query.isLoading ? <LoadingRows /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : query.data && <><Card className="overflow-hidden">{query.data.items.length ? <div className="divide-y divide-slate-100">{query.data.items.map(event => <div key={event.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><FileClock size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-semibold text-ink-900">{event.action}</p><Badge>{event.resource_type}</Badge></div><p className="mt-1.5 text-xs text-slate-500">{formatDate(event.created_at)} · Actor {event.actor_user_id?.slice(0, 8) || 'system'} · Resource {event.resource_id?.slice(0, 8) || '—'}</p>{Object.keys(event.event_metadata).length > 0 && <code className="mt-2 block max-w-full overflow-x-auto rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">{JSON.stringify(event.event_metadata)}</code>}</div><span className="font-mono text-[10px] text-slate-500">#{event.id.slice(0, 8)}</span></div>)}</div> : <EmptyState title="No audit events found" description="Events appear after tenant administration or resource mutations. Try clearing the action filter." />}</Card><Pagination page={page} pages={query.data.meta.pages} onPage={setPage} /></>}
  </div>;
}
