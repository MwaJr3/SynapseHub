/** External-link policy: configured safe URLs only, hidden otherwise, never `#`. */
import { describe, expect, it } from 'vitest';

import { externalLink, externalAnchorProps } from '@/lib/links';
import {
  isConfiguredUrl,
  isSafeExternalUrl,
  optionalUrl,
  portfolioLinkSchema,
} from '@/lib/validation';

describe('external link policy', () => {
  it('accepts full http(s) URLs and rejects unsafe schemes', () => {
    expect(isSafeExternalUrl('https://example.com/portfolio')).toBe(true);
    expect(isSafeExternalUrl('http://example.com')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeExternalUrl('ftp://example.com')).toBe(false);
    expect(isSafeExternalUrl('example.com')).toBe(false);
  });

  it('treats empty as unconfigured, not a placeholder', () => {
    expect(isConfiguredUrl('')).toBe(false);
    expect(isConfiguredUrl('https://example.com')).toBe(true);
    expect(optionalUrl.safeParse('').success).toBe(true);
    expect(optionalUrl.safeParse('https://example.com/x').success).toBe(true);
    expect(optionalUrl.safeParse('javascript:void(0)').success).toBe(false);
    expect(optionalUrl.safeParse('#').success).toBe(false);
  });

  it('externalLink returns null when unconfigured so callers hide the button', () => {
    expect(externalLink('', 'Visit')).toBeNull();
    expect(externalLink('javascript:alert(1)', 'Visit')).toBeNull();
    const link = externalLink('https://example.com', 'Visit Personal Portfolio');
    expect(link).toEqual({
      href: 'https://example.com',
      label: 'Visit Personal Portfolio',
    });
  });

  it('external anchors open in a new tab with noreferrer protection', () => {
    expect(externalAnchorProps.target).toBe('_blank');
    expect(externalAnchorProps.rel).toBe('noopener noreferrer');
  });

  it('portfolio links require a real destination — no placeholder entries', () => {
    expect(portfolioLinkSchema.safeParse({ label: 'My work', url: '' }).success).toBe(false);
    expect(portfolioLinkSchema.safeParse({ label: 'My work', url: '#' }).success).toBe(false);
    expect(
      portfolioLinkSchema.safeParse({ label: 'My work', url: 'https://example.com/work' }).success,
    ).toBe(true);
  });
});
