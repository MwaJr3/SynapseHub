import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface PanelProps {
  children: ReactNode;
  className?: string;
  /**
   * `dark` opts this region into the dark technical surface. In the default
   * hybrid composition it stays dark; when the visitor picks Light or Dark
   * explicitly it collapses into the site-wide scheme.
   */
  tone?: 'light' | 'dark' | 'none';
  as?: ElementType;
  interactive?: boolean;
  padded?: boolean;
  id?: string;
}

/**
 * The base surface container. Everything that looks like a card, sheet or
 * section panel in this portfolio is a Panel, so borders, radii and surface
 * colours stay consistent.
 */
export function Panel({
  children,
  className,
  tone = 'none',
  as: Tag = 'div',
  interactive = false,
  padded = true,
  id,
}: PanelProps) {
  return (
    <Tag
      id={id}
      data-panel={tone === 'none' ? undefined : tone}
      className={cn(
        tone === 'none' ? '' : 'bg-canvas text-fg',
        padded && 'p-5 sm:p-6',
        'rounded-xl border border-line',
        interactive && 'card-interactive',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A bordered section inside a panel, with an optional title row. */
export function SubPanel({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface', className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h3 className="text-sm font-semibold text-fg">{title}</h3>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
