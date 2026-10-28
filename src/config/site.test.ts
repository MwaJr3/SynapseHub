import { describe, expect, it } from 'vitest';
import { isConfigured, resolveExternalUrl } from './site';
import { challengeManifest, validateChallengeManifest } from '@/data/challengeManifest';

describe('external URL validation', () => {
  it('accepts HTTPS URLs and normalises them', () => {
    expect(resolveExternalUrl('https://github.com/MwaJr3')).toBe('https://github.com/MwaJr3');
    expect(resolveExternalUrl('  https://example-app.dev/demo  ')).toBe('https://example-app.dev/demo');
  });

  it('rejects unsafe schemes, malformed values and remote plain HTTP URLs', () => {
    for (const value of ['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)', 'file:///etc/passwd', '', 'not a url', '#', '/relative/path', 'http://example.org']) {
      expect(resolveExternalUrl(value), value).toBeUndefined();
    }
  });

  it('allows HTTP only for local development hosts', () => {
    expect(resolveExternalUrl('http://localhost:5400/demo')).toBe('http://localhost:5400/demo');
    expect(resolveExternalUrl('http://127.0.0.1:8000/demo')).toBe('http://127.0.0.1:8000/demo');
  });

  it('reports whether a value will render as an external link', () => {
    expect(isConfigured('https://example.org')).toBe(true);
    expect(isConfigured('javascript:alert(1)')).toBe(false);
    expect(isConfigured(undefined)).toBe(false);
  });
});

describe('challenge manifest integrity', () => {
  it('contains exactly sixty distinct challenge records with safe source URLs', () => {
    expect(challengeManifest).toHaveLength(60);
    expect(validateChallengeManifest()).toEqual([]);
    expect(new Set(challengeManifest.map((project) => project.slug)).size).toBe(60);
    expect(challengeManifest.every((project) => project.originalChallengeUrl.startsWith('https://www.frontendmentor.io/challenges/'))).toBe(true);
  });

  it('does not invent screenshots, demo links, repositories, or technologies', () => {
    expect(challengeManifest.every((project) => project.screenshots.length === 0)).toBe(true);
    expect(challengeManifest.every((project) => !project.liveDemoUrl && !project.repositoryUrl)).toBe(true);
    expect(challengeManifest.every((project) => project.technologies.length === 0)).toBe(true);
    expect(challengeManifest.every((project) => project.thumbnail.kind === 'representative-illustration')).toBe(true);
  });
});
