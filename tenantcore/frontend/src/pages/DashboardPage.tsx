import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, CheckCircle2, ClipboardList, FolderKanban, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/auth-context';
import { api, formatDate, formatNumber } from '../services/api';
import type { Dashboard } from '../types';
import { Badge, Card, EmptyState, ErrorState, LoadingCards, LoadingRows, PageHeader, StatusBadge } from '../components/ui';

export default function DashboardPage() {
  const { selectedTenantId, currentMembership, user } = useAuth();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ['dashboard', selectedTenantId], queryFn: () => api<Dashboard>('/dashboard'), enabled: Boolean(selectedTenantId) });
  if (!currentMembership) return <EmptyState title="No tenant workspace selected" description="Platform administrators can manage organizations from Platform control." />;
  return <div>
    <PageHeader eyebrow={`${data?.organization.slug || currentMembership.tenant_slug} / overview`} title={`Good to see you, ${user?.full_name.split(' ')[0]}`} description={`Here’s what’s happening inside ${currentMembership.tenant_name}. Every row below is scoped to your current organization.`} action={<Badge tone="blue"><ShieldCheck size={13} /> RLS context active</Badge>} />
    {isLoading ? <LoadingCards /> : error ? <ErrorState error={error} onRetry={() => refetch()} /> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'Active projects', value: data.counts.active_projects, total: `${data.counts.projects} total`, icon: FolderKanban, color: 'bg-brand-50 text-brand-600', to: '/projects' },
        { label: 'Open tasks', value: data.counts.open_tasks, total: `${data.task_statuses.done || 0} completed`, icon: ClipboardList, color: 'bg-violet-50 text-violet-600', to: '/tasks' },
        { label: 'Active members', value: data.counts.members, total: `${data.counts.teams} delivery teams`, icon: Users, color: 'bg-mint-50 text-mint-500', to: '/members' },
        { label: 'Tenant status', value: data.organization.status, total: `Your role: ${data.role.replaceAll('_', ' ')}`, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', to: '/settings' },
      ].map(card => <Link to={card.to} key={card.label}><Card className="group h-full p-5 transition hover:-translate-y-0.5 hover:border-brand-100"><div className="flex items-start justify-between"><div className={`rounded-xl p-2.5 ${card.color}`}><card.icon size={20} /></div><ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-brand-500" /></div><p className="mt-5 text-3xl font-bold capitalize tracking-tight text-ink-950">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p><p className="mt-1 text-sm font-medium text-slate-600">{card.label}</p><p className="mt-1 text-xs text-slate-400">{card.total}</p></Card></Link>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6"><div className="mb-6 flex items-center justify-between"><div><h2 className="font-bold text-ink-950">Task distribution</h2><p className="mt-1 text-xs text-slate-400">Current tenant workload by state</p></div><Activity size={18} className="text-slate-400" /></div><div className="space-y-5">{['todo', 'in_progress', 'blocked', 'done'].map(status => { const count = data.task_statuses[status] || 0; const total = Math.max(Object.values(data.task_statuses).reduce((a, b) => a + b, 0), 1); return <div key={status}><div className="mb-2 flex items-center justify-between text-sm"><StatusBadge status={status} /><span className="font-semibold text-slate-600">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${status === 'done' ? 'bg-emerald-500' : status === 'blocked' ? 'bg-rose-400' : 'bg-brand-500'}`} style={{ width: `${Math.max(count / total * 100, count ? 5 : 0)}%` }} /></div></div>; })}</div></Card>
        <Card className="overflow-hidden"><div className="border-b border-slate-100 px-6 py-5"><h2 className="font-bold text-ink-950">Recent activity</h2><p className="mt-1 text-xs text-slate-400">Tenant-bound audit events</p></div><div className="divide-y divide-slate-100 px-6">{data.recent_events.length ? data.recent_events.slice(0, 6).map(event => <div key={event.id} className="flex gap-3 py-4"><div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" /><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-700">{event.action.replaceAll('.', ' · ')}</p><p className="mt-1 text-[11px] text-slate-400">{event.resource_type} · {formatDate(event.created_at)}</p></div></div>) : <p className="py-8 text-center text-sm text-slate-400">No activity recorded yet.</p>}</div></Card>
      </div>
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-5 sm:flex-row sm:items-center"><div className="rounded-xl bg-white p-2.5 text-brand-600 shadow-sm"><ShieldCheck size={20} /></div><div className="flex-1"><p className="text-sm font-semibold text-brand-800">You’re viewing {data.organization.name} only</p><p className="mt-0.5 text-xs leading-5 text-brand-700/70">The API verified your {data.role.replaceAll('_', ' ')} membership before setting a transaction-local tenant context. PostgreSQL policies enforce the final boundary.</p></div><Link to="/isolation" className="text-xs font-bold text-brand-700 hover:underline">Open isolation lab →</Link></div>
    </>}
    {data && isLoading && <LoadingRows />}
  </div>;
}
