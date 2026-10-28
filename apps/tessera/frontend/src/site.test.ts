import { describe, expect, it } from 'vitest';

import { companySiteUrl, parentLabel, parentLink, safeHttpUrl } from './site';

describe('safeHttpUrl', () => {
  it('accepts absolute http(s) URLs only', () => {
    expect(safeHttpUrl('https://tamuzi.example.test')).toBe('https://tamuzi.example.test/');
    expect(safeHttpUrl('http://127.0.0.1:3010')).toBe('http://127.0.0.1:3010/');
    for (const value of [undefined, '', '  ', 'tamuzi.example.test', '/', '#', 'javascript:alert(1)', 'data:,x']) {
      expect(safeHttpUrl(value)).toBeNull();
    }
  });
});

describe('the umbrella link', () => {
  it('is absent when nothing is configured, and there is no placeholder', () => {
    expect(companySiteUrl({})).toBeNull();
    expect(parentLink({})).toBeNull();
    // The header still says what this is, without a dead link.
    expect(parentLabel()).toBe('A Tamuzi Learning product');
  });

  it('is present and labelled when the company site is configured', () => {
    const link = parentLink({ VITE_COMPANY_SITE_URL: 'https://tamuzi.example.test' });
    expect(link).toEqual({ href: 'https://tamuzi.example.test/', label: 'Part of Tamuzi Learning' });
  });

  it('refuses to render a configured but unsafe value', () => {
    expect(parentLink({ VITE_COMPANY_SITE_URL: 'javascript:alert(1)' })).toBeNull();
    expect(parentLink({ VITE_COMPANY_SITE_URL: '#' })).toBeNull();
  });
});
