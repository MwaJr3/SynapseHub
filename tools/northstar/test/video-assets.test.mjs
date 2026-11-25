import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateArchiveListing } from '../scripts/import-videos.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/videos/manifest.json'), 'utf8'));

describe('76-pattern video evidence manifest', () => {
  it('maps every canonical pattern to one uniquely named MP4', () => {
    assert.equal(manifest.assets.length, 76);
    assert.equal(new Set(manifest.assets.map((asset) => asset.patternId)).size, 76);
    assert.equal(new Set(manifest.assets.map((asset) => asset.filename)).size, 76);
    manifest.assets.forEach((asset, index) => {
      assert.equal(asset.patternId, 'P' + (index + 1));
      assert.match(asset.filename, /^[a-z0-9-]+\.mp4$/);
      assert.ok(['Designmotion_part1.zip','Designmotion_part2.zip'].includes(asset.sourceArchive));
    });
  });

  it('records the supplied archive split without claiming binaries are already committed', () => {
    assert.equal(manifest.sourceArchives.reduce((sum, archive) => sum + archive.videoCount, 0), 76);
    assert.equal(manifest.status, 'awaiting-binary-import');
    assert.ok(manifest.assets.every((asset) => asset.status === 'awaiting-binary-import'));
  });

  it('detects missing, duplicate, unexpected and wrongly assigned archive entries', () => {
    const sample = { assets: [
      { filename: 'a.mp4', sourceArchive: 'part1.zip' },
      { filename: 'b.mp4', sourceArchive: 'part2.zip' },
    ] };
    const result = validateArchiveListing(sample, [
      ['part1.zip', ['a.mp4', 'extra.mp4']],
      ['part2.zip', ['a.mp4']],
    ]);
    assert.ok(result.errors.some((error) => error.includes('unexpected')));
    assert.ok(result.errors.some((error) => error.includes('more than one')));
    assert.ok(result.errors.some((error) => error.includes('missing')));
    assert.ok(result.errors.some((error) => error.includes('expected in')));
  });

  it('configures MP4 files for Git LFS', () => {
    const attributes = fs.readFileSync(path.resolve(root, '../..', '.gitattributes'), 'utf8');
    assert.match(attributes, /assets\/videos\/\*\.mp4 filter=lfs/);
  });
});
