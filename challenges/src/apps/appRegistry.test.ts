import { describe, expect, it } from 'vitest';
import { appRouteCount, appSlugs, getAppDefinition } from './appRegistry';
import { challengeManifest } from '../manifest';

describe('interactive prototype registry', () => {
  it('provides one explicit app mode for every challenge slug', () => {
    expect(appRouteCount).toBe(60);
    expect(new Set(appSlugs)).toEqual(new Set(challengeManifest.map((record) => record.slug)));
    const modes = challengeManifest.map((record) => getAppDefinition(record).mode);
    expect(modes).toHaveLength(60);
    expect(modes).toContain('collection');
    expect(modes).toContain('game');
    expect(modes).toContain('api');
    expect(modes).toContain('editorial');
  });
});
