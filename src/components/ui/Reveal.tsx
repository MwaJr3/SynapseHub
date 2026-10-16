import type { ReactNode } from 'react';
import { useReveal } from '@/hooks/useReveal';
import { cn } from '@/lib/cn';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}

/**
 * Wraps content in the scroll-reveal behaviour. The animation is purely
 * additive: content is readable with JavaScript disabled, with reduced motion
 * enabled, and before the observer fires.
 */
export function Reveal({ children, className, delayMs = 0 }: RevealProps) {
  const { ref, state } = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      data-reveal={state}
      className={cn(className)}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
