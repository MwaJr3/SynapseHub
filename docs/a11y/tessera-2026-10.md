# Tessera — accessibility pass, October 2026

This is the record of the accessibility pass required by stage 6. It lists what was
executed, what it found, what changed, and — the part that matters most — what could
not be checked here.

**The environment had no browser.** Every automated check below runs in jsdom, in
Node, against the real components. No screen reader was used, no visual rendering
was inspected, and no zoom or reflow was measured. Those are stated as gaps, not
implied to be passing.

## What was executed

| Check | Where | What it proves |
| --- | --- | --- |
| axe-core over every screen, WCAG 2.2 A/AA **plus** axe best-practice rules | `frontend/src/screens.a11y.test.tsx` (11 screens) | Names, roles, states, landmark structure, heading order, one h1, one main, form labels, image alternatives — for the rendered DOM, not the source |
| axe-core over the app shell, signed out and signed in | `frontend/src/app.a11y.test.tsx` | The frame: skip link, header, navigation, footer, `aria-current`, the hidden h1 |
| axe-core over the data screen with the delete form open | `frontend/src/data.ui.test.tsx` | The newest and most destructive screen, including its disabled state |
| Contrast ratios computed from the tokens that ship | `frontend/src/contrast.test.ts` (19 assertions) | 4.5:1 for text, 3:1 for control boundaries, board squares, move markers and the focus ring |
| No component reads a custom property that is not declared | same file | The class of defect CSS drops silently |

The fixtures the sweep renders are not invented: `src/__fixtures__/screens.json` was
captured from the local API, signed in as a freshly registered learner on a seeded
database. Each screen is drawn from the shape the server actually returns.

Two calibration tests exist so a green run means something: one renders a known-bad
screen and asserts axe reports it (`button-name`), and the contrast test was checked
against a deliberately washed-out token before being committed.

## What it found, and what changed

| Finding | Severity | Fix |
| --- | --- | --- |
| Form fields used `--line` (`#dfe3ea`) as their only boundary: **1.29:1** against the card — a text field with no perceivable edge (WCAG 1.4.11) | real | New `--line-strong` (`#7b8698`, 3.68:1 on a card, 3.46:1 on the page) for `.field` |
| **No `h1` on any page.** Every visible title is an `h2` inside a card, so heading navigation started at level 2 | real | The shell renders a visually hidden `h1` naming the section; the card titles stay `h2` |
| **`document.title` never changed** when the route changed — a single-page app with one title for every screen (WCAG 2.4.2) | real | Title follows the route: `Knowledge bank — Tessera` |
| **Focus stayed on the nav button** after a section change; nothing announced the new content | real | Focus moves to `<main tabindex="-1">` on navigation, and not on first paint |
| Chess board squares at **2.86:1** — the grid was harder to read than it needed to be | real | Dark square `#a17b5f`, 3.18:1 against the light square |
| Legal-move marker: green dot at **2.28:1** on light squares and **1.51:1** on dark ones — the only cue for where a piece may go | real | The dot keeps its colour and gains a 2px ink ring (4.36:1 and 4.20:1); the ring is the contract, the green is the decoration |
| `var(--border)` on the consent screen: **undefined**, so the panel drawn to explain what an app can read had no border | real | Uses `--line` |
| `var(--danger, #b42318)` on the consent screen: an undefined token with a hard-coded fallback that is not in the palette | real | Uses `--bad` |
| `--panel-2` used with an inline fallback in two places | minor | Declared as a token; the fallbacks are gone |
| Tab buttons are ~32 px tall | note | Above the 24 px WCAG 2.5.8 minimum, below the 44 px comfortable target. Unchanged: enlarging the navigation would cost horizontal room on small screens, and this was not measured on a device |

The undefined-token checks are now tests, so the two silent CSS defects cannot come
back without a failing build.

## Design decisions that are not defects

- **Disabled buttons keep a readable label.** A faded label is the one thing the
  learner needs in order to work out what is blocked; the delete button also carries
  `aria-describedby` pointing at the sentence that says what is missing.
- **The destructive action is behind an "I want to delete my account…" step**, and
  the confirmation is the account email typed by hand rather than a checkbox.
- **`prefers-reduced-motion` is honoured twice**: a blanket rule that turns off every
  animation and transition, and per-feature blocks for the tilt, the aurora, the
  sweep and the review bar.
- **Colour is never the only carrier.** Mastery bars expose `role="img"` with the
  value in the label; badges say `good`/`warn` in words; the board's selected square
  carries `aria-selected`; the current section carries `aria-current="page"`.

## What was NOT checked, and cannot be claimed

| Not verified | Why | What would verify it |
| --- | --- | --- |
| Screen reader output (NVDA, JAWS, VoiceOver, TalkBack, Orca) | No assistive technology in this environment | A manual pass with at least two, on the review, quests, chess and delete flows |
| Visible focus order and focus-ring rendering | Requires a rendering engine | Keyboard-only walk in a browser; `:focus-visible` is declared at 3px accent, 7.36:1 |
| 200% zoom, 320 px reflow, text spacing (1.4.4, 1.4.10, 1.4.12) | No layout in jsdom | Browser at 320 px wide and 200% zoom, on the board and the data screen |
| Colour contrast of composites (aurora gradients, opacity layers) | Measured for declared token pairs only | Browser dev tools / automated visual contrast |
| Motion under `prefers-reduced-motion` | The CSS is declared, not observed | Browser with the OS setting on |
| Touch target spacing at real sizes (2.5.8 beyond the minimum) | Computed from classes, not rendered | Device or emulator |
| Timing, live-region behaviour over a real network | jsdom resolves promises instantly | Manual pass with throttling |
| The skip link's focus behaviour | Declared (`sr-only` → `focus:not-sr-only`) | Tab once in a browser |

The chess board's click-to-move flow does not use drag and has no keyboard trap
(`button` elements in a labelled `role="grid"`), but the arrow-key navigation a grid
role invites is **not implemented** — the grid role is used for the grouping it gives
assistive technology, not because the board is a full grid widget. A pass with a
screen reader would decide whether to implement arrow-key movement or to remove the
role; the honest current state is "buttons in a labelled group that announces as a
grid".

## Reproducing

```bash
cd apps/tessera/frontend
npm test -- src/screens.a11y.test.tsx src/app.a11y.test.tsx src/contrast.test.ts
```

`color-contrast` is disabled inside axe because jsdom cannot composite colours; the
contrast test covers that ground from the tokens. Both facts are asserted in the
files themselves, next to the options that rely on them.
