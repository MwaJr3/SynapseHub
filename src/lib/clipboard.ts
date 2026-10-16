export type CopyResult = 'copied' | 'failed';

/**
 * Copies text and reports what actually happened. The fallback path exists for
 * browsers and insecure contexts without the async clipboard API, and a
 * failure is reported as a failure rather than a silent success.
 */
export async function copyText(text: string): Promise<CopyResult> {
  const clipboard =
    typeof navigator !== 'undefined' ? navigator.clipboard : undefined;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return 'copied';
    } catch {
      /* Fall through to the legacy path below. */
    }
  }

  if (typeof document === 'undefined') return 'failed';

  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', 'true');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const succeeded = document.execCommand('copy');
    document.body.removeChild(area);
    return succeeded ? 'copied' : 'failed';
  } catch {
    return 'failed';
  }
}

/** Canonical URL for a path, or the live location when no site origin is configured. */
export function shareableUrl(
  path: string,
  configuredOrigin: string,
  currentHref: string,
): string {
  if (configuredOrigin) {
    try {
      return new URL(
        path,
        `${configuredOrigin.replace(/\/+$/, '')}/`,
      ).toString();
    } catch {
      /* Fall back to the address the visitor is actually using. */
    }
  }
  return currentHref;
}
