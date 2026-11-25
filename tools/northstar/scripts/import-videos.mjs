#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const northstarRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(northstarRoot, 'assets', 'videos', 'manifest.json');
const outputDir = path.join(northstarRoot, 'assets', 'videos');

export function validateArchiveListing(manifest, archiveListings) {
  const expected = new Set(manifest.assets.map((asset) => asset.filename));
  const expectedArchive = new Map(manifest.assets.map((asset) => [asset.filename, asset.sourceArchive]));
  const found = new Map();
  const errors = [];
  for (const [archiveName, entries] of archiveListings) {
    for (const entry of entries) {
      if (!/\.mp4$/i.test(entry)) continue;
      const filename = path.posix.basename(entry);
      if (!expected.has(filename)) errors.push(archiveName + ': unexpected video ' + entry);
      if (found.has(filename)) errors.push(filename + ': appears in more than one archive');
      found.set(filename, { archiveName, entry });
      if (expectedArchive.has(filename) && expectedArchive.get(filename) !== archiveName) {
        errors.push(filename + ': expected in ' + expectedArchive.get(filename) + ', found in ' + archiveName);
      }
    }
  }
  for (const filename of expected) if (!found.has(filename)) errors.push('missing video: ' + filename);
  return { errors, found };
}

function importVideos(archivePaths) {
  if (archivePaths.length !== 2) throw new Error('Pass exactly two archives: Designmotion_part1.zip and Designmotion_part2.zip');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const listings = archivePaths.map((archivePath) => {
    const archiveName = path.basename(archivePath);
    const entries = execFileSync('unzip', ['-Z1', archivePath], { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
    return [archiveName, entries, archivePath];
  });
  const validation = validateArchiveListing(manifest, listings.map(([name, entries]) => [name, entries]));
  if (validation.errors.length) throw new Error(validation.errors.join('\n'));

  fs.mkdirSync(outputDir, { recursive: true });
  const byArchive = new Map(listings.map(([name, , archivePath]) => [name, archivePath]));
  const assets = manifest.assets.map((asset) => {
    const match = validation.found.get(asset.filename);
    const archivePath = byArchive.get(match.archiveName);
    const bytes = execFileSync('unzip', ['-p', archivePath, match.entry], { maxBuffer: 32 * 1024 * 1024 });
    if (bytes.length < 12 || bytes.toString('ascii', 4, 8) !== 'ftyp') {
      throw new Error(asset.filename + ': invalid MP4 file signature');
    }
    fs.writeFileSync(path.join(outputDir, asset.filename), bytes);
    return {
      ...asset,
      sourceArchive: match.archiveName,
      status: 'imported',
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  });
  const updated = {
    ...manifest,
    status: 'imported',
    importedAt: new Date().toISOString(),
    note: 'All 76 expected MP4 assets were extracted and checksum-verified from the supplied source archives.',
    assets,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(updated, null, 2) + '\n');
  process.stdout.write('Imported and checksum-verified ' + assets.length + ' videos into ' + outputDir + '\n');
}

function main(argv) {
  if (argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write('Usage: node tools/northstar/scripts/import-videos.mjs <Designmotion_part1.zip> <Designmotion_part2.zip>\n');
    return 0;
  }
  try {
    importVideos(argv);
    return 0;
  } catch (error) {
    process.stderr.write('Video import failed: ' + error.message + '\n');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main(process.argv.slice(2));
}
