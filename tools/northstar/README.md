# Northstar UX Engine

**One project, one command line.** Northstar reviews, designs, audits and restyles
interfaces, runs over every project in this repository, and fixes what it can prove.
It is standalone: no website embeds it, no project imports it. Only this directory
contains engine code.

Merged on 2026-10-28 from two tools that had grown apart — `northstar-ux-engine/` (this
CLI and plugin) and `src/features/ux-engine/` (a TypeScript pattern library and
detector suite with an interactive studio inside the portfolio site). The studio was
removed from the site; the TypeScript half moved here as `engine/`. The two check sets
are complementary and both are kept, behind one entry point:

| Layer | Where | Reached by |
| --- | --- | --- |
| Severity-ranked rules (51 checks, P0–P3) | `rules.mjs`, `engine.mjs` | `northstar audit` · `check` · `fix` · `watch` |
| Static detectors (15 families, file:line evidence) | `engine/` | `northstar scan` |

It holds to a rule most design tooling breaks: **it does not claim to have seen
anything it has not seen.**

Every finding carries a file, a line, a quoted snippet and, where a number exists, the
number. Where a UX problem cannot be settled from source, the engine says so and lists
it as unchecked rather than guessing.

```
/ux-review   a diff, read-only: MUST FIX / SHOULD FIX / NICE TO HAVE
/ux-design   a specification before code, with an approval gate
/ux-audit    P0–P3 across a screen, a project, or a repository; top three first
/restyle     visual character, one axis at a time, with DESIGN.md
```

## Install

From this repository:

```bash
/plugin marketplace add /path/to/SynapseHub
/plugin install northstar-ux-engine
```

The marketplace entry lives at `.claude-plugin/marketplace.json`; the plugin is the
directory you are reading. Nothing is fetched at install time and there is no build
step.

To use the checker without the plugin:

```bash
node tools/northstar/bin/northstar.mjs audit .            # whole repository, P0-P3
node tools/northstar/bin/northstar.mjs audit companies/tamuzi/tessera # one project
node tools/northstar/bin/northstar.mjs scan               # the detector layer + report
node tools/northstar/bin/northstar.mjs check . --min P1   # CI gate, exits 1
node tools/northstar/bin/northstar.mjs fix .              # apply the mechanical fixes
node tools/northstar/bin/northstar.mjs review . --ref HEAD~1
node tools/northstar/bin/northstar.mjs patterns          # the pattern index
```

`scan` needs `vite-node` (a devDependency, because the detectors are TypeScript).
Every other verb runs on Node's standard library alone.

Node 20 or newer. No dependencies, no network access, no telemetry.

## What it checks

Forty-eight checks that read source: React/JSX, CSS/Tailwind, plain HTML, and HTML
rendered from Python string templates. The ones that find the most, in this repository:

| Check | Pattern | What it proves |
| --- | --- | --- |
| `text-contrast` | P70 | Two colours resolve to a ratio below 4.5:1 — printed as `#ffffff on #0891b2 = 3.68:1` |
| `placeholder-contrast` | P24 | Placeholder text below 4.5:1 against its own field background |
| `unlabelled-input` | X05 | An input with no label, no `aria-label`, and no label wrapper |
| `no-focus-style` | P46 | A stylesheet that styles buttons and links but never styles focus |
| `focus-ring-removed` | P46 | `outline: none` with nothing painted in its place |
| `disabled-without-reason` | P05 | A button blocked on unfilled content, with no explanation in the DOM |
| `disabled-contrast` | P70 | `:disabled { opacity: < 0.75 }` — the label usually ends up below 3:1 |
| `native-confirm` | P11 | `window.confirm` for a destructive action |
| `native-alert` | P23 | Errors surfaced through `alert()` |
| `swallowed-error` | P23 | `catch {}` / `.catch(() => {})` in a data path |
| `bare-loading` | P28 | "Loading…" with no `role="status"` and no shape |
| `no-reduced-motion` | P09 | Motion with no `prefers-reduced-motion` escape |
| `animate-height-auto` | P09 | A transition on `height: auto`, which cannot animate |
| `zindex-arms-race` | P44 | `z-index` of 100 or more, instead of a stacking context |
| `radius-off-scale` | P72 | More than five distinct border radii in one stylesheet |
| `table-semantics` | P63 | `<th>` without `scope` |
| `numeric-cells` | P63 | Numeric cells without `tabular-nums` or right alignment |
| `pagination-not-in-url` | P61 | Page state in component state, so a refresh loses it |
| `accidental-submit` | X05 | An `onClick` button inside a form that also has `onSubmit` |
| `image-without-alt` | X01 | `<img>` with no `alt` attribute |
| `fixed-width-container` | X09 | A hard width of 360px or more, which cannot fit a 320px viewport |

