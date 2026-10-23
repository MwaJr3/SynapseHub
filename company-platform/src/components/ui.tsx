/** Shared presentation atoms: badges, safe external links, section plates. */
import Link from 'next/link';
import type { ReactNode } from 'react';

import { externalAnchorProps } from '@/lib/links';

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'status';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-line text-muted',
    accent: 'accent-soft accent-text border-transparent',
    status: 'border-line text-muted',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone] ?? tones.neutral}`}
    >
      {children}
    </span>
  );
}

export const STATUS_LABELS: Record<string, string> = {
  PROTOTYPE: 'Prototype',
  BUILT: 'Built (not publicly deployed)',
  CASE_STUDY_ONLY: 'Case study — no working implementation',
  PILOT: 'Pilot',
  LIVE: 'Live',
  MAINTENANCE: 'Maintenance',
  ARCHIVED: 'Archived',
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone="status">{STATUS_LABELS[status] ?? status}</Badge>;
}

export function CompanyBadge({ name }: { name: string }) {
  return <Badge tone="accent">Operated by {name}</Badge>;
}

export function ExternalLinkButton({
  href,
  children,
  variant = 'secondary',
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  // Rendered only for configured, safe URLs (callers gate); never `#`.
  return (
    <a
      href={href}
      className={`btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'}`}
      {...externalAnchorProps}
    >
      {children}
    </a>
  );
}

export function Section({
  title,
  children,
  id,
}: {
  title: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section aria-labelledby={id ? `${id}-heading` : undefined} className="card">
      <h2
        id={id ? `${id}-heading` : undefined}
        className="text-lg font-semibold"
      >
        {title}
      </h2>
      <div className="prose-plate mt-3 text-sm leading-relaxed text-muted">
        {children}
      </div>
    </section>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-line p-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
            {index < items.length - 1 ? <span aria-hidden="true">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function IllustrativeLabel({ label }: { label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className="flex h-36 items-center justify-center rounded-md border border-dashed border-line accent-soft px-4 text-center text-xs text-muted"
    >
      {label}
    </div>
  );
}
