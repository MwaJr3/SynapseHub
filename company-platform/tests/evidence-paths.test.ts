/**
 * Provenance claims must point at something that exists.
 *
 * `SUPPLIED_EVIDENCE_LINKS` tells a reader where a piece of work actually lives in
 * this repository. Those strings go stale silently when a directory is moved or
 * removed — which is exactly what happened when the challenge collection moved
 * from `src/apps` to `challenges/`: the claim kept pointing at a directory that no
 * longer existed, and nothing failed.
 *
 * This test makes that failure loud. It deliberately fails when a collection is
 * split into its own branch: at that point the code is no longer in this
 * repository, so the claim has to be rewritten to say where it went, rather than
 * left pointing at an empty path.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SUPPLIED_EVIDENCE_LINKS } from '@/content/evidence';

const REPO = join(process.cwd(), '..');

describe('every provenance claim points at a real path', () => {
  it('names an in-repository path that exists', () => {
    const broken = Object.entries(SUPPLIED_EVIDENCE_LINKS)
      .filter(([, link]) => !existsSync(join(REPO, link.inRepoPath)))
      .map(([key, link]) => `${key}: ${link.inRepoPath}`);

    expect(broken).toEqual([]);
  });

  it('names a single path, not a list hidden in a string', () => {
    // A comma-separated string cannot be checked or linked, and reads as one
    // impossible path. One claim names one location.
    for (const [key, link] of Object.entries(SUPPLIED_EVIDENCE_LINKS)) {
      expect(link.inRepoPath, `${key} names more than one path`).not.toContain(',');
    }
  });
});
