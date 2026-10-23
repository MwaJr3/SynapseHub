import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export type StateTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

const toneStyles: Record<StateTone, { icon: IconName; className: string }> = {
  neutral: { icon: 'info', className: 'text-fg-muted' },
  info: { icon: 'info', className: 'text-info' },
  success: { icon: 'check', className: 'text-success' },
  warning: { icon: 'alert', className: 'text-warning' },
  danger: { icon: 'alert', className: 'text-danger' },
};

export interface StateBlockProps {
  tone?: StateTone;
  icon?: IconName;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Announced to assistive technology as a status change. */
  live?: boolean;
}

/**
 * Empty / error / success / loading state. Every state offers a recovery
 * action where one exists — a dead-end message is a design failure.
 */
export function StateBlock({
  tone = 'neutral',
  icon,
  title,
  children,
  action,
  className,
  live = false,
}: StateBlockProps) {
  const config = toneStyles[tone];
  const iconName = icon ?? config.icon;

  return (
    <div
      role={live ? 'status' : undefined}
      aria-live={live ? 'polite' : undefined}
      className={cn(
        'flex flex-col items-start gap-3 rounded-xl border border-dashed border-line-strong',
        'bg-surface-sunken/60 px-5 py-6 sm:flex-row sm:items-center',
        className,
      )}
    >
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface',
          config.className,
        )}
      >
        <Icon name={iconName} size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {children ? <div className="mt-1 text-sm leading-relaxed text-fg-muted">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-fg-muted">
      <svg
        className="size-4 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label}
    </span>
  );
}

/** Thin skeleton used for in-progress sections. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-surface-sunken', className)}
    />
  );
}
