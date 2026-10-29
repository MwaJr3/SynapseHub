import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export type BadgeTone = 'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'project';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-fg-muted border-line',
  accent: 'bg-accent-soft text-accent border-accent-line',
  info: 'bg-info-soft text-info border-transparent',
  success: 'bg-success-soft text-success border-transparent',
  warning: 'bg-warning-soft text-warning border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  project: 'bg-[var(--prj-soft)] text-[var(--prj)] border-[var(--prj-line)]',
};

export interface BadgeProps {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
  /** Renders as a list item marker rather than an inline chip. */
  size?: 'sm' | 'md';
  title?: string;
}

/**
 * Small status/label chip. Tone is always paired with text — colour is never
 * the only carrier of meaning.
 */
export function Badge({ tone = 'neutral', icon, children, className, size = 'sm', title }: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2.5 py-0.5 text-[0.7rem]' : 'px-3 py-1 text-xs',
        tones[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 12 : 14} aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Technology pill used on project cards and case studies. */
export function TechTag({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-line bg-surface-sunken px-2 py-0.5',
        'font-mono text-[0.7rem] text-fg-muted',
        className,
      )}
    >
      {name}
    </span>
  );
}
