# Architecture

Northstar has three layers that share one pattern catalogue.

| Layer | Where | Role |
| --- | --- | --- |
| Plugin | `commands/`, `skills/`, `agents/`, `hooks/`, `templates/` | What Claude Code loads: four commands, nine skills, three agents, two hooks |
| Rules CLI | `bin/northstar.mjs`, `rules.mjs`, `engine.mjs`, `lib/` | Zero-dependency Node ESM. Reads source and reports severity-ranked findings (P0–P3) |
| Pattern engine | `engine/*.ts` | TypeScript: 76 patterns with write-ups, retrieval and tests (vitest) |

## Evidence kinds

Every finding says how it is known:

- **source** — found by reading code (`audit`, `scan`, hooks);
- **measured** — read from a real browser by `northstar page`;
- **visual** — seen in a screenshot, not measured.

Anything not done is listed under *Not checked*. A tool that cannot run says so
(`page` exits 3) and never substitutes a guess.

## Numbering

- `P01`–`P76`: canonical patterns (the engine writes `P1`–`P76`).
- `X01`–`X16`: Northstar-only extensions.
- `P0`–`P3`: severities. The zero padding keeps them apart.
- Every record has a `legacyId` linking it to its 1.0.x number.

`patterns.mjs` is the CLI catalogue; `engine/patternKnowledge.ts` carries the write-ups.
`PATTERNS.md` is generated from `patterns.mjs`; a test fails if it drifts. The TypeScript pattern definitions, CLI catalogue and full knowledge write-ups still have overlapping registry data, so catalogue single-sourcing remains a planned refactor rather than a completed property.

## Hooks

| Hook | Event | Strength |
| --- | --- | --- |
| `guard-writes.mjs` | PreToolUse, Bash | **Enforced** — exit 2 blocks commits, pushes, publishes, recursive deletes |
| `post-edit-advisory.mjs` | PostToolUse, Edit/Write/MultiEdit | **Advisory** — always exit 0; up to five P0–P2 findings as context |

## Runtime probe

`lib/page-probe.mjs` drives headless Chromium through Playwright, which is optional and
resolved at run time. It opens only http(s) URLs and local files, never clicks or
submits, and interprets raw measurements in a pure function (`interpretProbe`) that is
unit-tested without a browser.


## Knowledge provenance and governance

Source-derived knowledge is staged under `knowledge/records/` and validated against `knowledge/schema.json`. Records retain source type, bibliographic metadata, a precise chapter/page/timecode/URL locator, evidence status, integration disposition and review status. Validation checks shape, date and locator consistency, canonical pattern references and duplicate IDs. It does not establish source truth or approve integration. A human reviewer and timestamp are required before a record can be marked approved; canonical pattern data is changed only through a separate reviewed integration.

## Video evidence lifecycle

The 76-entry manifest maps one supplied MP4 to each canonical pattern and records its source archive. The importer validates archive membership, duplicates, missing files, MP4 signatures and SHA-256 checksums. Git LFS tracks the MP4 binaries. A manifest marked `awaiting-binary-import` describes expected source assets only; it does not mean the video files are present in the repository.
