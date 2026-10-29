import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
  /** Heading level — keep the document outline correct. */
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
  as: Tag = 'h2',
  id,
  action,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        align === 'center' && 'sm:flex-col sm:items-center sm:text-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'mx-auto')}>
        {eyebrow ? (
          <p className="eyebrow mb-3 flex items-center gap-2">
            <span aria-hidden className="h-px w-6 bg-accent-line" />
            {eyebrow}
          </p>
        ) : null}
        <Tag
          id={id}
          className={cn(
            'text-fg font-semibold',
            Tag === 'h1' ? 'text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]' : 'text-2xl sm:text-3xl',
          )}
        >
          {title}
        </Tag>
        {description ? (
          <p className="mt-3 text-base leading-relaxed text-fg-muted sm:text-[1.05rem]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
