---
name: information-hierarchy
description: Use when arranging a screen, a list, a table or a navigation — deciding what a user sees first, what they can skip, and what the page refuses to show. Covers primary-action discipline, grouping and proximity, tables, pagination, tabs, disclosure and progress.
---

# Information hierarchy

A screen has one job and one thing that must be noticed first. Everything else is
either supporting or absent. Most "cluttered" interfaces are not busy; they are
undecided.

## The one-primary rule

Per screen: **one** primary action, styled as primary. Not two buttons that both look
primary because the team could not choose. If two actions genuinely compete, the
screen is two screens, or one is a secondary action with a quieter treatment.

Test: cover the labels and look at the shapes. The primary action should be findable
without reading. If the eye lands on a heading, a chart and two buttons at the same
weight, there is no hierarchy — there is a list.

The corollary (P52, Von Restorff): the *accent* is a scarce resource. One element per
view is allowed to be different. Three red badges, two coloured cards and a gradient
hero means none of them is the exception any more.

## Structure before decoration

1. **Order by the user's question, not the database's shape.** A learner asks "what
   should I do next", not "what are my concept records". If the first thing on the
   page is a count of rows, the page is describing itself rather than answering.
2. **Put the answer where the eye lands.** Top-left for reading order, top-right for
   status, bottom for the commitment. Do not bury the conclusion below a chart the
   user must interpret to reach it.
3. **Group by proximity, and delete the dividers.** If two things need a line between
   them, they are either too close to unrelated content or too far from related
   content. Space is the grouping; a rule is an apology (P43).
4. **Then and only then** add borders, shadows and colour.

## Lists, tables and the middle

- **Serial position (P45):** the first and last items of a list get attention. Put the
  item that needs action at the top, and the "add another" affordance at the end —
  not in the middle of the list.
- **Tables (P63):** every `<th>` gets `scope`. Numeric columns are right-aligned and
  use `tabular-nums`, otherwise the digits jitter and cannot be compared. Keep the
  header visible when the body scrolls. If a table needs a horizontal scrollbar below
  768px, say so and give the first column a sticky position.
- **Empty is a state, not a table with zero rows** (P25). One sentence on why it is
  empty and one action that fills it. A table header with nothing under it reads as a
  bug.
- **Pagination (P61)** belongs in the URL. If the page number lives only in React
  state, a refresh, a shared link and the back button all land on page one.

## Navigation

- The current location is marked with `aria-current="page"` **and** a visual
  treatment that is not colour alone (P29): weight, an indicator bar, or both.
- The document title restates the location. It is the only context a screen reader
  user gets on arrival.
- Keep nav labels to the user's vocabulary. "Assets" is a nav label only if the user
  says "assets".
- A nav item that opens a page with no content yet is worse than no nav item.

## Disclosure and progressive depth

- **Accordions (P62)** are for content the user reads in one sitting but not all at
  once. They are wrong for content that must be compared — comparing requires the two
  things to be visible at the same time.
- Animate `grid-template-rows` from `0fr` to `1fr`. `height: auto` cannot be
  interpolated, so it snaps and reads as broken.
- **Tabs (P30)** are for views of the same object, not for steps of a process (that is
  a stepper) and not for navigation (that is a nav). A tab set whose tabs each contain
  their own page title is a nav pretending.
- **Zeigarnik (P58):** unfinished work should be visible and resumable; finished work
  should leave the working set. A list that mixes both, sorted by date, makes the
  user re-read everything to find the one open item.

## Progress and multi-step flows

- Show how many steps there are, which one this is, and what remains. "Step 2 of 4" is
  honest; a bar with no label is decoration.
- Allow back without losing input.
- The last step must not be a review of everything typed, unless the user typed it in
  a different session.

## Density

Density is a decision, not an accident (P53). A security console and a reading app
want different row heights. Choose a density per product, put the spacing scale in
`DESIGN.md`, and do not mix: a 48px row beside a 28px row looks like two components
from two teams.

## Checklist

- [ ] One primary action, visually unmistakable.
- [ ] The first thing on the screen answers the user's question.
- [ ] Grouping is done with space; dividers are the exception and are explained.
- [ ] Every list has a defined order, and that order is not "whatever the API returned".
- [ ] Tables: scoped headers, aligned numbers, visible header on scroll.
- [ ] Current location marked in nav and in the title.
- [ ] Every "empty" case has a sentence and an action.
- [ ] Any paginated list survives a refresh.
