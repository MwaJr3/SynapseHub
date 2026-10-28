# Northstar — the knowledge layer

This directory is the TypeScript half of **Northstar**, the standalone UX/UI engine
(`tools/northstar/`). It holds the design intelligence: 76 catalogued patterns, the
executable rule catalogue, the constraint math, the token graph, the state machine and
the static source detectors that run over every frontend in this repository.

**It is not part of any website.** Until 2026-10-28 the same code also powered an
interactive studio at `/ux-engine` inside the portfolio site. That page, its components
and its tests were removed: the engine is a tool that audits and fixes projects, so it
lives in `tools/` and is reached through the `northstar` command, not through a route.

Two detector layers share this project and one command line:

| Layer | Where | What it finds | Reached by |
| --- | --- | --- | --- |
| Severity-ranked rules | `../rules.mjs`, `../engine.mjs` | 27 source checks reported as P0–P3, with a fixer | `northstar audit`, `check`, `fix`, `watch` |
| Static detectors | `scanner/`, `scan.ts` (this directory) | 15 detector families with file:line evidence, written to `docs/UX_ENGINE_REPO_AUDIT.md` | `northstar scan` |

The two sets check different things — `rules.mjs` has `table-semantics`,
`pagination-not-in-url` and `swallowed-error`, which the detectors do not; the detectors
have heading order, document language, keyboard traps and scroll regions, which the
rules do not. Both are needed, so neither was deleted; they are now one project with one
entry point instead of two tools in two trees.

Everything below describes this layer.

## Architecture

| Layer                | File                              | Responsibility                                                                                                                                                                                 |
| -------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types                | `types.ts`                        | Shared vocabulary: patterns, rules, descriptors, findings, state matrices, tokens, commands                                                                                                    |
| Pattern knowledge    | `patterns.ts`, `relationships.ts` | All 76 catalog patterns with evidence (`*.mp4`), rules, do/don't, thresholds, a11y/responsive implications, composition and conflicts; the blueprint's relationship map                        |
| Rule catalog         | `rules.ts`                        | Executable policy (e.g. `A11Y-CONTRAST-01`); each rule cites the patterns that establish it                                                                                                    |
| Constraint engine    | `constraints.ts`                  | Pure deterministic checks: WCAG 2.x relative-luminance/contrast math, 44px targets, 4px spacing scale, radius scale, 100–500ms motion, 100ms Doherty feedback, stacking layers                 |
| State machine engine | `stateMachine.ts`                 | The blueprint's 14-state matrix with minimum behavior, entry, feedback, ARIA, recovery and persistence; per-component required states; canonical transitions and their validation              |
| Design system engine | `tokens.ts`                       | Primitive → semantic → component token graph, 14 required token families, baseline scales, light/dark themes, graph integrity checks, CSS/Tailwind adapters, restyle planning                  |
| Responsive engine    | `responsive.ts`                   | Viewport/pointer/hover capability rules, overlay-to-sheet behavior, breakpoint plans                                                                                                           |
| Content engine       | `microcopy.ts`                    | Outcome CTAs, four classified empty states, error recovery templates, tone checks                                                                                                              |
| Retrieval            | `retrieval.ts`                    | Hybrid lexical + hard-constraint ranking over patterns, with match reasons and trade-off conflicts                                                                                             |
| Audit / scoring      | `audit.ts`                        | Runs every check against a screen descriptor; findings carry severity, confidence, impacted users, remediation, verification and full traceability; weighted score, A–D grade, top-three fixes |
| Adapters             | `adapters.ts`                     | React + Tailwind component generation preserving the state model; executable Vitest/Testing Library acceptance checks                                                                          |
| Commands             | `commands.ts`                     | The eight blueprint slash commands as functions                                                                                                                                                |
| Fixtures             | `fixtures.ts`                     | Deliberately flawed and pattern-aligned checkout screens used by the studio and tests                                                                                                          |

## The eight commands

