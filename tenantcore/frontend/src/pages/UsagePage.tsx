import { useQuery } from '@tanstack/react-query';
import { Activity, Database, FolderKanban, HardDrive, Users } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { api, formatNumber } from '../services/api';
import type { Usage } from '../types';
import { Badge, Card, ErrorState, LoadingCards, LoadingRows, PageHeader } from '../components/ui';

export default function UsagePage() {
  const { selectedTenantId } = useAuth();
  const query = useQuery({ queryKey: ['usage', selectedTenantId], queryFn: () => api<Usage>('/usage'), enabled: Boolean(selectedTenantId, ) });
  const data = query.data;
  const maxRequests = Math.max(...(data?.daily.map(day => Number(day.api_requests || 0)) || [1]), 1);
  return <div><PageHeader eyebrow="Metering / 30 days" title="Tenant usage" description="Daily metering and current resource gauges are isolated by the same RLS boundary. Billing remains a separate future integration." action={<Badge tone="blue">UTC daily periods</Badge>} />
    {query.isLoading ? <LoadingCards /> : query.error ? <ErrorState error={query.error} onRetry={() => query.refetch()} /> : data && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
        { label: 'API requests', value: data.totals.api_requests || 0, icon: Activity, note: 'Metered successful tenant contexts' },
        { label: 'Active members', value: data.current.active_users || 0, icon: Users, note: 'Current active memberships' },
        { label: 'Projects', value: data.current.projects || 0, icon: FolderKanban, note: `${data.current.open_tasks || 0} open tasks` },
        { label: 'Stored content', value: `${formatNumber(data.current.storage_bytes || 0)} B`, icon: HardDrive, note: 'Document content only' },
      ].map(card => <Card key={card.label} className="p-5"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{card.label}</p><div className="rounded-xl bg-brand-50 p-2 text-brand-600"><card.icon size={18} /></div></div><p className="mt-4 text-3xl font-bold tracking-tight text-ink-950">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p><p className="mt-2 text-xs text-slate-400">{card.note}</p></Card>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]"><Card className="p-6"><div className="mb-8"><h2 className="font-bold text-ink-950">Daily API activity</h2><p className="mt-1 text-xs text-slate-400">{data.period_start} through {data.period_end}</p></div>{data.daily.length ? <div className="flex h-56 items-end gap-2">{data.daily.map(day => <div key={String(day.date)} className="group flex h-full flex-1 flex-col justify-end gap-2"><div className="relative flex flex-1 items-end justify-center"><div className="w-full max-w-8 rounded-t-lg bg-brand-500/80 transition group-hover:bg-brand-600" style={{ height: `${Math.max(Number(day.api_requests || 0) / maxRequests * 100, 3)}%` }} /><span className="absolute -top-7 hidden rounded-md bg-ink-950 px-2 py-1 text-[10px] text-white group-hover:block">{String(day.api_requests || 0)}</span></div><span className="text-center text-[9px] text-slate-400">{String(day.date).slice(5)}</span></div>)}</div> : <div className="grid h-48 place-items-center text-sm text-slate-400">No metered requests in this period.</div>}</Card>
      <Card className="p-6"><div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-mint-50 p-2.5 text-mint-500"><Database size={20} /></div><div><h2 className="font-bold text-ink-950">Isolation-preserving model</h2><p className="text-xs text-slate-400">Metric keys carry tenant_id</p></div></div><dl className="space-y-4">{Object.entries({ background_jobs: 'Background jobs', ...data.totals }).slice(0, 5).map(([metric, value]) => <div key={metric} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0"><dt className="text-sm capitalize text-slate-500">{metric.replaceAll('_', ' ')}</dt><dd className="font-mono text-sm font-semibold text-ink-900">{formatNumber(Number(value))}</dd></div>)}</dl><p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">A future billing service can consume these metrics without receiving permission to bypass tenant policies.</p></Card></div>
      {query.isRefetching && <div className="mt-4"><LoadingRows rows={1} /></div>}
    </>}
  </div>;
}
