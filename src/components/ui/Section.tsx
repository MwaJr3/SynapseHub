import type { ReactNode } from 'react';
import type { SectionTone } from '@/types';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';

interface SectionProps {
  id?: string;
  tone?: SectionTone;
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Renders the tonal hairline grid motif (contrast sections only). */
  motif?: boolean;
  /** Heading level, so each page keeps a logical hierarchy. */
  headingLevel?: 2 | 3;
  reveal?: boolean;
}

/**
 * Tonal section wrapper. `tone` selects a token scope (see `src/styles/index.css`),
 * which is how the hybrid light/dark layout keeps one design system: the same
 * card, border and focus styles resolve differently per tone and per theme.
 */
export function Section({
  id,
  tone = 'surface',
  eyebrow,
  title,
  description,
  children,
  className,
  motif = false,
  headingLevel = 2,
  reveal = true,
}: SectionProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  const body = (
    <div className="shell py-16 sm:py-20 lg:py-24">
      {(eyebrow || title || description) && (
        <header className="mb-10 max-w-prose sm:mb-14">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          {title && (
            <Heading className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">
              {title}
            </Heading>
          )}
          {description && <div className="prose-lead mt-4">{description}</div>}
        </header>
      )}
      {children}
    </div>
  );

  return (
    <section
      id={id}
      data-tone={tone}
      className={cn(
        // The tone decides the token scope (see src/styles/index.css); the
        // background and text colours resolve from that scope.
        'relative overflow-hidden border-t border-line bg-surface text-ink first:border-t-0',
        motif && 'motif-grid',
        className,
      )}
    >
      {reveal ? (
        <Reveal className="relative">{body}</Reveal>
      ) : (
        <div className="relative">{body}</div>
      )}
    </section>
  );
}
