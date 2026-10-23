/**
 * External-link policy shared by every component: a configured, safe http(s)
 * URL renders an external action with `rel="noopener noreferrer"`; anything
 * else renders nothing. There is no placeholder destination anywhere.
 */
import { isConfiguredUrl } from '@/lib/validation';

export interface ExternalLink {
  href: string;
  label: string;
  /** Descriptive extra context for screen readers. */
  srLabel?: string;
}

export function externalLink(
  url: string,
  label: string,
  srLabel?: string,
): ExternalLink | null {
  if (!isConfiguredUrl(url)) return null;
  return { href: url, label, ...(srLabel ? { srLabel } : {}) };
}

export const externalAnchorProps = {
  target: '_blank',
  rel: 'noopener noreferrer',
} as const;