| `tabindex-positive` | P46 | `tabindex` above 0, which overrides the natural tab order |
| `image-without-dimensions` | X01 | `<img>` with no width/height or aspect-ratio, so the page jumps as it loads |
| `input-type-generic` | X05 | A field named email/phone/url that is not typed or given an `inputmode` |
| `click-on-non-interactive` | X13 | `onClick` on a `<div>`/`<span>` with no role, tabindex or key handler |
| `otp-autocomplete` | P60 | A verification-code field without `autocomplete="one-time-code"` |
| `password-autocomplete` | P57 | `type="password"` with no `current-password` / `new-password` hint |
| `transition-all` | P09 | `transition: all`, which animates layout properties nobody chose |
| `linear-easing` | P21 | A UI transition on `linear` (spinners and progress bars are exempt) |
| `accordion-without-expanded` | P62 | An accordion with no `aria-expanded` and no `<details>` |
| `invalid-on-load` | P24 | CSS `:invalid` styling, which paints empty fields red before anyone types |
| `invalid-without-description` | P24 | `aria-invalid` with no `aria-describedby` message |
| `switch-without-checked` | P41 | `role="switch"` with no `aria-checked` |
| `validate-on-every-keystroke` | P50 | Form `mode: 'onChange'` |
| `truncated-bar-axis` | P08 | A bar chart whose value axis starts above zero |
| `file-input-accept` | P56 | `<input type="file">` with no `accept` |
| `progress-without-value` | P28 | `role="progressbar"` with no `aria-valuenow` |
| `dark-pure-black` | P73 | Pure `#000` as a dark-theme surface |
| `paste-blocked` | P57 | A password or code field whose `onPaste` calls `preventDefault()` |
| `zindex-without-position` | P44 | `z-index` on a rule that is never positioned (cross-rule aware) |
| `ai-cliche-copy` | X14 | An `<h1>`/`<h2>` built from stock adjectives ("supercharge", "seamless") |
| `gradient-opposed-hues` | X15 | A linear gradient between hues 120° or more apart |

Plus `hover-only-action`, `raw-colour-in-class`, `nav-missing-current`,
`placeholder-link`, `target-blank-noopener` and `small-target`. The full mapping lives
in `PATTERNS.md` and `patterns.mjs`.

**Fifty of the 76 canonical patterns are not machine-checked.** That is stated in the
pattern library, in the audit report, and in every command's output. `PATTERNS.md`
lists them with the standard they are held to.

## Why source analysis

A browser-based checker would find more. It would also need a running app, a stable
selector per finding, and a screenshot pipeline — and in a repository of 37 projects
with three UI paradigms (React, server-rendered Python, Next.js), it would be wrong
most of the time and impossible to re-run in CI.

Source analysis has one advantage that turns out to matter more: **the finding is
reproducible.** Anyone can open the file at the line, see the two hex values, and
check the arithmetic. The contrast module reproduces the WCAG reference pair
(`#767676` on `#ffffff` = 4.54:1) in a test, so a regression in the parser shows up as
a wrong ratio rather than as a quietly different report.

Where source analysis cannot decide, the engine stays silent. A class list with
`bg-brand-600` is skipped rather than compared to the page background; a CSS rule that
sets only `color` inherits its background from an ancestor and is skipped unless the
selector is `body`, `html` or `:root`. Both silences were added because the earlier
version produced findings that were confidently wrong.

## The skills

Nine, each written to activate on the task rather than on the keyword:

