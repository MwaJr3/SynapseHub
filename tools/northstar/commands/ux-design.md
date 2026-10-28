---
description: Write a UX specification before writing code — flows, states, hierarchy, copy, tokens, and the accessibility contract. Ends with an explicit approval gate; no implementation until the user approves.
allowed-tools: Read, Glob, Grep, Write(tools/northstar/docs/**), Bash(git status:*), Bash(node:*)
---

# /ux-design

Produce the design *before* the implementation, in enough detail that the
implementation is typing rather than deciding. The output is a specification, not a
mockup and not code.

**There is an approval gate.** This command stops after presenting the spec. It does
not scaffold components, does not create files under `src/`, and does not "get
started while waiting". The user says go, or says what to change.

## Procedure

1. **Read the project before asking anything.** `package.json`, the router, the
   existing components, `DESIGN.md` if present, and the 2–3 screens nearest the new
   one. Anything answerable from the code is not a question for the user.
2. **Ask only what the code cannot answer.** What job does this screen do? Who is
   doing it and in what state of mind? What must happen when it fails? Three
   questions maximum, each with a recommended default so the user can say "yes".
3. **Use the skills.** `intent-discovery` for the job-to-be-done and the failure
   modes; `information-hierarchy` for the order; `state-completeness` for every
   state the screen can be in; `form-ux` if there is input; `feedback-and-affordance`
   for the actions; `visual-character` for the one thing the screen should be
   remembered for; `design-system` for the tokens it will use.
4. **Write the spec** to the path the user names, or propose
   `docs/ux/<screen>.md`, and show it in full in the reply.

## Spec template

```markdown
# <Screen> — UX specification

## Job
One paragraph: who arrives, what they are trying to finish, what "done" means.

## Entry points and prior state
Where they come from, what they already know, what is pre-filled, what is not.

## Flow
Numbered steps, including the back path and the cancel path. Name the one decision
that cannot be deferred.

## Hierarchy
The single primary action. The supporting actions, ranked. What is secondary and
must be visually quieter. What is not on this screen at all.

## States
| State | When | What the user sees | What they can do |
| Empty (never used) | | | |
| Empty (no results) | | | |
| Loading | | | |
| Partial | | | |
| Success | | | |
| Error (recoverable) | | | |
| Error (not recoverable) | | | |
| Blocked / no permission | | | |

## Copy
Labels, headings, empty-state sentences, error messages (one per failure the API can
return), and the confirmation sentence. Written out, not described.

## Interaction detail
Focus order. What receives focus on entry and after each action. Keyboard path for
every pointer action. What happens on Escape, on back, on refresh.

## Accessibility contract
Names for every control; the heading structure; live-region announcements; contrast
targets for text and for non-text state; the reduced-motion behaviour; the touch
target sizes.

## Tokens and components
Which existing components are reused, which are extended, which are new. Named
tokens only — no raw values. If a token is missing, say which one and what its role
is; do not invent a hex value.

## Out of scope
What this screen deliberately does not do, and where that work goes instead.

## Open questions
Only ones that block a decision, each with the option you recommend.
```

## Rules

- No lorem ipsum, no "TBD" in the states table. An unknown is an open question, not
  a blank cell.
- Every state must name an action. A dead end that only says "Something went wrong"
  is a design defect, not a placeholder.
- Copy is part of the design. If the button says "Submit" in the spec, it will say
  "Submit" in the product.
- Do not introduce a new component when an existing one fits. Name the existing one.
- If the request is really "make it look better", this is the wrong command — say so
  and point at `/restyle`.
- Close with: **"Approve to implement, or tell me what to change."** Then stop.
