/**
 * The umbrella page: a system is linked only when its address is configured, and
 * an unconfigured one is described honestly rather than linked nowhere.
 */
import { describe, expect, it } from 'vitest';

import { resolveSystems, safeUrl, SYSTEMS, unconfiguredLabel } from '@/content/ecosystem';

describe('safeUrl', () => {
  it('accepts http and https', () => {
    expect(safeUrl('https://tessera.example.test')).toBe('https://tessera.example.test/');
    expect(safeUrl('http://localhost:5197')).toBe('http://localhost:5197/');
  });

  it('rejects anything that is not a safe absolute http(s) URL', () => {
    for (const value of [
      undefined,
      null,
      '',
      '   ',
      'tessera.example.test',
      '/products',
      '#',
      'javascript:alert(1)',
      'data:text/html,hi',
      'ftp://example.test',
    ]) {
      expect(safeUrl(value)).toBeNull();
    }
  });
});

describe('resolveSystems', () => {
  it('links exactly the systems whose address is configured', () => {
    const resolved = resolveSystems({
      NEXT_PUBLIC_TESSERA_URL: 'https://tessera.example.test',
      NEXT_PUBLIC_REACHLEARN_URL: '',
    });
    const byId = Object.fromEntries(resolved.map((system) => [system.id, system]));
    expect(byId.tessera?.url).toBe('https://tessera.example.test/');
    expect(byId.reachlearn?.url).toBeNull();
    // Every system is still listed: absence is stated, not hidden.
    expect(resolved).toHaveLength(SYSTEMS.length);
  });

  it('treats a dangerous value as unconfigured instead of rendering it', () => {
    const [tessera] = resolveSystems({ NEXT_PUBLIC_TESSERA_URL: 'javascript:alert(1)' });
    expect(tessera?.url).toBeNull();
  });

  it('says what a visitor sees when there is no address', () => {
    expect(unconfiguredLabel('staged')).toBe('Not deployed yet');
    expect(unconfiguredLabel('planned')).toBe('Planned');
    expect(unconfiguredLabel('live')).toBe('Not deployed yet');
  });

  it('keeps every system attached to a company and a reason to exist', () => {
    for (const system of SYSTEMS) {
      expect(system.companySlug).toMatch(/^(tamuzi-learning|velaqori-systems)$/);
      expect(system.tagline.length).toBeGreaterThan(20);
      expect(system.distinctFrom.length).toBeGreaterThan(20);
      expect(system.urlEnvVar.startsWith('NEXT_PUBLIC_')).toBe(true);
    }
  });

  it('has unique ids and no duplicate front doors', () => {
    const ids = SYSTEMS.map((system) => system.id);
    expect(new Set(ids).size).toBe(ids.length);
    const vars = SYSTEMS.map((system) => system.urlEnvVar);
    expect(new Set(vars).size).toBe(vars.length);
  });
});
