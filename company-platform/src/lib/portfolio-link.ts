/**
 * Where the personal portfolio lives.
 *
 * The company site is the umbrella — visitors enter here and reach the other
 * applications from it — but the portfolio is a separate site rather than a
 * section of this one. Its address is configuration, never a literal, and an
 * unset value renders no link at all (the same policy as every other external
 * destination on this platform).
 */
import { externalLink, type ExternalLink } from '@/lib/links';

export function portfolioLink(url = process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? ''): ExternalLink | null {
  return externalLink(url, 'Portfolio');
}
