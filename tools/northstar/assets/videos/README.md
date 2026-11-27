# Pattern demonstration videos

The manifest maps every canonical pattern to one supplied MP4 demonstration and records which source archive contains each filename.

## Import the supplied archives

Requirements: Node.js 20+ and the unzip command.

1. Run node tools/northstar/scripts/import-videos.mjs /path/to/Designmotion_part1.zip /path/to/Designmotion_part2.zip.
2. Stage tools/northstar/assets/videos, then commit and push.

The importer verifies all 76 expected filenames, rejects missing, duplicate and unexpected files, checks each MP4 signature, extracts into this directory, and writes each file's byte length and SHA-256 checksum to manifest.json.

MP4 files are stored as ordinary Git blobs (about 1.8 MB each, 132 MB in total); there is no Git LFS rule, because LFS uploads were not possible from the build environment. Keep individual files well under GitHub's 100 MB limit. After import, the generated manifest status changes from awaiting-binary-import to imported.

Until the missing file is added and the importer has been re-run, manifest entries are references to supplied source archives, not repository-hosted video assets.
