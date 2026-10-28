---
name: northstar-ux
description: Use when reviewing, designing, auditing or restyling any interface in this repository. Points at the Northstar UX Engine — four commands, nine skills, and a source-level checker that reports evidence rather than opinions.
---

# Northstar UX

This repository ships its UX engine as a Claude Code plugin at
`tools/northstar/`. This file exists so the engine is reachable through the
repository's own `.agents/skills/` convention, not only through a plugin install.

## Commands

| Command | When | Boundary |
| --- | --- | --- |
| `/ux-review` | A diff needs review before merge | read-only; MUST / SHOULD / NICE with file and line |
| `/ux-design` | A screen needs a spec before code | stops at an approval gate |
| `/ux-audit` | What is wrong with this interface | P0–P3, top three first; fixes only what is chosen |
| `/restyle` | The product looks generic or inconsistent | one axis at a time, writes `DESIGN.md` |

Full definitions: `tools/northstar/commands/`.

## Skills

`intent-discovery`, `information-hierarchy`, `state-completeness`, `form-ux`,
`feedback-and-affordance`, `ux-auditor`, `design-system`, `visual-character`,
`responsive-design` — under `tools/northstar/skills/`. Read the one that matches the
task before writing code; each names the patterns it owns.

## The checker

```bash
npm run ux:audit              # whole repository → stdout + docs/ux/audit-repository.md
npm run ux:check              # exit 1 if anything P1 or worse exists (CI)
npm run ux:test               # the engine's own 41 tests
node tools/northstar/bin/northstar.mjs audit apps/tessera --out docs/ux/audit-tessera.md
```

Every finding carries a file, a line, a snippet and — for contrast — the measured
ratio. Where the engine cannot decide from source it stays silent; 48 of the 76
patterns in `tools/northstar/PATTERNS.md` are manual by design.

## The rule that matters

Do not report as observed anything that was not observed. Source analysis is "found in
source". A browser check is "observed in <browser> at <width>". There is no third
category, and no screenshot exists that was not taken.

## Repository-specific standing instructions

- Preserve app logic, APIs, auth, routing and tests when fixing UX.
- WCAG 2.2 AA is the normal workflow, not a separate pass.
- No commits, pushes or deploys without the user asking. The plugin's
  `guard-writes.mjs` hook enforces this.
- Compute counts from a real run before writing them into a document.
