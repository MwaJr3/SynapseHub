---
description: Diagnose and change visual character one axis at a time — type, colour, space, surface, radii, motion — with a written DESIGN.md and a before/after the user can check.
allowed-tools: Read, Glob, Grep, Write(docs/**), Edit, Bash(git status:*), Bash(git diff:*), Bash(node:*), Bash(npm run:*)
---

# /restyle

Change how a product looks without changing how it works.

The failure mode this command exists to prevent: a restyle that touches 60 files,
breaks three layouts, and cannot be described afterwards. So it works **one axis at
a time**, writes the decision down, and shows the diff.

## Procedure

### 1. Diagnose before proposing

Read the stylesheet, the token layer and two or three representative screens. Fill
this in, from the code, before suggesting anything:

| Axis | What the product does now | Where the decision lives | Verdict |
| Type | family, scale, weights, line length | `--font-*`, `text-*` | deliberate / inherited / accidental |
| Colour | token names, count, dark mode | `:root`, `[data-theme]` | |
| Space | scale steps, density | padding utilities | |
| Surface | elevation levels, border vs shadow | `.card`, `--surface-*` | |
| Radii | values in use, nesting | `--radius-*` | |
| Motion | durations, easing, reduced-motion | `transition`, keyframes | |
| Accent discipline | how many things are emphasised per view | accent tokens | |

A verdict of "accidental" needs evidence: the same role carrying three different
values, or a value that exists once in the whole codebase.

### 2. Name the character in one sentence

Not "modern and clean". Something falsifiable: *"A quiet, paper-like reading surface
with one warm accent and no decoration above the fold, so the numbers are the only
thing with weight."* The user approves this sentence before any CSS moves. If the
sentence could describe any product, it is not a decision yet.

### 3. Write `DESIGN.md`

Use `templates/DESIGN.md` from this plugin. It records: the character sentence, the
axis decisions, the token table, the do/don't pairs, and the things that are
deliberately *not* styled. This file is the deliverable that survives the session —
without it the next restyle re-litigates everything.

### 4. Change one axis, then stop

Order that causes the fewest regressions: **tokens → colour → type → space → surface
→ radii → motion**. Tokens first because everything downstream reads them; motion
last because it depends on the final geometry.

For each axis:

1. Say what changes and what it affects (list the files).
2. Make the change in the token layer wherever possible — a restyle that edits 200
   component files has failed at the token layer.
3. Run the tests and the build. Report the real output.
4. Show the before/after as a token table or a measured value, not as prose.
5. Ask before moving to the next axis.

### 5. Verify

- Contrast: every changed text/background pair, computed. Quote the ratio.
- Motion: `prefers-reduced-motion` still honoured.
- Dark mode (if the product has one): the same tokens resolve, nothing is hard-coded.
- Focus ring still visible against the new surfaces.
- Nothing in the change alters behaviour: diff the component props, not just the CSS.

## Rules

- No new dependency for a visual change. No animation library, no CSS-in-JS runtime.
- No raw hex in components. If a value is needed, it becomes a token with a role name.
- Never "improve" copy, layout or interaction while restyling. Note it and hand it to
  `/ux-audit` instead — mixed changes cannot be reviewed or reverted.
- If a change would need a screenshot to justify, say that it needs one and that you
  have not taken it. Do not describe what the result "will look like".
- Report at the end: axes changed, files touched, tests run, and what remains unchanged
  on purpose.
