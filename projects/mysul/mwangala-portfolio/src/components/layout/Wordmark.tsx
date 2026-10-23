import { cn } from '@/lib/cn';

/**
 * Wordmark: a monogram built from a node/edge motif that echoes the hero
 * visual — three connected nodes forming an "M" silhouette.
 */
export function Wordmark({ className, size = 34 }: { className?: string; size?: number }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        focusable="false"
        className="shrink-0"
      >
        <rect x="0.75" y="0.75" width="30.5" height="30.5" rx="8" className="fill-surface stroke-line" />
        <path
          d="M7 24V10l9 8 9-8v14"
          className="stroke-accent"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <circle cx="7" cy="10" r="2.4" className="fill-accent" />
        <circle cx="16" cy="18" r="2.4" className="fill-fg" opacity="0.85" />
        <circle cx="25" cy="10" r="2.4" className="fill-accent" opacity="0.7" />
      </svg>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[0.95rem] font-semibold tracking-tight text-fg">Mwangala</span>
        <span className="mt-0.5 truncate font-mono text-[0.6rem] uppercase tracking-[0.14em] text-fg-subtle">
          Software · Security
        </span>
      </span>
    </span>
  );
}
