import { useEffect } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Inbox, Loader2, X } from 'lucide-react';
import { ApiError } from '../services/api';

export function Button({ variant = 'primary', loading, children, disabled, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  };
  return <button {...props} disabled={disabled || loading} className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>
    {loading && <Loader2 size={16} className="animate-spin" />}{children}
  </button>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-rose-50 text-rose-700', blue: 'bg-brand-50 text-brand-700', violet: 'bg-violet-50 text-violet-700' };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${tones[tone]}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = ['active', 'done', 'completed'].includes(status) ? 'green' : ['suspended', 'archived', 'blocked'].includes(status) ? 'red' : ['provisioning', 'on_hold', 'in_progress'].includes(status) ? 'amber' : 'slate';
  return <Badge tone={tone}>{status.replaceAll('_', ' ')}</Badge>;
}

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
    <div>{eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[.16em] text-brand-600">{eyebrow}</p>}<h1 className="text-2xl font-bold tracking-tight text-ink-950 sm:text-[28px]">{title}</h1><p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>
    {action && <div className="shrink-0">{action}</div>}
  </div>;
}

export function LoadingRows({ rows = 5 }: { rows?: number }) { return <div className="card space-y-1 p-5" aria-label="Loading">{Array.from({ length: rows }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>; }
export function LoadingCards() { return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>; }

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="flex flex-col items-center px-6 py-16 text-center"><div className="mb-4 rounded-2xl bg-slate-100 p-3 text-slate-600"><Inbox size={25} /></div><h3 className="font-semibold text-ink-900">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-5">{action}</div>}</div>; }

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiError ? error : null;
  const denied = apiError?.status === 403;
  return <div className="card flex flex-col items-center px-6 py-12 text-center" role="alert"><div className={`mb-4 rounded-2xl p-3 ${denied ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}><AlertCircle size={25} /></div><h3 className="font-semibold text-ink-900">{denied ? 'Permission denied' : 'We couldn’t load this view'}</h3><p className="mt-1 max-w-md text-sm text-slate-500">{error instanceof Error ? error.message : 'An unexpected service error occurred.'}</p>{apiError?.requestId && <p className="mt-2 font-mono text-[11px] text-slate-500">Request ID: {apiError.requestId}</p>}{onRetry && <Button variant="secondary" className="mt-5" onClick={onRetry}>Try again</Button>}</div>;
}

export function Alert({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'error' | 'info' }) {
  const styles = { success: 'border-emerald-200 bg-emerald-50 text-emerald-800', error: 'border-rose-200 bg-rose-50 text-rose-800', info: 'border-brand-100 bg-brand-50 text-brand-800' };
  return <div className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm leading-6 ${styles[tone]}`}>{tone === 'success' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}<div>{children}</div></div>;
}

export function Modal({ title, description, children, onClose, wide = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [onClose]);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-modal animate-rise sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
      <div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-ink-950">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}</div><button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"><X size={20} /></button></div>
      {children}
    </div>
  </div>;
}

export function ConfirmDialog({ title, description, confirmLabel = 'Confirm', onConfirm, onClose, loading, danger = true }: { title: string; description: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void; loading?: boolean; danger?: boolean }) {
  return <Modal title={title} description={description} onClose={onClose}><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div></Modal>;
}

export function Pagination({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return <div className="mt-5 flex items-center justify-between text-sm text-slate-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ArrowLeft size={16} /></Button><Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ArrowRight size={16} /></Button></div></div>;
}
