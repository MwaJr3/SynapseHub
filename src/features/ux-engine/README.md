# Advanced UX/UI Engine

Pattern-driven design intelligence, interaction architecture and UX auditing,
implemented from `Advanced_UX_UI_Engine_Blueprint.pdf`. The engine behaves like
a senior product designer, interaction designer, accessibility specialist,
design-systems architect and UX auditor working together — entirely in the
browser, deterministically, with no external service calls.

The interactive studio lives at **`/ux-engine`**
(`src/pages/UXEnginePage.tsx`, components in `src/components/ux-engine/`).

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
  text, autoFocus, z-index escalation, spacing tokens, motion vocabulary,
  reduced-motion fallbacks, WCAG contrast pairs, hover-only handlers). JSX
  tags are parsed with a brace-aware walker over a comment-masked view of
  the source, so multiline tags, `=>` inside handlers, markup inside JSDoc
  and dynamic `htmlFor`/`id` associations (static, template-literal and
  variable forms) are understood rather than guessed.
- `scanner/walk.ts` — Node-only filesystem walker and per-root orchestration;
  the tooling directory itself is excluded so detector source literals never
  self-flag.
- `scripts/ux-scan.ts` — CLI (`npm run ux:scan`, `--strict` for CI) that
  discovers every frontend root and regenerates
  `docs/UX_ENGINE_REPO_AUDIT.md` with file:line evidence.
- `scanner/repoScan.test.ts` — regression gate: the portfolio must stay
  finding-free and no frontend may regain a critical/major/high-confidence
  finding.

Confidence is explicit: mechanical facts are high confidence; structural
heuristics are medium/low and say so. Minified stylesheets (lines over 500
characters) are excluded from spacing-token linting, sub-4px optical values
are treated as hairlines rather than rhythm tokens, and sub-millisecond
durations are accepted as the standard reduced-motion "instant" override.
Static analysis cannot replace runtime keyboard, screen-reader or viewport
testing — the report states this alongside every result, and
`src/test/axe-a11y.test.tsx` closes part of that gap by running axe-core
(WCAG 2.x AA + best-practice rules) against the rendered DOM of the key
routes. The whole gate — typecheck, lint, tests, strict scan, report-drift
check and build — runs in `.github/workflows/ux-quality.yml`.

## Tests

```bash
npx vitest run src/features/ux-engine      # engine, scanner and gate tests
npx vitest run src/pages/UXEnginePage       # studio integration tests
npm run ux:scan                             # regenerate the repository audit
```

Coverage includes pattern/rule integrity, WCAG ratio math, state-machine
transition validation, token-graph integrity, retrieval ranking, microcopy
tone, end-to-end audits of both fixtures (flawed → grade D with critical
findings; polished → grade A), command output shape and code generation, plus
scanner detector calibration (true positives, negative cases and the
false-positive guards above) and the repository-wide regression gate.
