import { useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { StatusBadge } from './ui';

export function TenantSwitcher() {
  const { memberships, currentMembership, selectedTenantId, switchTenant } = useAuth();
  const [error, setError] = useState('');
  const active = memberships.filter(item => item.tenant_status === 'active');
  if (!currentMembership) return null;
  if (active.length <= 1) return <div className="flex items-center gap-2.5"><div className="rounded-xl bg-brand-50 p-2 text-brand-600"><Building2 size={18} /></div><div><p className="max-w-40 truncate text-sm font-semibold text-ink-900">{currentMembership.tenant_name}</p><p className="text-[11px] capitalize text-slate-400">{currentMembership.role.replaceAll('_', ' ')}</p></div></div>;
  return <div>
    <div className="relative flex items-center gap-2">
      <Building2 size={18} className="pointer-events-none absolute left-3 text-brand-600" />
      <select aria-label="Current organization" value={selectedTenantId || ''} onChange={async event => { setError(''); try { await switchTenant(event.target.value); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Switch denied'); } }} className="input max-w-64 appearance-none py-2 pl-10 pr-9 font-semibold">
        {active.map(item => <option key={item.tenant_id} value={item.tenant_id}>{item.tenant_name} · {item.role.replaceAll('_', ' ')}</option>)}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 text-slate-400" />
    </div>
    {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
  </div>;
}

export function TenantIdentity() {
  const { currentMembership } = useAuth();
  if (!currentMembership) return null;
  return <div className="flex items-center gap-2"><StatusBadge status={currentMembership.tenant_status} /><span className="flex items-center gap-1 text-xs text-slate-400"><Check size={12} /> Server verified</span></div>;
}
