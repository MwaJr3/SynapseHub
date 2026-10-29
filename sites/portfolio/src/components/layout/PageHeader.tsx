import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container, Section } from '@/components/ui/Layout';

/** Consistent page opening: eyebrow, title, lead paragraph, optional actions. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  tone = 'none',
  children,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  tone?: 'none' | 'light' | 'dark';
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Section tone={tone} className={cn('border-b border-line', tone !== 'none' && 'bg-canvas')}>
      <Container className={cn('py-14 sm:py-16 lg:py-20', className)}>
        {eyebrow ? (
          <p className="eyebrow mb-4 flex items-center gap-2">
            <span aria-hidden className="h-px w-8 bg-accent-line" />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl lg:text-[2.9rem] lg:leading-[1.08]">
          {title}
        </h1>
        {lead ? (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-[1.06rem]">{lead}</p>
        ) : null}
        {actions ? <div className="mt-7 flex flex-wrap items-center gap-3">{actions}</div> : null}
        {children}
      </Container>
    </Section>
  );
}
