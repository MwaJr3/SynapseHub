import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface NumberTickerProps {
  value: number;
  /** Where the count starts. */
  from?: number;
  /** Duration in milliseconds. Kept short: a counter is decoration, not a wait. */
  durationMs?: number;
  className?: string;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Counts up to `value` the first time it scrolls into view.
 *
 * Adapted from Magic UI's NumberTicker, rebuilt without the `motion` dependency and
 * held to the engine's own standards: with reduced motion, no IntersectionObserver or
 * no JavaScript the final number is shown at once; assistive technology is given the
 * final value, never the frames in between; digits are tabular so the width does not
 * jitter while counting.
 */
export function NumberTicker({ value, from = 0, durationMs = 900, className }: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      setShown(value);
      return undefined;
    }
    let frame = 0;
    setShown(from);
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) ** 3; // ease-out: fast start, gentle landing
        setShown(Math.round(from + (value - from) * eased));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, from, durationMs]);

  return (
    <span className={cn('inline-block tabular-nums', className)}>
      <span className="sr-only">{value.toLocaleString('en-US')}</span>
      <span ref={ref} aria-hidden="true">
        {shown.toLocaleString('en-US')}
      </span>
    </span>
  );
}