| Skill | Use it when |
| --- | --- |
| `intent-discovery` | A request describes a solution before the problem |
| `information-hierarchy` | Arranging a screen, list, table or navigation |
| `state-completeness` | Anything that fetches, submits or displays data |
| `form-ux` | Any form or input, including validation and error copy |
| `feedback-and-affordance` | Things that respond: buttons, toasts, destructive actions |
| `ux-auditor` | Judging findings: severity, confidence, evidence, report shape |
| `design-system` | Tokens, spacing, radii, layers, motion durations |
| `visual-character` | The product looks generic, templated, or "AI-made" |
| `responsive-design` | Widths, keyboard, zoom, contrast, reduced motion — WCAG 2.2 AA |

Two specialists are included because delegation genuinely helps:
`ux-auditor` (audits and reports, never edits) and `design-system-cartographer`
(inventories an existing system before anyone replaces it).

## Numbering

Canonical patterns are `P01`–`P76` (zero-padded, so they never collide with the
severities `P0`–`P3`); the TypeScript engine writes the same patterns as `P1`–`P76`.
Northstar-only checks are extensions `X01`–`X13`. Every record keeps a `legacyId` that
traces it to its 1.0.x number. `PATTERNS.md` is generated: `northstar patterns --markdown`.

## Measuring a real page

`northstar page <url|file> [--viewports 320,768,1280] [--out dir] [--json file]` opens
the page in headless Chromium (Playwright, optional), presses Tab, and measures
horizontal overflow, target sizes, accessible names, alt text, headings, document
basics and focus visibility. It never clicks or submits. Without Playwright it prints
**Not measured** and exits 3 — it does not guess. Only http(s) URLs and local files are
opened.

## The hooks

Two hooks, deliberately different in strength. The **enforced** one blocks; the
**advisory** one only informs.

- **Enforced — `hooks/guard-writes.mjs`** (PreToolUse, Bash). See below.
- **Advisory — `hooks/post-edit-advisory.mjs`** (PostToolUse, Edit|Write|MultiEdit)
  audits the file just edited and hands Claude up to five P0–P2 findings as context.
  It always exits 0 and never blocks. `NORTHSTAR_ADVISORY=off` disables it.

### The guard

The only enforced hook, and only because it is reliable: `hooks/guard-writes.mjs` runs before every
Bash command and blocks `git commit`, `git push`, `git reset --hard`, `npm publish`,
`vercel deploy` and recursive deletes. It is a pure string check — no state, no
network, no guessing. It exits 2 with a reason, which Claude Code feeds back to the
model, so the block becomes a question to the user.

`NORTHSTAR_ALLOW_GIT=1` bypasses it for a session, and the bypass is announced. A net
you cannot remove gets removed wholesale.

## Tests

```bash
cd northstar-ux-engine && npm test
```

`node --test`, no dependencies. Five suites:

- **structure** — manifest, marketplace source, exactly four commands, exactly nine
  skills whose `name` matches their directory, agents with a model, the hook pointing
  at a file that exists, no dependencies.
- **commands** — each command's contract: `/ux-review` grants no edit tool and names
  its three sections; `/ux-design` has an approval gate and a states table;
  `/ux-audit` defaults to report-only and lists P0–P3; `/restyle` fixes the axis order
  and requires `DESIGN.md`.
- **coverage** — 76 pattern ids with no gaps, every pattern's skill exists, every
  claimed check is implemented, every rule is reachable from the library, and every
  unchecked pattern is listed in `PATTERNS.md`.
- **engine** — contrast against published values, palette resolution, surface
  detection, and calibration on five fixtures: the broken ones must produce exactly
  their planted defects, and the nearly-correct one must produce exactly one.
- **safety** — the guard blocks and allows the right commands, can be bypassed
  deliberately, no file imports a network module, the only environment variable read
  is the documented override, and the CLI never deletes anything.

## Fixtures

Five small projects under `fixtures/`, each planted with a specific defect set:
`bad-form` (6), `dashboard-missing-states` (4), `overflow-layout` (2),
`inconsistent-tokens` (8), and `accessible-markup-with-defect` — which is correct
accessible markup with exactly one contrast failure, and exists to keep the engine
from becoming a machine that fires on everything.

## Limitation, stated once and plainly

The engine cannot see the rendered page. It cannot tell you the layout is beautiful,
that the copy is persuasive, that the animation feels right, or that a screen reader
announces the way you hoped. It can tell you that two colours are 3.68:1 apart, that a
label is missing, that an error is swallowed, and where. That is the honest boundary,
and every report repeats it.

## Licence

MIT — see `LICENSE`.
