import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, BarChart3, Blocks, Building2, ClipboardList, FileClock, FolderKanban, KeyRound, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { TenantIdentity, TenantSwitcher } from './TenantSwitcher';
import { Badge } from './ui';

const tenantNav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/teams', label: 'Teams', icon: Blocks },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/usage', label: 'Usage', icon: BarChart3 },
  { to: '/audit', label: 'Audit trail', icon: FileClock },
  { to: '/isolation', label: 'Isolation lab', icon: ShieldCheck },
];

export function Layout() {
  const { user, currentMembership, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const navigation = [...(user?.is_platform_admin ? [{ to: '/platform', label: 'Platform control', icon: Building2 }] : []), ...(currentMembership ? tenantNav : [])];
  const signOut = async () => { await logout(); navigate('/login'); };
  return <div className="min-h-screen bg-[#f5f7fb]">
    {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-ink-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-950 text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6"><div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/20"><ShieldCheck size={21} /></div><div><p className="text-lg font-bold tracking-tight">TenantCore</p><p className="text-[10px] font-medium uppercase tracking-[.18em] text-slate-500">Isolation by design</p></div><button className="ml-auto p-1 text-slate-500 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6" aria-label="Main navigation">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Workspace</p>
        {navigation.map(item => <NavLink key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><item.icon size={18} />{item.label}</NavLink>)}
        {currentMembership && <><p className="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Administration</p><NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><KeyRound size={18} />Settings & keys</NavLink></>}
      </nav>
      <div className="m-4 rounded-2xl border border-white/10 bg-white/[.04] p-3.5"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-400" />PostgreSQL RLS enforced</div><p className="mt-1.5 text-[11px] leading-5 text-slate-500">Tenant filters are defense-in-depth, not the isolation boundary.</p></div>
    </aside>
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-20 items-center gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
        <div className="min-w-0"><TenantSwitcher /></div>
        <div className="ml-auto hidden md:block"><TenantIdentity /></div>
        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-950 text-xs font-bold text-white">{user?.full_name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div><div className="hidden xl:block"><p className="max-w-40 truncate text-sm font-semibold text-ink-900">{user?.full_name}</p><p className="max-w-40 truncate text-[11px] text-slate-500">{user?.email}</p></div><button onClick={signOut} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600" title="Sign out" aria-label="Sign out"><LogOut size={18} /></button></div>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  </div>;
}

export function PermissionNotice({ role }: { role: string }) { return <Badge tone="blue"><Activity size={12} /> Your role: {role.replaceAll('_', ' ')}</Badge>; }
