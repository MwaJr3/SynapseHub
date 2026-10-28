/**
 * The company site is the umbrella: visitors enter here and reach the other
 * applications from it. The personal portfolio is one of those destinations, and
 * it is reached by link rather than rebuilt inside this app.
 *
 * The policy under test is the platform's usual one — a configured http(s)
 * address renders a link, anything else renders nothing at all. A missing value
 * must never produce `href="#"` or a dead destination.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { portfolioLink } from '@/lib/portfolio-link';
import { externalAnchorProps } from '@/lib/links';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the portfolio link in the site chrome', () => {
  it('is absent when NEXT_PUBLIC_PORTFOLIO_URL is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_PORTFOLIO_URL', '');
    expect(portfolioLink()).toBeNull();
  });

  it('is absent when the value is not an absolute http(s) url', () => {
    for (const value of ['portfolio', '/portfolio', '#', 'javascript:alert(1)']) {
      vi.stubEnv('NEXT_PUBLIC_PORTFOLIO_URL', value);
      expect(portfolioLink(), `"${value}" must not become a link`).toBeNull();
    }
  });

  it('points at the configured address, labelled for a screen reader', () => {
    vi.stubEnv('NEXT_PUBLIC_PORTFOLIO_URL', 'https://portfolio.example.com');
    expect(portfolioLink()).toEqual({
      href: 'https://portfolio.example.com',
      label: 'Portfolio',
    });
  });

  it('opens externally without leaking the opener', () => {
    expect(externalAnchorProps.target).toBe('_blank');
    expect(externalAnchorProps.rel).toBe('noopener noreferrer');
  });
});
