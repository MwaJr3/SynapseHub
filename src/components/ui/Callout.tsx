import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CalloutProps {
  title: string;
  children: ReactNode;
  variant?: 'note' | 'caution' | 'setup';
  className?: string;
  as?: 'aside' | 'div' | 'section';
}

const variantStyles: Record<NonNullable<CalloutProps['variant']>, string> = {
  note: 'border-line bg-panel',
  caution: 'border-caution/50 bg-caution/[0.07]',
  setup: 'border-accent/40 bg-accent/[0.06]',
};

const variantLabels: Record<NonNullable<CalloutProps['variant']>, string> = {
  note: 'Note',
  caution: 'Limitation',
  setup: 'Configuration',
};

/**
 * Structured callout with a text label, so the type of note never depends on
 * colour alone.
 */
export function Callout({
  title,
  children,
  variant = 'note',
  className,
  as = 'aside',
}: CalloutProps) {
  const Element = as;

  return (
    <Element
      className={cn(
        'rounded-card border p-4 sm:p-5',
        variantStyles[variant],
        className,
      )}
    >
      <p className="mb-2 flex items-center gap-2">
        <span className="chip">{variantLabels[variant]}</span>
        <span className="text-sm font-semibold text-ink">{title}</span>
      </p>
      <div className="prose-body text-sm">{children}</div>
    </Element>
  );
}
