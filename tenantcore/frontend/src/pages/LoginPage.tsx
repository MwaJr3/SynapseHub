import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Database, KeyRound, LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../features/auth/auth-context';
import { ApiError } from '../services/api';
import { Button } from '../components/ui';

const schema = z.object({ email: z.email('Enter a valid email address'), password: z.string().min(8, 'Password must be at least 8 characters') });
type FormValues = z.infer<typeof schema>;
const demos = [
  { label: 'Acme administrator', email: 'acme.admin@tenantcore.demo', password: 'DemoPass!2026' },
  { label: 'Multi-org user', email: 'multi@tenantcore.demo', password: 'DemoPass!2026' },
  { label: 'Platform administrator', email: 'platform.admin@tenantcore.demo', password: 'PlatformAdmin!2026' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: 'acme.admin@tenantcore.demo', password: 'DemoPass!2026' } });
  if (user) return <Navigate to={user.is_platform_admin ? '/platform' : '/dashboard'} replace />;
  const submit = async (values: FormValues) => {
    setError('');
    try { const result = await login(values.email, values.password); navigate(result.user.is_platform_admin ? '/platform' : '/dashboard'); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'The sign-in service is unavailable'); }
  };
  return <main className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_1fr]">
    <section className="relative hidden overflow-hidden bg-ink-950 px-12 py-12 text-white lg:flex lg:flex-col xl:px-20 xl:py-16">
      <div className="absolute -right-36 -top-36 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" /><div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-mint-500/10 blur-3xl" />
      <div className="relative flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500"><ShieldCheck size={23} /></div><div><p className="text-xl font-bold tracking-tight">TenantCore</p><p className="text-[10px] uppercase tracking-[.2em] text-slate-500">Isolation by design</p></div></div>
      <div className="relative my-auto max-w-xl py-16"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-900"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Database-enforced tenant boundaries</div><h1 className="text-4xl font-bold leading-[1.15] tracking-[-.035em] xl:text-5xl">One platform.<br />Every customer<br /><span className="text-brand-500">securely separated.</span></h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-500">Production-oriented multi-tenancy where authorization begins in the application and isolation ends at the PostgreSQL row.</p>
        <div className="mt-10 space-y-3">{[
          { icon: KeyRound, title: 'Authenticate', text: 'Short-lived identity + rotating sessions' },
          { icon: Users, title: 'Authorize', text: 'Explicit membership + tenant-specific roles' },
          { icon: Database, title: 'Isolate', text: 'Transaction-local context + PostgreSQL RLS' },
        ].map((item, index) => <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4 backdrop-blur"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-brand-500"><item.icon size={19} /></div><div className="flex-1"><p className="text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-slate-500">{item.text}</p></div><span className="font-mono text-xs text-slate-600">0{index + 1}</span></div>)}</div>
      </div>
      <p className="relative text-xs text-slate-600">Demonstration environment · Fictional companies and records only</p>
    </section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-16"><div className="w-full max-w-md">
      <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-white"><ShieldCheck size={22} /></div><p className="text-xl font-bold text-ink-950">TenantCore</p></div>
      <p className="text-xs font-bold uppercase tracking-[.16em] text-brand-600">Secure workspace</p><h2 className="mt-2 text-3xl font-bold tracking-tight text-ink-950">Welcome back</h2><p className="mt-2 text-sm leading-6 text-slate-500">Sign in to access your authorized organizations.</p>
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)}>
        {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><LockKeyhole size={18} className="shrink-0" />{error}</div>}
        <div><label className="label" htmlFor="email">Work email</label><input id="email" type="email" autoComplete="username" className="input" placeholder="you@company.com" {...register('email')} />{errors.email && <p className="mt-1.5 text-xs text-rose-600">{errors.email.message}</p>}</div>
        <div><div className="flex justify-between"><label className="label" htmlFor="password">Password</label><span className="text-[11px] text-slate-500">12+ characters for invitations</span></div><input id="password" type="password" autoComplete="current-password" className="input" {...register('password')} />{errors.password && <p className="mt-1.5 text-xs text-rose-600">{errors.password.message}</p>}</div>
        <Button type="submit" loading={isSubmitting} className="w-full py-3" data-testid="login-submit">Sign in securely<ArrowRight size={17} /></Button>
      </form>
      <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-slate-200" /><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Demo identities</span><div className="h-px flex-1 bg-slate-200" /></div>
      <div className="grid gap-2">{demos.map(demo => <button key={demo.email} type="button" onClick={() => { setValue('email', demo.email); setValue('password', demo.password); setError(''); }} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-brand-500 hover:bg-brand-50/50"><span><span className="block text-xs font-semibold text-slate-700">{demo.label}</span><span className="mt-0.5 block text-[11px] text-slate-500">{demo.email}</span></span><ArrowRight size={15} className="text-slate-500" /></button>)}</div>
      <p className="mt-6 text-center text-[11px] leading-5 text-slate-500">Demo credentials are public and fictional. Never reuse them in a deployed environment.</p>
    </div></section>
  </main>;
}
