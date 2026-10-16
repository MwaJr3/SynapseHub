import { useEffect, useRef, useState } from 'react';

type RevealState = 'pending' | 'visible';

/**
 * Reveals an element once it scrolls into view.
 *
 * Motion is entirely optional: when the visitor prefers reduced motion, or
 * IntersectionObserver is unavailable, the state starts as `visible` so
 * content is never hidden behind an animation that will not run.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(): {
  ref: React.RefObject<T | null>;
  state: RevealState;
} {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>(() => {
    if (typeof window === 'undefined') return 'visible';
    if (typeof IntersectionObserver === 'undefined') return 'visible';
    if (typeof window.matchMedia !== 'function') return 'visible';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'visible'
      : 'pending';
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || state === 'visible') return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setState('visible');
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [state]);

  return { ref, state };
}
