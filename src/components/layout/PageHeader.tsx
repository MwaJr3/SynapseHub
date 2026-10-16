import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  summary?: ReactNode;
  /** Optional right-hand column for metadata, actions or a compact visual. */
  aside?: ReactNode;
  tone?: 'surface' | 'contrast' | 'quiet';
  className?: string;
}

/**
 * Shared page introduction: eyebrow, `h1`, summary and an optional aside.
 * Every inner page uses it, which keeps heading hierarchy consistent.
 */
export function PageHeader({
  eyebrow,
  title,
  summary,
  aside,
  tone = 'surface',
  className,
}: PageHeaderProps) {
  return (
    <section
      data-tone={tone}
      className={cn('relative overflow-hidden bg-surface text-ink', className)}
    >
      <div className="shell py-14 sm:py-16 lg:py-20">
        <div
          className={cn(
            'grid gap-10',
            aside && 'lg:grid-cols-[1.5fr_1fr] lg:items-start',
          )}
        >
          <div className="max-w-prose">
            {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {summary && <div className="prose-lead mt-5">{summary}</div>}
          </div>
          {aside && <div className="lg:pt-12">{aside}</div>}
        </div>
      </div>
    </section>
  );
}
