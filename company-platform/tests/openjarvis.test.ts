/**
 * The OpenJarvis page, held to the same standard as the catalogue.
 *
 * Three things this file exists to prevent, in order of how easy they are to get
 * wrong:
 *
 * 1. **Claiming the work.** OpenJarvis is somebody else's Apache-2.0 project. The
 *    page has to say so, and has to describe the fork as a fork.
 * 2. **Documenting a contract that does not exist.** The page names an endpoint
 *    and a route; the provider preset has to agree with it, and the two products'
 *    configuration has to agree with the variables those projects actually read.
 * 3. **Inventing a destination.** Every external URL on the page has to be one of
 *    the four real sources.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTION,
  OPENJARVIS_SOURCES,
  PRODUCTS_USING_A_MODEL,
  SERVER_CONTRACT,
  WHAT_IT_IS,
  WHAT_THIS_REPOSITORY_DID,
} from '@/content/openjarvis';
import { presetFor } from '@/lib/assistant/provider';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('openjarvis attribution', () => {
  it('names Apache-2.0 and disclaims ownership', () => {
    expect(ATTRIBUTION).toContain('Apache-2.0');
    expect(ATTRIBUTION).toMatch(/not owned by|not affiliated/);
    expect(ATTRIBUTION).toMatch(/fork/i);
  });

  it('links only the four real sources, all https', () => {
    const urls = OPENJARVIS_SOURCES.map((source) => source.href);
    expect(urls).toEqual([
      'https://openjarvis.stanford.edu/',
      'https://open-jarvis.github.io/OpenJarvis/',
      'https://github.com/open-jarvis/OpenJarvis',
      'https://github.com/MwaJr3/OpenJarvis',
    ]);
    for (const url of urls) expect(url.startsWith('https://')).toBe(true);
  });

  it('describes the fork as kept in sync rather than as our work', () => {
    const fork = OPENJARVIS_SOURCES.find((source) => source.href.includes('MwaJr3'));
    expect(fork?.note).toMatch(/not our work/i);
  });

  it('lists all five primitives the project publishes', () => {
    expect(WHAT_IT_IS.primitives.map((primitive) => primitive.name)).toEqual([
      'Intelligence',
      'Engine',
      'Agents',
      'Tools & memory',
      'Learning',
    ]);
  });
});

describe('the documented contract matches the code', () => {
  it('names the endpoint the provider preset actually uses', () => {
    const preset = presetFor('openjarvis');
    expect(preset?.baseUrl).toBe('http://127.0.0.1:8000/v1');

    const start = SERVER_CONTRACT.find((row) => row.label === 'Start it');
    expect(start?.value).toContain('http://localhost:8000');
    // Both appear, and they are the same server: 127.0.0.1 and localhost are
    // interchangeable for a loopback bind, but the page should not imply two.
    expect(preset?.baseUrl.replace('127.0.0.1', 'localhost')).toBe('http://localhost:8000/v1');
  });

  it('documents the two routes the integration calls', () => {
    const routes = SERVER_CONTRACT.map((row) => row.value).join(' ');
    expect(routes).toContain('/v1/chat/completions');
    expect(routes).toContain('/v1/models');
  });

  it('every claimed path exists in this repository', () => {
    for (const step of WHAT_THIS_REPOSITORY_DID) {
      expect(existsSync(join(REPO, step.path)), step.path).toBe(true);
    }
  });

  it('documents configuration each product actually reads', () => {
    for (const product of PRODUCTS_USING_A_MODEL) {
      const file = join(REPO, product.path);
      expect(existsSync(file), product.path).toBe(true);
      const source = readFileSync(file, 'utf8');
      // The tokens that file must contain, so the page cannot document an
      // environment contract that project does not implement.
      expect(product.reads.length).toBeGreaterThan(0);
      for (const token of product.reads) {
        expect(source, `${product.product} does not read ${token}`).toContain(token);
      }
    }
  });

  it('points at a local endpoint in both product examples', () => {
    for (const product of PRODUCTS_USING_A_MODEL) {
      expect(product.configuration).toContain('http://127.0.0.1:8000/v1');
    }
  });

  it('claims no performance figure', () => {
    // The upstream research publishes its own numbers; repeating them here as if
    // we had measured them is the failure this guards against.
    const prose = JSON.stringify([WHAT_IT_IS, WHAT_THIS_REPOSITORY_DID, SERVER_CONTRACT]);
    expect(prose).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(prose).not.toMatch(/\b\d+(\.\d+)?\s?×|\bx faster\b/);
  });
});
