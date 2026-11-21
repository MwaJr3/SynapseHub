---
name: feedback-and-affordance
description: Use when something responds to the user — buttons, links, destructive actions, toasts, tooltips, menus, optimistic updates, drag and drop, bulk actions. Makes sure every action announces itself, every affordance looks clickable, and every irreversible step has a way back.
---

# Feedback and affordance

Two questions, asked of every interactive element:

1. **Does it look like it does something?** (affordance)
2. **Does it tell you what happened?** (feedback)

Most interface complaints are one of these missing. The button that was actually a
link. The save that silently succeeded. The delete that silently failed.

## Affordance

- **Static things look static; actionable things look actionable.** A card with a
  hover lift but no link is a broken promise. A row that navigates but never changes
  its cursor is a hidden feature.
- **Hover is a bonus, never the only route** (P06, hover trap). Touch has no hover;
  the first tap becomes a sticky hover state and the action stays hidden. Anything
  needed to finish the task must be visible at rest.
- **Icon-only buttons need a name**: `aria-label`, plus a tooltip if the icon is not
  universal. Size the hit area to at least 24×24 CSS px (44×44 is comfortable) —
  the engine flags `small-target`.
- **The cursor follows the target.** `pointer` on clickable, `not-allowed` only where
  the block is real and explained.
- **Focus is visible** on every interactive element, at 3:1 against what is behind it
  (P46). If the stylesheet removes the outline and adds nothing, that is a P1.

## Feedback

Every action gets one of four answers, quickly:

| The action | The feedback |
| --- | --- |
| Instant and local | The change itself. No toast. |
| Takes time | The control changes state ("Saving…"), then the result replaces it |
| Happened elsewhere | A toast, non-blocking, dismissible, announced politely |
| Failed | Inline, near the action, naming the failure and the fix |

Rules:

- **Name the object.** "Grade saved for Ada Obi" beats "Saved". "Invitation sent to 3
  people" beats "Success".
- **Do not use a toast for an error you can show in place.** Toasts vanish; the error
  needs to stay next to the thing that failed.
- **Do not use a toast for something the user must act on.** That is a banner or a
  dialog.
- **Announce politely.** `role="status"` for confirmations, `role="alert"` for errors.
  A toast that appears with no live region is silent to a screen reader.
- **Optimistic UI needs a rollback** (P52): if the server refuses, put the old value
  back and say so. An optimistic update with no failure path is a lie that lasts until
  the page reloads.
- **Doherty (P18):** acknowledge within 400ms. If the work is slower, the
  acknowledgement is the button state, not a spinner over the whole page.

## Destructive actions (P11)

The ladder, best first:

1. **Make it reversible.** Undo for 5–10 seconds, with the object named.
2. **Make it inline-confirmed.** The row's own controls switch to "Delete / Keep" —
   the confirmation appears where the user is looking, and names the object.
3. **Make it a dialog** only when the consequence cannot be undone *and* the object is
   complex (deleting an account with data behind it).

Never:

- `window.confirm` — blocked by embedded browsers, untranslatable, unstyled, and it
  offers no context (the engine flags `native-confirm`).
- A generic "Are you sure?" — the user is sure; they are not sure *what*.
- Two buttons both labelled "Cancel".
- Red for anything that is not destructive. Red means "this removes something".

The confirm button names the action ("Delete 12 items"), the cancel button names the
alternative ("Keep them").

## Bulk actions (P04)

- Say how many, before running: "Delete 12 submissions".
- Show the selection persistently with a way to clear it.
- Never let a bulk action run on a selection the user cannot see (scrolled out of
  view, filtered out).
- Bulk destructive actions always get the undo path; they cannot be individually
  confirmed.

## Toasts (P40)

- One at a time, or a stack capped at three.
- Bottom or top corner, away from the primary action.
- 5 seconds for information, no auto-dismiss for anything actionable.
- Dismissible by a real button, not by hovering.
- Never the only record of something that matters: the state itself should show it.

## Tooltips (P42)

- Open on focus as well as hover, and close on Escape.
- Never the only copy of a label; a tooltip is an addition.
- Not for long text: a tooltip that needs two lines is a hint that should be on the page.
- Not the only explanation of a disabled control — the tooltip never fires on a
  disabled element.

## Menus, palettes and context menus (P58, P10)

- The keyboard model is the native one: arrows to move, Enter to activate, Escape to
  close, Home/End to jump.
- A context menu (right click) always has a visible equivalent. Many users have no
  right click.
- A palette lists what the *current* page can do, not the whole app.

## Drag and drop (P19)

- A keyboard path exists (move up/down buttons are enough).
- The drop target is visible during the drag.
- The moved item lands where the indicator said it would.
- The reorder can be undone, and says it saved.

## Inline editing (P14)

- Editable content looks editable at rest (an underline, a pencil on focus-within —
  but visible without hover).
- Save on blur or Enter; Escape reverts.
- Announce the save. A field that saves silently is indistinguishable from one that
  did not save.

## Checklist

- [ ] Every action gives an answer within 400ms.
- [ ] Every answer names the object, not just the outcome.
- [ ] Errors render where the action happened and stay there.
- [ ] Nothing essential lives only on hover.
- [ ] Every destructive action is reversible or confirmed in place, by name.
- [ ] Live regions exist for both confirmations and errors.
- [ ] Every pointer interaction has a keyboard equivalent.
- [ ] Optimistic updates roll back, visibly.
