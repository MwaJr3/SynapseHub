import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText, shareableUrl, type CopyResult } from '@/lib/clipboard';
import { siteConfig } from '@/config/site';

export interface CopyLinkState {
  status: 'idle' | CopyResult;
  copy: (path?: string) => Promise<void>;
  reset: () => void;
  resetTimer: number;
}

/**
 * Copy-to-clipboard with real success/failure feedback.
 *
 * The canonical URL is only constructed when a production origin is
 * configured; otherwise the visitor's own address is copied, which is always
 * truthful about where they are reading.
 */
export function useCopyLink(path?: string, resetTimer = 4000): CopyLinkState {
  const [status, setStatus] = useState<'idle' | CopyResult>('idle');
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  const reset = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    setStatus('idle');
  }, []);

  const copy = useCallback(
    async (overridePath?: string) => {
      const targetPath =
        overridePath ??
        path ??
        (typeof window === 'undefined' ? '/' : window.location.pathname);
      const href =
        typeof window === 'undefined' ? targetPath : window.location.href;
      const url = shareableUrl(targetPath, siteConfig.url, href);
      const result = await copyText(url);

      setStatus(result);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setStatus('idle'), resetTimer);
    },
    [path, resetTimer],
  );

  return { status, copy, reset, resetTimer };
}
