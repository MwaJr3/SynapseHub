---
name: responsive-design
description: Use when a layout must work across widths, input methods and assistive technology — breakpoints, overflow, touch targets, keyboard order, focus management, contrast, zoom, reduced motion, landmarks and heading structure. Treats WCAG 2.2 AA as the baseline, not an extra.
---

# Responsive design and accessibility

Responsive is not "stacked on mobile". It is: the same task is completable at 320px,
at 200% zoom, with a keyboard, with a screen reader, and with motion turned off.

WCAG 2.2 AA is the floor of the normal workflow. It is not a later phase, and it is
not a checklist to run before a release — most of it is satisfied or broken in the
first hour of writing a component.

## Widths

- **Design at 320px first.** It is the narrowest real viewport (a small phone at 200%
  zoom). If it works there, wider widths are additions rather than repairs.
- **Use `min-width` breakpoints**, so the base styles are the small ones. Fewer
  breakpoints than you think: 640 / 768 / 1024 / 1280 is usually enough.
- **Content decides the breakpoint**, not the device. Break where the layout breaks.
- **No horizontal scrolling** at any width, except a genuinely tabular region that is
  labelled as scrollable and keeps its first column sticky.
- **Fluid type with a floor**: `clamp(1rem, 2.5vw, 1.25rem)`. Never a fixed `px` body
  size that ignores zoom.

Things that break at 320px, in order of frequency:

1. A fixed-width element (`w-[520px]`, a chart with a hard pixel width).
2. A `flex` row with no `flex-wrap` and no `min-w-0` on the growing child, so a long
   word pushes the row wider than the screen.
3. A table with eight columns and no scroll container.
4. A grid with `grid-cols-3` and no `sm:` variant.
5. Long unbroken strings (emails, hashes, URLs) with no `break-words` (X09).

## Touch and pointer

- Minimum target 24×24 CSS px (WCAG 2.2, 2.5.8); 44×44 is comfortable and is what a
  phone-sized layout should aim for.
- Space adjacent targets by at least 8px, or merge them into a menu.
- Every action available on hover must have a tap route (P06).
- Every action available by swipe must have a visible button (X03).
- `cursor: pointer` on interactive elements; `touch-action` set where a gesture is
  intentional.

## Keyboard

- **Reading order equals tab order.** Do not use `tabindex` above 0; if the order is
  wrong, the DOM order is wrong.
- Every interactive element is focusable and operable: buttons activate on Enter and
  Space; links on Enter; menus on arrows; Escape closes the topmost overlay.
- **Focus is visible** at 3:1 against its background (P46). `outline: none` with no
  replacement is a P1 — the engine reports it as `focus-ring-removed`, and reports a
  stylesheet that never styles focus at all as `no-focus-style`.
- **Focus management** (X08): opening a dialog moves focus into it; closing returns it
  to the element that opened it; deleting a row moves focus to the next row or the
  list header, never to `<body>`.
- **Skip link** (X12) when there is more than a handful of nav items, and it must be
  the first focusable thing on the page.
- A modal traps focus while open. A non-modal panel does not.

## Semantics and landmarks

- One `<main>` per page. `<nav>`, `<header>`, `<footer>`, `<aside>` where they apply.
- Exactly one `<h1>`; heading levels descend without skipping. A heading is a section
  title, not a font size.
- Buttons do things; links go places. A `<div onClick>` is neither and cannot be
  reached by keyboard.
- Tables: `<th scope>`; a caption or an `aria-label`; no layout tables.
- Forms: `<label for>`; `aria-describedby` for hints and errors; `<fieldset>`/`<legend>`
  for groups.
- Images: `alt` describing the content, or `alt=""` when decorative (X01). The engine
  flags `image-without-alt`.

## Colour and contrast (X10, P70)

- Body text 4.5:1; large text (24px, or 18.66px bold) 3:1.
- Non-text indicators — borders that convey state, icons, focus rings, chart series —
  3:1 against their neighbour.
- Never colour alone: pair it with text, an icon or a shape. Status dots need labels.
- Check the **actual** background: text over a translucent surface is a different
  colour from the same class on a solid one. A disabled control at `opacity: 0.5` is
  usually below the floor (the engine flags `disabled-contrast`).

## Motion and reduced motion (P09)

- `@media (prefers-reduced-motion: reduce)` turns off parallax, reveal-on-scroll,
  auto-playing loops and shimmer. Transitions that communicate a state change may stay,
  shortened.
- Nothing flashes more than three times a second.
- Nothing moves the content the user is reading (P12).

## Zoom and text resizing

- 200% zoom on a 1280px viewport must not clip content or hide actions.
- Text-only resizing to 200% must not truncate labels.
- Use `rem` for type and spacing; `px` for borders and hairlines is fine.

## Checklist

- [ ] Completable at 320px with no horizontal scroll.
- [ ] No fixed-width blocks; no `grid-cols-3` without a small-screen variant.
- [ ] Long words and long emails wrap.
- [ ] Targets ≥24×24 with 8px separation.
- [ ] Tab order matches reading order; focus visible everywhere.
- [ ] Focus returns after dialogs and after deletions.
- [ ] One `h1`, no skipped levels, one `<main>`.
- [ ] Every control has a name; every image has an `alt`.
- [ ] Text ≥4.5:1 against the real background; state indicators ≥3:1.
- [ ] Reduced motion honoured; nothing flashes.
- [ ] Works at 200% zoom and with text-only resizing.
