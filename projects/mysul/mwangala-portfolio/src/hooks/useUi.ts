import { useCallback, useEffect, useRef, useState } from 'react';

/** Clipboard copy with transient status feedback and a fallback path. */
export function useCopy(resetAfter = 2000) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (value: string) => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(value);
        } else {
          // Older browsers / insecure contexts.
          const area = document.createElement('textarea');
          area.value = value;
          area.setAttribute('readonly', '');
          area.style.position = 'fixed';
          area.style.opacity = '0';
          document.body.appendChild(area);
          area.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(area);
          if (!ok) throw new Error('copy command rejected');
        }
        setCopied(true);
        setError(null);
      } catch {
        setCopied(false);
        setError('Could not access the clipboard. Select the text and copy manually.');
      } finally {
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(false), resetAfter);
      }
    },
    [resetAfter],
  );

  return { copy, copied, error } as const;
}

/** Tracks a media query, SSR-safe. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Locks body scroll while a dialog or mobile menu is open. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/** Announce transient status text to screen readers via a polite live region. */
export function useAnnounce() {
  const [message, setMessage] = useState('');
  const timer = useRef<number | null>(null);

  const announce = useCallback((next: string, clearAfter = 3500) => {
    setMessage('');
    // Reset then set so repeated identical messages are still announced.
    window.requestAnimationFrame(() => setMessage(next));
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), clearAfter);
  }, []);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return { message, announce } as const;
}
