import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fades, lifts and un-blurs its children the first time they scroll into view. */
export function BlurFade({ children, delayMs = 0, as: Tag = 'div', className = '' }: { children: ReactNode; delayMs?: number; as?: ElementType; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return undefined;
    if (prefersReducedMotion()) { setVisible(true); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  return <Tag ref={ref} className={`dx-reveal ${className}`.trim()} data-visible={visible} style={{ '--dx-delay': `${delayMs}ms` } as CSSProperties}>{children}</Tag>;
}

/** Counts up to `value` once when first seen. Assistive technology reads the final value only. */
export function NumberTicker({ value, from = 0, durationMs = 900, className = '' }: { value: number; from?: number; durationMs?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') { setShown(value); return undefined; }
    let frame = 0;
    setShown(from);
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        setShown(Math.round(from + (value - from) * (1 - (1 - t) ** 3)));
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    });
    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, from, durationMs]);
  return (
    <span className={className} style={{ display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>{value.toLocaleString('en-US')}</span>
      <span ref={ref} aria-hidden="true">{shown.toLocaleString('en-US')}</span>
    </span>
  );
}

/** A short run of text with a light sweep. Keep it to one phrase per screen. */
export function ShimmerText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`dx-shimmer ${className}`.trim()}>{children}</span>;
}

/** A card with a slowly travelling highlight on its border. Use on the single thing you most want noticed. */
export function GlowCard({ children, className = '', radius = 12 }: { children: ReactNode; className?: string; radius?: number }) {
  return <div className={`dx-glow ${className}`.trim()} style={{ '--dx-radius': `${radius}px` } as CSSProperties}>{children}</div>;
}

/**
 * A looping row (logos, quotes, tags). The copy is aria-hidden so a screen reader meets
 * each item once; hover or focus pauses it; reduced motion turns it into a scrollable row.
 */
export function Marquee({ children, durationSeconds = 40, label }: { children: ReactNode; durationSeconds?: number; label?: string }) {
  return (
    <div className="dx-marquee" role="group" aria-label={label} style={{ '--dx-duration': `${durationSeconds}s` } as CSSProperties}>
      <div className="dx-marquee__track">{children}</div>
      <div className="dx-marquee__track" aria-hidden="true">{children}</div>
    </div>
  );
}

/** A faint dotted backdrop. Put it inside a `position: relative` container. */
export function DotPattern({ gap = 20 }: { gap?: number }) {
  return <div className="dx-dots" aria-hidden="true" style={{ '--dx-dot-gap': `${gap}px` } as CSSProperties} />;
}
