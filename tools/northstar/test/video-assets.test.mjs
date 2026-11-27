import fs from 'node:fs';
import { createHash } from 'node:crypto';
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

  it('distinguishes a manifest-only checkout from a verified binary import', () => {
    assert.equal(manifest.sourceArchives.reduce((sum, archive) => sum + archive.videoCount, 0), 76);
    if (manifest.status === 'awaiting-binary-import') {
      assert.ok(manifest.assets.every((asset) => asset.status === 'awaiting-binary-import'));
      assert.ok(manifest.assets.every((asset) => asset.sha256 === undefined && asset.bytes === undefined));
      return;
    }

    assert.equal(manifest.status, 'imported');
    manifest.assets.forEach((asset) => {
      const videoPath = path.join(root, 'assets/videos', asset.filename);
      assert.equal(asset.status, 'imported');
      assert.ok(Number.isInteger(asset.bytes) && asset.bytes > 12);
      assert.match(asset.sha256, /^[a-f0-9]{64}$/);
      assert.ok(fs.existsSync(videoPath), asset.filename + ' must exist after import');
      const bytes = fs.readFileSync(videoPath);
      assert.equal(bytes.length, asset.bytes);
      assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
      assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
    });
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

  it('stores MP4 files as ordinary Git blobs (no LFS rule)', () => {
    const file = path.resolve(root, '../..', '.gitattributes');
    const attributes = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    assert.doesNotMatch(attributes, /assets\/videos\/\*\.mp4 filter=lfs/);
  });
});
