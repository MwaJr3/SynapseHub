/**
 * URL and contact helpers.
 *
 * The portfolio never renders a fabricated destination: an unset link is
 * hidden by the calling component, and anything that is rendered is validated
 * here first.
 */

const SAFE_PROTOCOLS = new Set(['https:', 'mailto:', 'tel:']);

/** True when the value is a usable, safe external URL or mailto/tel link. */
export function isUsableLink(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  try {
    const url = new URL(trimmed);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/** Relaxed email shape check — enough to catch typos, not a full RFC parser. */
export function isEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length > 254) return false;
  return /^[^\s@,;:<>()[\]\\]+@[^\s@,;:<>()[\]\\]+(\.[^\s@,;:<>()[\]\\]+)+$/.test(trimmed);
}

/** Normalises a URL for display: strips protocol and trailing slash. */
export function displayUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol === 'mailto:') return url.pathname;
    // Drop the protocol, a bare "/" path and any trailing slash so the label
    // reads as a clean address (github.com/owner/repo, not github.com/owner/repo/).
    const path = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '');
    return `${url.host}${path}`;
  } catch {
    return value;
  }
}

/** Hostname only, for repository/destination labels. */
export function urlHost(value: string): string {
  try {
    return new URL(value).host;
  } catch {
    return value;
  }
}
