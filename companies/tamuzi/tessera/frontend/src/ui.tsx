import type { ReactNode } from 'react';

import { percent, tierColour } from './utils';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {hint ? <p className="mt-1 text-sm text-[color:var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const colour =
    tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : 'var(--muted)';
  return (
    <span
      className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
      style={{ color: colour, borderColor: 'var(--line)' }}
    >
      {children}
    </span>
  );
}

export function MasteryBar({ mastery, tier }: { mastery: number; tier: string }) {
  return (
    <div className="bar" role="img" aria-label={`Mastery ${percent(mastery)} (${tier})`}>
      <span style={{ width: percent(mastery), background: tierColour(tier) }} />
    </div>
  );
}

export function Loading({ label }: { label: string }) {
  return (
    <p role="status" className="text-sm text-[color:var(--muted)]">
      {label}…
    </p>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-md border p-4 text-sm" style={{ borderColor: 'var(--bad)' }}>
      <strong className="block">Something went wrong</strong>
      <p className="mt-1 text-[color:var(--muted)]">{message}</p>
      {onRetry ? (
        <button type="button" className="btn mt-3" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-dashed p-6 text-sm" style={{ borderColor: 'var(--line)' }}>
      <strong className="block">{title}</strong>
      <p className="mt-1 text-[color:var(--muted)]">{body}</p>
    </div>
  );
}

export function ReasonList({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
      {reasons.map((reason) => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  );
}
