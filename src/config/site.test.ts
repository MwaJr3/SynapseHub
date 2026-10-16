import { describe, expect, it } from 'vitest';
import { isConfigured, resolveExternalUrl } from './site';
import { catalogue } from '@/data/projects';
import { projectDataIssues } from '@/lib/validate';

describe('external URL validation', () => {
  it('accepts https URLs and normalises them', () => {
    expect(resolveExternalUrl('https://github.com/MwaJr3')).toBe(
      'https://github.com/MwaJr3',
    );
    expect(resolveExternalUrl('  https://example-app.dev/demo  ')).toBe(
      'https://example-app.dev/demo',
    );
  });

  it('rejects unsafe schemes', () => {
    for (const value of [
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
    ]) {
      expect(resolveExternalUrl(value), value).toBeUndefined();
    }
  });

  it('rejects malformed and empty values', () => {
    for (const value of [
      '',
      '   ',
      'not a url',
      'htp://example.org',
      '#',
      '/relative/path',
    ]) {
      expect(resolveExternalUrl(value), value).toBeUndefined();
    }
  });

  it('only allows plain http for local development hosts', () => {
    expect(resolveExternalUrl('http://localhost:5173/demo')).toBe(
      'http://localhost:5173/demo',
    );
    expect(resolveExternalUrl('http://127.0.0.1:8000/demo')).toBe(
      'http://127.0.0.1:8000/demo',
    );
    expect(resolveExternalUrl('http://example.org/demo')).toBeUndefined();
  });

  it('reports whether a configuration value will render as a link', () => {
    expect(isConfigured('https://example.org')).toBe(true);
    expect(isConfigured('javascript:alert(1)')).toBe(false);
    expect(isConfigured(undefined)).toBe(false);
  });
});

describe('catalogue honesty checks', () => {
  it('contains no placeholder domains or unfinished markers', () => {
    const serialised = JSON.stringify(catalogue);
    expect(serialised).not.toMatch(/example\.(com|org|net)/i);
    expect(serialised).not.toMatch(/\bTODO\b/);
    expect(serialised).not.toMatch(/#"|\s'#"|"#/);
    expect(serialised).not.toMatch(/lorem ipsum/i);
  });

  it('publishes no metrics, benchmarks or coverage claims', () => {
    const serialised = JSON.stringify(catalogue).toLowerCase();
    for (const banned of [
      '% uptime',
      'accuracy of',
      'improved outcomes by',
      'test coverage',
      'active users',
      'students enrolled',
      'trusted by',
    ]) {
      expect(serialised, banned).not.toContain(banned);
    }
  });

  it('surfaces a data issue when a project points at an unknown category', () => {
    const broken = [{ ...catalogue[0]!, categories: ['not-a-category'] }];
    const issues = projectDataIssues(broken);
    expect(
      issues.some(
        (issue) =>
          issue.level === 'error' && issue.message.includes('not-a-category'),
      ),
    ).toBe(true);
  });

  it('surfaces a data issue when a related slug does not exist', () => {
    const broken = [
      { ...catalogue[0]!, relatedSlugs: ['ghost-project'] as never },
    ];
    const issues = projectDataIssues(broken);
    expect(
      issues.some((issue) => issue.message.includes('ghost-project')),
    ).toBe(true);
  });

  it('flags a live demo URL that points at a source-code host', () => {
    const suspicious = [
      {
        ...catalogue[0]!,
        liveDemoUrl: 'https://github.com/MwaJr3/learnbridge',
      },
    ];
    const issues = projectDataIssues(suspicious);
    expect(
      issues.some(
        (issue) =>
          issue.level === 'warning' &&
          issue.message.includes('source-code host'),
      ),
    ).toBe(true);
  });
});
