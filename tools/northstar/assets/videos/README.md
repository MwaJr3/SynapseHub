# Pattern demonstration videos

The manifest maps every canonical pattern to one supplied MP4 demonstration and records which source archive contains each filename.

## Import the supplied archives

Requirements: Node.js 20+, the unzip command, and Git LFS.

1. Run git lfs install.
2. Run node tools/northstar/scripts/import-videos.mjs /path/to/Designmotion_part1.zip /path/to/Designmotion_part2.zip.
3. Stage .gitattributes and tools/northstar/assets/videos, then commit and push.

The importer verifies all 76 expected filenames, rejects missing, duplicate and unexpected files, checks each MP4 signature, extracts into this directory, and writes each file's byte length and SHA-256 checksum to manifest.json.

MP4 files are tracked with Git LFS. Do not remove the LFS rule or commit large MP4 binaries as ordinary Git blobs. After import, the generated manifest status changes from awaiting-binary-import to imported.

Until that import and LFS push have completed, manifest entries are references to supplied source archives, not repository-hosted video assets.
