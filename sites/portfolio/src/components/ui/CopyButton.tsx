import { useId } from 'react';
import { cn } from '@/lib/cn';
import { useCopy } from '@/hooks/useUi';
import { Icon } from './Icon';

export interface CopyButtonProps {
  value: string;
  /** Accessible label, e.g. "Copy SHA-256 hash". */
  label: string;
  /** Visible text; omit for an icon-only control. */
  children?: string;
  className?: string;
  variant?: 'chip' | 'ghost';
}

/**
 * Copies technical details (hashes, URLs, commands) with visible and
 * screen-reader feedback. Reports failure honestly instead of showing a
 * success state when the clipboard was unavailable.
 */
export function CopyButton({ value, label, children, className, variant = 'chip' }: CopyButtonProps) {
  const { copy, copied, error } = useCopy();
  const errorId = useId();

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void copy(value)}
        aria-label={label}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border font-mono text-[0.72rem] transition-colors',
          variant === 'chip'
            ? 'border-line bg-surface px-2 py-1 text-fg-muted hover:border-accent-line hover:text-fg'
            : 'border-transparent px-1.5 py-1 text-fg-subtle hover:bg-surface-sunken hover:text-fg',
          copied && 'border-success/40 text-success',
          className,
        )}
      >
        <Icon name={copied ? 'check' : 'copy'} size={13} aria-hidden />
        <span className="max-w-[16rem] truncate">{children ?? value}</span>
        {children ? (
          <span className="font-sans text-[0.68rem] uppercase tracking-wide opacity-70">
            {copied ? 'Copied' : 'Copy'}
          </span>
        ) : null}
      </button>
      {copied ? (
        <span className="sr-only" role="status">
          {label} copied to clipboard
        </span>
      ) : null}
      {error ? (
        <span id={errorId} role="alert" className="text-[0.7rem] text-danger">
          {error}
        </span>
      ) : null}
    </span>
  );
}
