# Architecture

Northstar has five cooperating layers. The pattern catalogue remains the canonical baseline; source-derived knowledge and demonstration media are linked to it rather than silently rewriting it.

| Layer | Where | Role |
| --- | --- | --- |
| Plugin | `commands/`, `skills/`, `agents/`, `hooks/`, `templates/` | What Claude Code loads: four commands, nine skills, three agents, two hooks |
| Rules CLI | `bin/northstar.mjs`, `rules.mjs`, `engine.mjs`, `lib/` | Zero-dependency Node ESM. Reads source and reports severity-ranked findings (P0–P3) |
| Pattern engine | `engine/*.ts` | TypeScript: 76 patterns with write-ups, retrieval, constraints, state models and tests (vitest) |
| Knowledge acquisition | `knowledge/`, `scripts/validate-knowledge.mjs` | Source-attributed, staged records with evidence status, integration disposition and human approval |
| Demonstration assets | `assets/videos/`, `scripts/import-videos.mjs` | One manifest entry per canonical pattern; MP4 binaries stored with Git LFS after local import |

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

`patterns.mjs` is the CLI catalogue; `engine/patternKnowledge.ts` carries the write-ups. `PATTERNS.md` is generated from `patterns.mjs`; a test fails if it drifts. `assets/videos/manifest.json` maps each TypeScript pattern ID and slug to its source demonstration. The manifest can exist before binaries are imported, and its status makes that distinction explicit.

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

New knowledge is stored as proposed records under knowledge/records/, validated against knowledge/schema.json. Every record must identify its source and a retrievable location. Evidence status distinguishes source-stated claims, source-supported interpretation, external verification, analytical synthesis, implementation inference and unverified claims. Integration disposition distinguishes new knowledge, enrichment, refinement, duplicate, contextual exception, conflict, obsolete guidance and material not suitable for the engine.

The validator checks record shape, source locators, dates, canonical pattern references, duplicate IDs and related-record references. It does not decide whether a claim is true or approve a record. Human review is required before a record can be marked approved; approved records require reviewer identity and timestamp. The canonical 76-pattern catalogue remains unchanged until an accepted integration is explicitly implemented and reviewed.

## Video evidence lifecycle

The manifest enumerates the 76 expected MP4 files and the source archive each came from. The import script checks archive membership, duplicate and missing filenames, MP4 signatures, byte lengths and SHA-256 checksums. .gitattributes routes MP4 files through Git LFS. A manifest entry marked awaiting-binary-import is a reference only; it is not evidence that the binary exists in the repository.
