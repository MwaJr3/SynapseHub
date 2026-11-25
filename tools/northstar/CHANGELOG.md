# Changelog

All notable changes to the Northstar UX Engine. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning is
[semantic](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `northstar add decor|magicui <name…> <srcDir>` copies decorative components into an app. The magicui set is an optional, vendored (MIT) subset: blur-fade, number-ticker, marquee, border-beam, shine-border, animated-shiny-text, magic-card, scroll-progress, dot-pattern, with their Tailwind 4 keyframes. The dependency-free `packages/decor` kit stays the default.

### Added
- Three rules from a second pass over the videos: `icon-button-unnamed` (P66), `toast-no-live-region` (P40), `draggable-no-keyboard` (P19). 51 rules in total.

## [1.1.0] — 2026-11-20

### Added

- **Pattern knowledge.** All 76 write-ups (426 insights, do/don't lists) are carried in
  `engine/patternKnowledge.ts` and attached to every engine pattern.
- **Four checks:** `tabindex-positive` (P46), `image-without-dimensions` (X01),
  `input-type-generic` (X05), `click-on-non-interactive` (X13), plus `otp-autocomplete`
  (P60), `password-autocomplete` (P57), `transition-all` (P09), `linear-easing` (P21) and
  `accordion-without-expanded` (P62), then eight from the video series: `invalid-on-load`,
  `invalid-without-description` (P24), `switch-without-checked` (P41),
  `validate-on-every-keystroke` (P50), `truncated-bar-axis` (P08), `file-input-accept` (P56),
  `progress-without-value` (P28), `dark-pure-black` (P73), `paste-blocked` (P57),
  `zindex-without-position` (P44), `ai-cliche-copy` (X14) and `gradient-opposed-hues` (X15).
  48 rules in total.
- **`northstar page`** — measures a URL or HTML file in a real browser at 320/768/1280px
  (optional Playwright; honest "Not measured", exit 3, when unavailable).
- **Advisory PostToolUse hook** that audits each edited file; never blocks.
- **`ux-designer` agent**; `/ux-design` now delegates to it and adds users and
  assumptions, a textual wireframe, component specification, responsive behaviour,
  acceptance criteria and pattern citations.
- `/ux-audit` accepts source, URL/file and screenshots, labelling evidence as
  source, measured or visual.
- `PATTERNS.md` is generated (`patterns --markdown`) and tested for drift.

### Changed

- `numeric-cells` ignores formatted dates; `pagination-not-in-url` no longer matches CSS class names like `page-content` and accepts hash/history state.
- `small-target` reads the project's stylesheets, so a class such as `.icon-button { padding: 7px }` is no longer reported as unpadded; `nav-missing-current` accepts `aria-pressed`/`aria-selected`/`role=tab` as state.
- Source findings are labelled "Found in source" in the report, not "Measured".
- **Unified numbering.** CLI patterns are `P01`–`P76`, matching the engine's `P1`–`P76`;
  Northstar-only checks are `X01`–`X13`; each keeps a `legacyId` to its 1.0.x number.
  Rule, skill and README references were remapped.

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
