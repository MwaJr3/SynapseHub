---
name: state-completeness
description: Use when building or reviewing any screen that fetches, submits or displays data — to make sure loading, empty, partial, error, blocked and success are all designed, announced and recoverable instead of discovered in production. Applies to React, Vue, Svelte, Angular, Astro and server-rendered templates.
---

# State completeness

Every screen that shows data from somewhere has **eight** states. Most codebases
implement two. The gap is not a polish issue: the missing states are where users
conclude the product is broken and where support tickets come from.

## The eight states

| # | State | Question it answers | The defect when missing |
| --- | --- | --- | --- |
| 1 | First load | "Is anything happening?" | Blank page; user refreshes and doubles the request |
| 2 | Empty (never used) | "What do I do first?" | A table with headers and no rows reads as broken |
| 3 | Empty (no match) | "Why is my filter showing nothing?" | User thinks their data is gone |
| 4 | Partial | "Is this all of it?" | Silent truncation is indistinguishable from a bug |
| 5 | Success | "Did it work?" | User clicks twice and creates two records |
| 6 | Error (recoverable) | "What now?" | Dead end, or a native `alert()` |
| 7 | Error (not recoverable) | "Who do I tell?" | Retry loop against a permanently failing endpoint |
| 8 | Blocked | "Why can't I?" | A disabled control with no explanation |

Then the transitions: what happens *after* a successful action, and what remains on
screen when the person navigates away and comes back.

## Rules that hold in every framework

### Loading (P22, P54, P50)

- **Shape the skeleton like the content.** Three grey bars where three rows will be;
  not a centred spinner over an empty box. The layout must not jump when data lands.
- **Announce it.** `role="status"` with `aria-live="polite"` and a name: "Loading
  submissions". A spinner with no name is invisible to assistive technology.
- **Acknowledge inside 400ms** (P57, Doherty). If the work takes longer, show a
  progress value; if it is unknown, say "this can take a minute" rather than leaving
  a bar at 90%.
- **Behind-the-button (P50):** the control that started the work disables itself and
  changes its label to "Saving…". The rest of the page stays usable.
- **Never block the whole page for one panel's request.**

### Empty (P25)

Two different sentences, two different actions:

- *Never used:* "No submissions yet. Import a CSV or add the first one." — with the
  import and add actions.
- *No match:* "No submissions match 'graded'. Clear the filter." — with the clear action.

Never use the same copy for both. "No data" is not a state description; it is what a
developer writes when they have not decided.

### Partial

If a list is capped (`limit`, `take`, `slice`), the UI must say so: "Showing 50 of
312. Load more." Otherwise the user believes the product lost 262 records.

### Error (P23)

- Render **where the action happened**, not at the top of the page.
- Say three things: what failed, whether it is recoverable, what to do next.
  "Could not load submissions. Check your connection and retry." beats "Error".
- Include the retry, wired to the same request.
- A failed *action* must not clear the form. The user's typing is the most expensive
  thing on the page.
- If the API returns a message, show it — do not replace a specific server message
  with a generic one. If it is unsafe to show, say why in a comment.

### Blocked

Distinct from disabled. "You do not have permission to reassess this submission.
Ask the course owner." is a state. A grey button is not.

### Success

- A confirmation that names what happened: "Grade saved for Ada Obi." Not "Success".
- If the action removes the item from the current view, the confirmation must be
  visible after it disappears (or the user thinks the wrong row went).
- Optimistic UI (P13) needs a rollback path and a message for the rollback.

## Review procedure

For each screen in scope:

1. List every request it makes: one row per `fetch`/`api.*` call.
2. For each, write down which state renders during (a) pending, (b) failure,
   (c) success-with-zero-rows, (d) success-with-a-cap.
3. Mark any cell you cannot answer from the source as **missing**, not as "probably
   handled".
4. Check the error path actually sets state: `catch {}` and `.catch(() => {})` are the
   two patterns that swallow the failure and leave the user staring at an unchanged
   screen. The engine flags both (`swallowed-error`).
5. Check the screen after the mutation, not just during it.

## What the engine proves, and what it cannot

The engine can prove: a bare "Loading…" with no status role, a swallowed catch, a
native `alert()`, a disabled button with no stated reason, an empty state with no
action text nearby.

It cannot prove that the empty state is *well written*, that the retry works, or that
the skeleton matches the content. Those need reading the component and, ideally,
watching it run.

## Checklist

- [ ] Eight states named in the design spec, each with a sentence and an action.
- [ ] Loading announced with a name, and shaped like the result.
- [ ] Distinct copy for "never had data" and "filtered to nothing".
- [ ] Capped lists say they are capped.
- [ ] Failures render near the action, keep the user's input, and offer retry.
- [ ] No `catch {}` anywhere in a data path.
- [ ] Success names the object it affected.
- [ ] A blocked state exists for permission, not just for missing input.
