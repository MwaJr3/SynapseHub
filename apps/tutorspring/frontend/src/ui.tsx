import { useState, type ReactNode } from 'react';

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
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
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

/**
 * Loading, shaped like the thing that is coming.
 *
 * The previous version was the sentence "Loading…": it told assistive technology
 * nothing, gave the layout no height to reserve, and read the same whether one
 * row or forty were on the way. Three bars and a polite live region fix both.
 */
export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-2 py-1">
      <span className="sr-only">{label}…</span>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-4 animate-pulse rounded bg-slate-800"
          style={{ width: `${92 - index * 18}%` }}
        />
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

/**
 * A destructive action confirmed in place.
 *
 * `window.confirm` blocks the page, cannot be styled or translated, is suppressed
 * in some embedded browsers, and cannot say which object is about to go. This one
 * keeps the caller's API, shows the same sentence inline next to the control that
 * is about to act, names the action on both buttons, and puts focus on the safe
 * choice. The trigger is unchanged when cancelled.
 */
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
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!armed) {
    return (
      <button type="button" className={className} aria-haspopup="true" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2" role="group" aria-label={confirmMessage}>
      <span className="text-xs text-slate-300">{confirmMessage}</span>
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
      >
        {busy ? 'Working…' : label}
      </button>
      {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the safe option takes focus by design */}
      <button type="button" className="btn-ghost" autoFocus onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}
