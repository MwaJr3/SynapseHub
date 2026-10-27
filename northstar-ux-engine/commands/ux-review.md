---
description: Review a diff for UX and accessibility defects. Read-only — reports MUST FIX / SHOULD FIX / NICE TO HAVE with file and line, and changes nothing.
allowed-tools: Read, Glob, Grep, Bash(git diff:*), Bash(git status:*), Bash(git log:*), Bash(node:*)
---

# /ux-review

Review the current changes as a UX engineer would review a pull request: find what
will cost a user time, trust or access, and say where it is.

**This command is read-only.** It does not edit, stage, commit or push. If a fix is
worth making, it says so and stops. Implementation belongs to the person who asked
for the review, or to a later command with its own authorisation.

## What to review

The changes under review are whatever the user names. Default to the working tree,
then the last commit:

!`git status --porcelain`

!`git diff HEAD --stat`

If the range is empty, say so and stop — a review of nothing is not a clean review.

## Procedure

1. **Establish the scope.** List the changed UI files (`.tsx`, `.jsx`, `.css`,
   `.scss`, `.html`, and server-rendered `.py` templates). Ignore generated files,
   lockfiles and snapshots. If a change is backend-only, say the review is
   out of scope and name what you would need.
2. **Run the engine on the changed files** rather than guessing:
   `node northstar-ux-engine/bin/northstar.mjs review . --ref HEAD` (or the path to
   the plugin's `bin/northstar.mjs` when installed elsewhere). Quote its findings;
   do not restate them as your own view.
3. **Read the diff itself** for the things a rule cannot prove: does the new state
   have a loading, empty and error path? Does the new control have a name? Does the
   new copy name the action? Does it move focus somewhere sensible after it acts?
4. **Apply the skills** that the diff touches — `state-completeness` for a new
   screen, `form-ux` for a new field, `responsive-design` for anything with a
   breakpoint, `design-system` for anything that moves.
5. **Calibrate.** Before reporting, ask of each finding: *what observation would
   prove this wrong?* If you cannot name one, drop it or mark it as a question.

## Report format

Start with one sentence: what the change does, and whether it is in good shape.

Then three groups, in this order. Omit a group that is empty.

**MUST FIX** — a user cannot complete the task, or WCAG 2.2 AA is violated, or the
change loses data. Every entry:

```
[file:line] What is wrong.
Why it matters: <the user consequence, not the rule number>
Fix: <the smallest change that resolves it>
Pattern: P<n> <name>
```

**SHOULD FIX** — costs time or confidence but does not block. Same shape.

**NICE TO HAVE** — craft and consistency. One line each, no essay.

Then:

- **Questions** — things you could not settle from source. Phrase them as
  questions, not as findings.
- **Not checked** — what you did not verify (rendering, real network, screen
  reader output), so nobody reads silence as approval.

## Rules

- A finding without a file and a line is an opinion. Either find the line or move
  the point to Questions.
- Do not invent a defect to have something to say. "No must-fix findings" is a
  complete review.
- Do not propose a redesign inside a review. If the change is architecturally
  wrong, say so once, at the top, and review the rest as written.
- Never claim you ran the app, opened a browser or measured performance unless
  you did and can show the command.
