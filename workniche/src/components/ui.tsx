/** Shared UI primitives. Small, typed, accessible by default. */
import Link from 'next/link';
import type { JSX, ReactNode } from 'react';

import { cn, initials, VERIFICATION_LABELS } from '@/lib/format';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info';
}): JSX.Element {
  const tones: Record<string, string> = {
    neutral: 'bg-surface-sunken text-ink-muted',
    ok: 'bg-teal-50 text-signal-ok',
    warn: 'bg-amber-50 text-signal-warn',
    bad: 'bg-red-50 text-signal-bad',
    info: 'bg-brand-50 text-brand-700',
  };
  return <span className={cn('badge', tones[tone] ?? tones.neutral)}>{children}</span>;
}

export function VerificationBadge({
  status,
}: {
  status: string;
}): JSX.Element {
  const tone =
    status === 'VERIFIED'
      ? 'ok'
      : status === 'UNDER_REVIEW'
        ? 'warn'
        : status === 'SUSPENDED'
          ? 'bad'
          : 'neutral';
  return <Badge tone={tone}>{VERIFICATION_LABELS[status] ?? status}</Badge>;
}

export function Avatar({ name }: { name: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800"
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className="card text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-ink-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}): JSX.Element {
  return (
    <div className="card">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | undefined;
  hint?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div>
      <span className="label">{label}</span>
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | undefined }): JSX.Element | null {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-signal-bad">
      {message}
    </p>
  );
}

export function Skeleton(): JSX.Element {
  return <div className="animate-pulse rounded-lg bg-surface-sunken h-24" aria-hidden="true" />;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }): JSX.Element {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-brand-700 hover:text-brand-800"
    >
      ← {children}
    </Link>
  );
}
