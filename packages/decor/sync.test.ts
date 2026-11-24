import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs script without types
import { FILES, targets } from '../../scripts/sync-decor.mjs';

const source = path.resolve(__dirname);

describe('decor copies', () => {
  it('every app copy is identical to packages/decor', () => {
    for (const dir of targets() as string[]) {
      for (const file of FILES as string[]) {
        expect(fs.readFileSync(path.join(dir, file), 'utf8'), `${dir}/${file}`).toBe(fs.readFileSync(path.join(source, file), 'utf8'));
      }
    }
  });
});
