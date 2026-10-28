# Changelog

All notable changes to the Northstar UX Engine. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
[semantic](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `fixed-width-container` check (P66): a hard pixel width at or above 360px that
  cannot shrink inside a 320px viewport.

### Changed

- A repository-wide sweep against the portfolio's 37 projects took the audit from
  **334 defects / 806 occurrences** to **0 defects**, with every fix landing in
  shared source rather than per-screen patches. The rule changes below came from
  findings that were provably wrong when checked against the source.
- `bare-loading` now looks at the element the loading text sits in. The previous
  300-character window skipped a page-level loader whenever *any* nearby button was
  disabled, which hid a real defect inside a form.
- `radius-off-scale` counts length literals instead of shorthand strings, and treats
  `var(--radius-…)` references and percentages as on-scale. A token reference *is*
  the scale; a percentage is a shape (circle, blob), not a corner step. A stylesheet
  with six hand-written `px` values still fails.
- `nav-missing-current` accepts a project that wraps React Router's `NavLink` in its
  own component (`CurrentNavLink`, `ActiveLink`): the component owns the marking,
  and the marking is still audited where it is written.

### Fixed

- Rule fixtures re-verified after the changes above: the calibration pair still
  produces exactly its planted defects (`bad-form`: 6 rule ids, `accessible-markup-
  with-defect`: exactly one finding), and 41/41 tests pass.

## [1.0.0] — 2026-10-27

First version, built against the SynapseHub portfolio (37 projects, 334 defects
found on first run).

### Added

- **Four commands.** `/ux-review` (read-only diff review with MUST / SHOULD / NICE),
  `/ux-design` (spec before code, with an approval gate), `/ux-audit` (P0–P3, top
  three first, audit vs fix modes), `/restyle` (axis-by-axis, writes `DESIGN.md`,
  reports before/after).
- **Nine skills**, written for auto-activation: `intent-discovery`,
  `information-hierarchy`, `state-completeness`, `form-ux`,
  `feedback-and-affordance`, `ux-auditor`, `design-system`, `visual-character`,
  `responsive-design`.
- **Two specialists**: `ux-auditor` (finds and judges, never edits) and
  `design-system-cartographer` (inventories an existing system before anyone
  replaces it).
- **A pattern library** of 76 patterns (`patterns.mjs`, documented in
  `PATTERNS.md`) — 27 of them machine-checked, the rest explicitly manual.
- **27 source-level checks** covering contrast (measured, not eyeballed), focus,
  labels, disabled reasons, destructive confirmations, swallowed errors, motion and
  reduced motion, z-index, radii, table semantics, pagination state and fixed-width
  overflow — across React/Vue/Svelte/Angular/HTML and server-rendered Python string
  templates.
- **A CLI** (`bin/northstar.mjs`): `audit`, `review`, `check`, `patterns`. No
  dependencies, no network.
- **A hook** (`hooks/guard-writes.mjs`) that blocks commits, pushes, publishes,
  deploys and recursive deletes until the user authorises them, with a documented
  override.
- **Tests** using `node --test`: structure, command contracts, skill/pattern
  coverage, engine calibration on five fixtures, and safety/scope.

### Notes

- Checks read source only. Nothing in the engine opens a browser, so findings are
  reported as "found in source" and rendering-level checks are listed as unchecked.
- The five fixtures exist to keep the engine honest in both directions: the broken
  ones must produce exactly their planted defects, and the nearly-correct one must
  produce exactly one.
