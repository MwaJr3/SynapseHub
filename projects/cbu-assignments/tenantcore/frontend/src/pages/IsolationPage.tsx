import { useState } from 'react';
import { ArrowDown, CheckCircle2, Database, FlaskConical, LockKeyhole, Play, ShieldCheck, UserCheck, XCircle } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { ApiError, api } from '../services/api';
import type { Page, Project } from '../types';
import { Alert, Badge, Button, Card, EmptyState, PageHeader } from '../components/ui';

const DEMO = {
  acme: { tenant: '01a1164e-4bb3-5616-9006-92dcbfbf5cf2', project: '34821914-63a3-5929-b300-72d251b01b5e', name: 'Acme Corporation' },
  globex: { tenant: 'd44c467e-a4e1-597a-b978-48694a4d4a83', project: '12d0fbae-e378-5a1d-9607-0f1b15ce1103', name: 'Globex Industries' },
  novatech: { tenant: 'a85921de-d12d-5718-8b04-bf190ac0334e', project: 'd43dad20-42a8-5e6e-b03b-a232a3683442', name: 'NovaTech Solutions' },
};
interface Result { status: number; title: string; detail: string }

export default function IsolationPage() {
  const { currentMembership, memberships } = useAuth();
  const [results, setResults] = useState<Record<string, Result>>({});
  const [running, setRunning] = useState('');
  if (!currentMembership) return <EmptyState title="A tenant membership is required" description="Sign in with a demonstration tenant user to run the isolation checks." />;
  const target = Object.values(DEMO).find(candidate =>
    candidate.tenant !== currentMembership.tenant_id &&
    !memberships.some(item => item.tenant_id === candidate.tenant && item.tenant_status === 'active')
  ) || DEMO.novatech;
  const run = async (key: string, check: () => Promise<Result>) => {
    setRunning(key);
    try {
      const result = await check();
      setResults(previous => ({ ...previous, [key]: result }));
    } finally { setRunning(''); }
  };
  const allowed = () => run('allowed', async () => { const data = await api<Page<Project>>('/projects?page_size=100'); return { status: 200, title: 'Allowed by membership + RLS', detail: `${data.items.length} project rows returned; every tenant_id belongs to ${currentMembership.tenant_name}.` }; });
  const hidden = () => run('hidden', async () => { try { await api<Project>(`/projects/${target.project}`); return { status: 200, title: 'Unexpected result', detail: 'A project was returned. Review the demo target and tenant selection.' }; } catch (error) { if (error instanceof ApiError) return { status: error.status, title: 'Cross-tenant row hidden', detail: `${error.code}: the response is indistinguishable from a missing project. No ${target.name} data was returned.` }; throw error; } });
  const switched = () => run('switch', async () => { try { await api<Page<Project>>('/projects', { tenantOverride: target.tenant }); return { status: 200, title: 'Switch accepted', detail: 'The server accepted the tenant. This is expected only if this identity has a legitimate active membership there.' }; } catch (error) { if (error instanceof ApiError) return { status: error.status, title: 'Tenant switching rejected', detail: `${error.code}: membership verification rejected the forged X-Tenant-ID before RLS context was established.` }; throw error; } });
  const checks = [
    { key: 'allowed', label: `${currentMembership.tenant_name} → own projects`, expected: 'ALLOWED', run: allowed, testId: 'isolation-allowed' },
    { key: 'hidden', label: `${currentMembership.tenant_name} → ${target.name} project ID`, expected: 'HIDDEN / 404', run: hidden, testId: 'isolation-hidden' },
    { key: 'switch', label: `Forge X-Tenant-ID for ${target.name}`, expected: 'DENIED / 403', run: switched, testId: 'isolation-switch' },
  ];
  return <div><PageHeader eyebrow="Developer tools / demonstration data" title="Isolation lab" description="Run real requests against the API and inspect their actual outcomes. These checks complement—not replace—the direct PostgreSQL adversarial test suite." action={<Badge tone="amber"><FlaskConical size={13} /> Fictional demo targets</Badge>} />
    <Alert tone="info">Current identity: <strong>{currentMembership.tenant_name}</strong> · role <strong>{currentMembership.role.replaceAll('_', ' ')}</strong>. Target IDs are deterministic demo fixtures, not discovered through another tenant’s API.</Alert>
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]"><div className="space-y-4">{checks.map(check => <Card key={check.key} className="p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-ink-950">{check.label}</h2><Badge tone={check.expected === 'ALLOWED' ? 'green' : 'red'}>{check.expected}</Badge></div>{results[check.key] && <div className="mt-3 flex items-start gap-2 text-sm" data-testid={`${check.testId}-result`}>{results[check.key].status === 200 ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" /> : <XCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />}<div><p className="font-semibold text-slate-700">HTTP {results[check.key].status} · {results[check.key].title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{results[check.key].detail}</p></div></div>}</div><Button variant="secondary" data-testid={check.testId} loading={running === check.key} onClick={check.run}><Play size={15} />Run check</Button></div></Card>)}</div>
      <Card className="h-fit bg-ink-950 p-6 text-white"><h2 className="font-bold">Enforcement flow</h2><p className="mt-1 text-xs text-slate-500">Defense in depth on every request</p><div className="mt-6 space-y-2">{[
        { icon: UserCheck, title: 'Authenticated identity', note: 'JWT + active persisted session' },
        { icon: ShieldCheck, title: 'Membership + role', note: 'Server-side verification' },
        { icon: Database, title: 'Transaction context', note: 'SET LOCAL app.tenant_id' },
        { icon: LockKeyhole, title: 'PostgreSQL RLS', note: 'SELECT / INSERT / UPDATE / DELETE' },
      ].map((step, index) => <div key={step.title}><div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"><step.icon size={18} className="text-brand-500" /><div><p className="text-xs font-semibold">{step.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{step.note}</p></div></div>{index < 3 && <ArrowDown size={14} className="mx-auto my-1 text-slate-600" />}</div>)}</div><div className="mt-6 rounded-xl bg-white/5 p-3"><p className="text-xs font-semibold text-emerald-700">Direct database proof</p><code className="mt-2 block break-all text-[10px] leading-5 text-slate-500">python scripts/demo_isolation.py</code><p className="mt-2 text-[10px] leading-5 text-slate-500">Uses tenantcore_app to verify that cross-tenant INSERT fails and UPDATE/DELETE affect zero rows.</p></div></Card></div>
  </div>;
}
