# TidyFiles — file organizer (CLI)

Engineering catalogue **Project 8** (Intermediate).

## Overview
Organizes files into category folders (`documents`, `images`, `audio`, `video`,
`archives`, `code`, `other`) using **content sniffing first** and extension as
fallback — an extension never guarantees content, and mismatches are flagged in
the report rather than trusted.

## Safety requirements (enforced + tested)
- **Dry-run by default** — `--apply` is required for real moves.
- Source and target directories are **explicit arguments**; the tool never scans
  beyond the selected source directory and never deletes files.
- Name conflicts resolve deterministically to `name (1).ext`; existing files are
  **never overwritten**.
- Inaccessible files produce per-file `failed` records; the run continues and the
  report captures every outcome.

## Usage
```bash
python3 -m app.cli ./Downloads ./Sorted                # preview (no changes)
python3 -m app.cli ./Downloads ./Sorted --apply --report report.json
```

## Testing
`python3 -m pytest tests/ -q` — magic-vs-extension mismatch flagging, extension
fallback, unknown types, dry-run no-op behaviour, real moves, conflict
resolution, missing-directory rejection, report serialisation.

## Limitations
Non-recursive by design (predictable scope). No undo manifest yet; cross-device
moves fall back to copy+remove semantics of `Path.rename` failing — such files
are reported as `failed`, not silently lost.

## Future enhancements
Undo manifests, custom rule files, scheduled organization, duplicate detection.
