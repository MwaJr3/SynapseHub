---
name: design-system
description: Use when defining or changing tokens, spacing scales, radii, elevation, z-index layers, motion durations, or a shared component's API. Keeps one source of truth for colour, space and depth so a rebrand is a token change rather than a hunt through components.
---

# Design system

A design system is not a component library. It is the set of decisions that stop
being made twice: which colours exist and what they mean, which spacing values are
legal, how deep the stack goes, how long motion lasts.

The test of a design system is a change: **if a rebrand means editing components, the
tokens are not real.** If changing the accent colour requires touching twelve files,
there is no token layer, only a variable that some files ignore.

## Tokens with roles, not values

Name things by their job. `--surface`, `--text-muted`, `--border-strong`,
`--accent`, `--danger`. Not `--grey-400` (which is `--surface-2` in one place and body
text in another) and never `#64748b` inside a component.

Four layers, in this order:

1. **Primitive** — the raw palette (`--slate-500: #64748b`). Rarely referenced directly.
2. **Semantic** — the role (`--text-muted: var(--slate-400)`). This is what components
   use.
3. **Component** — only when a component needs a value no other component shares
   (`--table-row-hover`). Keep these few.
4. **Theme override** — the same semantic names re-pointed under `.dark`,
   `[data-tone='contrast']`, `[data-company='…']`. Components never know.

If a component needs a colour that has no semantic name, that is a design decision
waiting to be made — make it, name it, and add it to `DESIGN.md`.

The engine flags raw literals in class lists (`raw-colour-in-class`) and asks for the
token name instead.

## Space

One scale, geometric-ish, with a small base: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.
Every gap, pad and margin comes from it. Values outside the scale are a bug in the
mapping, not a special case.

- Related things are separated by the smallest step that still groups them.
- A block's padding is smaller than the gap between blocks, or the blocks merge.
- Density is chosen per product (P26) and written down; a console at 48px rows and a
  reading app at 28px are both correct, just not in the same view.

## Radii (P72)

`4 · 8 · 12 · 16 · 24` plus `999` for pills. More than five values in one stylesheet
means the radius was decided per component (the engine flags `radius-off-scale`).

Nesting: **inner radius = outer radius − padding.** A 12px card with 8px padding gets
a 4px inner element. Getting this right is most of what makes corners look intentional.

## Elevation (P36)

Three levels, not eight: flat (border only), raised (small shadow), floating
(popover/dialog). Shadow direction agrees with the light source — pick "light from
above" and never mix.

A shadow is not a substitute for a border: on a dark theme, a shadow is invisible, so
surfaces are separated by lightness and a hairline.

## Z-index and stacking (P44, X04)

A short documented scale:

```
--layer-base: 0
--layer-sticky: 10
--layer-dropdown: 20
--layer-overlay: 30
--layer-modal: 40
--layer-toast: 50
```

Rules that matter more than the numbers:

- A child cannot escape its parent's stacking context. If `z-index: 9999` is not
  working, the cause is a `transform`, `filter` or `opacity` on an ancestor. Give the
  ancestor `isolation: isolate` and rank within it.
- Overlays layer in the order they were opened; Escape closes the top one only.
- Never escalate. The engine flags any `z-index` of 100 or more.

## Motion tokens

- Durations: `120ms` (state change), `240ms` (entrance), `400ms` (layout). Nothing
  used for decoration exceeds 400ms.
- Easing: one entrance curve (`cubic-bezier(0.22, 1, 0.36, 1)`), one exit curve
  (`ease-in`), no bounce on anything being read.
- Animate `transform` and `opacity`. Animating `width`, `height`, `top` or `left`
  forces layout on every frame; `height: auto` cannot animate at all.
- Every motion block has a `prefers-reduced-motion: reduce` counterpart. Not "the
  animation gets shorter" — it stops, or becomes an instant state change.
- Motion performs a state change. It does not breathe, pulse or drift while idle.

## Components

A shared component earns its place when three screens need the same thing *and* the
same decisions. Until then, a local component is cheaper.

When a component is shared, its API is a design decision:

- Variants, not booleans: `variant="danger"`, not `isRed`.
- The component owns its states (default/hover/focus/disabled/loading); the caller
  owns the label and the handler.
- Never let a caller pass raw colour. If a variant is missing, add it.
- A disabled state must accept a reason (`disabledReason`) or the component cannot
  meet P05.

## `DESIGN.md` is part of the system

The token table, the scale, the layering order and the do/don't pairs belong in a file
next to the code. Without it:

- the next contributor re-invents the spacing scale;
- a rebrand is archaeology;
- "why is this 13px" has no answer.

`templates/DESIGN.md` in this plugin is the starting shape. Keep it short enough that
someone will update it.

## Checklist

- [ ] Every colour used by a component has a semantic name.
- [ ] One spacing scale, and no value outside it.
- [ ] Radii from one scale; nested corners computed, not guessed.
- [ ] Three elevation levels; light direction consistent.
- [ ] Documented z-index scale; no number above 100.
- [ ] Motion durations and easings tokenised; reduced-motion honoured.
- [ ] `DESIGN.md` exists and matches the code.
- [ ] A rebrand = editing the theme block, nothing else.
