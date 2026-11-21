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
- `X01`–`X13`: Northstar-only extensions.
- `P0`–`P3`: severities. The zero padding keeps them apart.
- Every record has a `legacyId` linking it to its 1.0.x number.

`patterns.mjs` is the CLI catalogue; `engine/patternKnowledge.ts` carries the write-ups.
`PATTERNS.md` is generated from `patterns.mjs`; a test fails if it drifts.

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
