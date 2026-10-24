import type { ReactNode } from 'react';

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="card">
      {title ? <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2> : null}
      {children}
    </section>
  );
}

export function StatCard({ label, value, tone = 'text-slate-100' }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
      <p className="font-medium text-slate-200">{title}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-800 bg-rose-950/60 px-3 py-2 text-sm text-rose-200" role="alert">
      {message}
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-slate-400">Loading…</p>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function ConfirmButton({
  label,
  confirmMessage,
  onConfirm,
  className = 'btn-danger',
}: {
  label: string;
  confirmMessage: string;
  onConfirm: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.confirm(confirmMessage)) onConfirm();
      }}
    >
      {label}
    </button>
  );
}