| Command       | Output                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/ux-review`  | Must/should/nice findings with file/line references and the triggering rule                                                           |
| `/ux-design`  | Pre-code spec: user/goal, task flow, component map, states, content, a11y, responsive behavior, motion, acceptance criteria           |
| `/ux-audit`   | Severity-ranked findings, score and grade, top three fixes, what works, pattern map                                                   |
| `/restyle`    | Token-only before/after decisions; product logic untouched                                                                            |
| `/ux-pattern` | Ranked patterns, conflicts/trade-offs, generated rule set                                                                             |
| `/ux-states`  | Full state matrix, transitions and coverage gap for a component kind                                                                  |
| `/ux-system`  | Token graph validation plus generated CSS custom properties and Tailwind theme                                                        |
| `/ux-test`    | Executable acceptance checks for keyboard, screen-reader semantics, contrast, touch targets, loading, errors, undo and reduced motion |

## Traceability contract

Nothing the engine says is a black-box opinion:

```
finding → rule id (rules.ts) → pattern ids (patterns.ts) → evidence video
```

The tests enforce the chain — every pattern references rules that exist, every
rule's pattern links are reciprocated, and every finding carries remediation
and verification steps.

## Determinism

All checks are pure functions of their inputs: the same descriptor always
produces the same report. Color math follows the WCAG 2.x relative-luminance
formula (black/white = 21:1); spatial checks use the documented baseline
scales (spacing 4/8/12/16/24/32/48/64, radius 4/8/12/16/24, touch 44px, motion
100–500ms, feedback ≈100ms).

## Static code scanner

The interactive auditor evaluates screen _descriptors_; the scanner applies
the same rule catalog to real repository source so every frontend in the
monorepo can be audited mechanically.

- `scanner/detectors.ts` — pure, deterministic source detectors (focus
  removal, 44px targets, label associations, accessible names, image alt
  text, autoFocus, heading order, document language, key handlers on
  non-interactive elements, keyboard-reachable scroll regions, z-index
  escalation, spacing tokens, motion vocabulary, reduced-motion fallbacks,
  WCAG contrast pairs, hover-only handlers). JSX tags are parsed with a
  brace-aware walker over a comment-masked view of the source, so multiline
  tags, `=>` inside handlers, markup inside JSDoc and dynamic
  `htmlFor`/`id` associations (static, template-literal and variable forms)
  are understood rather than guessed. Contrast math resolves CSS custom
  properties per theme block — including `rgb(var(--token))` channel
  triplets, `var()` fallbacks and nested references — so colours are never
  paired across themes that cannot co-occur, and alpha/hsl values the math
  cannot prove are skipped rather than guessed.
- `scanner/walk.ts` — Node-only filesystem walker and per-root orchestration;
  the tooling directory itself is excluded so detector source literals never
  self-flag. Entry `index.html` documents are attached to each target as
  explicit extra files for the document-language detector.
- `scan.ts` — the scan layer (`northstar scan`, `npm run ux:scan`, `--strict` for CI)
  that discovers every frontend root and regenerates `docs/UX_ENGINE_REPO_AUDIT.md`
  with file:line evidence.
- `scanner/repoScan.test.ts` — regression gate: the portfolio must stay
  finding-free, no frontend may regain a critical/major/high-confidence
  finding, and the low-confidence scroll-region inventory is pinned by
  location so a new cue cannot appear without a conscious review.

Confidence is explicit: mechanical facts are high confidence; structural
heuristics are medium/low and say so. Minified stylesheets (lines over 500
characters) are excluded from spacing-token linting, sub-4px optical values
are treated as hairlines rather than rhythm tokens, and sub-millisecond
durations are accepted as the standard reduced-motion "instant" override.
Static analysis cannot replace runtime keyboard, screen-reader or viewport
testing — the report states this alongside every result. Two runtime layers
close the gap: `src/test/axe-a11y.test.tsx` runs axe-core (WCAG 2.x AA +
best-practice rules) against the jsdom-rendered DOM of the key routes, and
the Playwright suite in `e2e/` runs a real Chromium over every route with
the full axe rule set (colour contrast, target size and scrollable-region
focusability included), plus keyboard-trap, reduced-motion, hit-box and
visual-regression checks. The whole gate — typecheck, lint, tests, strict
scan, report-drift check and build — runs in `.github/workflows/ux-quality.yml`,
and the browser suite runs in `.github/workflows/e2e.yml`.

## Tests

```bash
npx vitest run tools/northstar/engine   # detectors, rules, constraints, gate tests
npm run ux:scan                         # regenerate the repository audit
npm run ux:test                         # the CLI, plugin and fixer tests
```

Coverage includes pattern/rule integrity, WCAG ratio math, state-machine
transition validation, token-graph integrity, retrieval ranking, microcopy
tone, end-to-end audits of both fixtures (flawed → grade D with critical
findings; polished → grade A), command output shape and code generation, plus
scanner detector calibration (true positives, negative cases and the
false-positive guards above) and the repository-wide regression gate.
