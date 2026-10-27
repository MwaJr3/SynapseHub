import { useEffect, useRef, useState } from 'react';

/**
 * The id of the section currently under the reading line.
 *
 * Shared by every in-page table of contents (project sections, company anchors,
 * the earlier-work archive) so a nav marked as "current" means the same thing on
 * all of them. It picks the *most* visible section rather than the first one that
 * intersects, because at any scroll position two sections usually overlap the
 * viewport and the first match flickers as you read.
 *
 * Renders once on mount, then on every intersection change; the animation frame
 * collapses the burst of entries a single scroll produces into one state update.
 * Without IntersectionObserver the hook returns an empty id, so the nav simply
 * shows no current item — never a wrong one, and never a crash.
 */
export function useScrollSpy(ids: readonly string[]): string {
  const [active, setActive] = useState<string>('');
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver !== 'function') return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          let best = '';
          let bestRatio = 0;
          for (const [id, ratio] of visible) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              best = id;
            }
          }
          if (best) setActive(best);
        });
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: [0, 0.15, 0.4, 0.75, 1] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [ids]);

  return active;
}
