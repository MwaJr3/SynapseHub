import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Panel } from './Panel';

/** Full-width section wrapper that can opt into the dark technical surface. */
export function Section({
  children,
  className,
  tone = 'none',
  id,
  labelledBy,
  grid = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: 'none' | 'light' | 'dark';
  id?: string;
  labelledBy?: string;
  grid?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-panel={tone === 'none' ? undefined : tone}
      className={cn(
        'relative',
        tone !== 'none' && 'bg-canvas text-fg',
        grid && 'surface-grid',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function Container({
  children,
  className,
  size = 'default',
}: {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}) {
  return (
    <div
      className={cn(
        'container-page',
        size === 'narrow' && 'max-w-4xl',
        size === 'wide' && 'max-w-[88rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Vertical rhythm for page sections. */
export function SectionSpacing({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('py-16 sm:py-20 lg:py-24', className)}>{children}</div>;
}

/** Simple definition-style stat used in dashboards and case-study headers. */
export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Panel tone="none" padded={false} className="px-4 py-3">
      <p className="eyebrow">{label}</p>
      <p className="mt-1.5 text-lg font-semibold text-fg">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p> : null}
    </Panel>
  );
}
