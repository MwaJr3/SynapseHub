---
name: visual-character
description: Use when a product looks generic, templated or "AI-made", or when choosing a visual direction — typography, accent discipline, hero composition, imagery, chart styling, iconography. Makes the product look like one deliberate thing rather than the average of many.
---

# Visual character

Generic is not ugly. Generic is *unspecified*: the interface that results when every
choice was left at its default, so it could belong to any of a thousand products. The
cure is not more decoration. It is fewer, more deliberate decisions.

## The "de-AI" test

Look at the screen and ask: **could this be any product in this category, in any
company, in any year since 2021?** If yes, the character is missing. The usual
tells:

- A centred hero with a gradient blob, a `text-4xl` headline, a two-sentence
  subtitle and two buttons ("Get started" / "Learn more") with equal weight.
- Inter or system-ui everywhere at four sizes, all semibold.
- Rounded cards at `rounded-xl`, `shadow-sm`, `p-6`, repeated in a grid of three.
- One accent colour used for links, buttons, badges and charts at the same intensity.
- Emoji standing in for iconography.
- Copy written to be inoffensive: "Empower your workflow", "Seamless experience".

None of these is a crime. Together they are an absence of decision.

## The character sentence

Before choosing any value, write one sentence that a stranger could falsify:

> *"A quiet, paper-like reading surface with one warm accent and no decoration above
> the fold, so the numbers are the only thing with weight."*

> *"A dense operations console: monospace for anything the machine produced, generous
> row height only where a human will read a sentence, and a single alarming colour
> reserved for failure."*

Then every choice answers to that sentence. If a proposed gradient does not fit the
sentence, it does not go in. The sentence belongs in `DESIGN.md` — see
`templates/DESIGN.md`.

## The four levers

### 1. Type

- **Two families at most.** One for text, one for data (monospace) if the product has
  machine output. A third family is almost always a mistake.
- **A scale, not sizes.** Pick 5–6 steps and use them. Sizes chosen per component are
  how a page ends up with 13, 14, 15 and 16px body text.
- **Weight is hierarchy.** Before adding a colour or a border, try one weight step.
- **Line length 60–75 characters** for reading; `max-width: 65ch` is a good default.
- **Line height** 1.5–1.7 for body, 1.1–1.25 for headings. Fixed line heights on
  fluid type cause collisions at small widths.
- **Numerals**: `tabular-nums` in tables, `lining-nums` default, old-style only if the
  family has good ones and the product is editorial.

### 2. Colour

- One accent. It marks the primary action and the current selection — nothing else.
- Derive a small ramp from the accent (soft background, base, hover, ink-on-accent)
  rather than inventing four unrelated colours.
- Status colours are separate from the accent: success, warning, danger, info. They
  carry meaning, so they are used sparingly and always with a word, never colour alone.
- **Von Restorff (P74):** the thing that is different gets noticed *because* it is the
  only one. Two emphasised elements halve each other.
- Dark mode is a token set (P73): layered surfaces (base, raised, overlay), not
  inverted greys; accents lightened enough to clear 4.5:1 on the darkest surface.

### 3. Composition

- **The hero says what the product does, for whom** (P67), in the user's words. One
  primary action. If there is a second button, it is visually secondary.
- Asymmetry is cheaper character than symmetry: an off-centre column with a wide
  margin reads as designed, a centred stack reads as templated.
- One image, well cropped, beats four stock illustrations. If the product is data,
  the data is the image — show a real number.
- Nothing decorative above the fold that pushes the actual content below it.

### 4. Surface and depth

- Cards (P64) carry one idea and one action. A card with three buttons is a page.
- Hover lift of 1–2px and a slightly stronger shadow is enough. Rotating the card,
  scaling it 1.05 and moving it 8px is three effects doing one job.
- Borders and shadows are alternatives. Using both, at full strength, on every
  surface, is why the page looks noisy.
- Gradients (P53) are a light decision: a single direction, two nearby stops, and a
  reason. A four-stop diagonal rainbow is decoration pretending to be design.

## Charts (P08)

- Title states the question the chart answers, not the metric name.
- Units on the axis, or in the label if there is only one series.
- Zero baseline for bars. Truncated bars lie; a truncated line axis is acceptable if
  labelled.
- Fewer colours than series: one accent, one muted, one status.
- A text summary beneath for anyone who cannot read the chart: "Sessions rose from 3
  to 9 over six weeks."

## Iconography (P66)

- One family, one stroke width, one optical weight. Mixing a filled icon with a
  hairline icon in the same toolbar looks like two products.
- 16/20/24px grid; do not scale an icon to 18px and expect the strokes to match.
- No icon stands alone without a label unless it is universal (search, close, menu).
- Never use an emoji where a real icon is needed; the rendering varies by platform and
  the product looks different on every phone.

## Copy is part of the character (P51)

- Labels name the thing; buttons name the action ("Save grade", not "Submit").
- Sentences in the product's own voice, not a marketing voice.
- Delete every word that could be removed without losing meaning. "Simply", "easily",
  "seamlessly", "empower" are all removable.
- A product that says exactly what it does is more distinctive than one that claims to
  do everything.

## Working procedure

1. Write the character sentence.
2. Choose the four levers' values, and record them in `DESIGN.md`.
3. Apply to **one** screen — the one users see first.
4. Compare it against the neighbouring screen. If they no longer look related, the
   character words were too vague.
5. Only then propagate, via tokens (`/restyle` does this axis by axis).

## Checklist

- [ ] One sentence describes the character, and it is falsifiable.
- [ ] Two type families, one scale, hierarchy from weight before colour.
- [ ] One accent, used for primary action and selection only.
- [ ] The hero names the user's job and has one primary action.
- [ ] Cards carry one idea; hover is a lift, not three effects.
- [ ] Charts have a question, units and a text alternative.
- [ ] Icons share a family and a stroke.
- [ ] Copy names actions and objects; nothing claims more than the product does.
