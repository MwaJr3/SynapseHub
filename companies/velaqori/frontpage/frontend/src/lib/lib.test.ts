import { beforeEach, describe, expect, it } from 'vitest';
import { badge, highlightParts, hostname, plural, relativeTime, parseDate } from './format';
import { clearRecent, getRecent, pushRecent } from './recent';

const NOW = new Date('2026-10-26T12:00:00Z').getTime();

describe('format helpers', () => {
  it('treats zone-less timestamps as UTC', () => {
    expect(parseDate('2026-10-26T10:00:00')?.toISOString()).toBe('2026-10-26T10:00:00.000Z');
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });

  it('formats recent times relatively and missing dates safely', () => {
    expect(relativeTime('2026-10-26T11:59:30Z', NOW)).toBe('just now');
    expect(relativeTime('2026-10-26T11:30:00Z', NOW)).toBe('30m ago');
    expect(relativeTime('2026-10-26T09:00:00Z', NOW)).toBe('3h ago');
    expect(relativeTime(undefined, NOW)).toBe('No date');
  });

  it('caps navigation badges at 99+', () => {
    expect(badge(7)).toBe('7');
    expect(badge(100)).toBe('99+');
  });

  it('pluralises and extracts hostnames', () => {
    expect(plural(1, 'feed')).toBe('1 feed');
    expect(plural(3, 'feed')).toBe('3 feeds');
    expect(hostname('https://www.example.com/post')).toBe('example.com');
    expect(hostname('')).toBe('');
  });

  it('splits text on search terms for highlighting, escaping regex characters', () => {
    const parts = highlightParts('Using CSS container queries', 'css queries');
    expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(['CSS', 'queries']);
    expect(highlightParts('c++ rocks', 'c++').some((p) => p.match)).toBe(true);
    expect(highlightParts('plain', '')).toEqual([{ text: 'plain', match: false }]);
  });
});

describe('recent searches', () => {
  beforeEach(() => localStorage.clear());

  it('stores most-recent-first, de-duplicates case-insensitively and caps at six', () => {
    pushRecent('react');
    pushRecent('css');
    pushRecent('React');
    expect(getRecent()).toEqual(['React', 'css']);
    ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7'].forEach(pushRecent);
    expect(getRecent()).toHaveLength(6);
  });

  it('ignores one-character queries and survives corrupt storage', () => {
    pushRecent('x');
    expect(getRecent()).toEqual([]);
    localStorage.setItem('fp-recent-searches', '{broken');
    expect(getRecent()).toEqual([]);
    pushRecent('valid');
    clearRecent();
    expect(getRecent()).toEqual([]);
  });
});
