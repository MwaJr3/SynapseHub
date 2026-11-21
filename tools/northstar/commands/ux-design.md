---
description: Write a UX specification before writing code — flows, states, hierarchy, copy, tokens, and the accessibility contract. Ends with an explicit approval gate; no implementation until the user approves.
allowed-tools: Read, Glob, Grep, Task, Write(docs/ux/**), Bash(git status:*), Bash(node:*)
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
4. **Retrieve the patterns.** `node tools/northstar/bin/northstar.mjs patterns` lists
   the 76 patterns (`P01`–`P76`) and the extensions (`X01`+). Cite the ones that apply
   and why; the spec ends with a *Patterns applied* section.
5. **Delegate the drafting to the `ux-designer` agent** with what steps 1–4 found
   (project context, answers, assumptions, patterns). The agent writes the spec and
   nothing else. If agents are unavailable in the session, write it yourself with the
   same template and the same limits.
6. **Write the spec** to the path the user names, or propose
   `docs/ux/<screen>.md`, and show it in full in the reply.

## Spec template

```markdown
# <Screen> — UX specification

## Job
One paragraph: who arrives, what they are trying to finish, what "done" means.

## Users and assumptions
Who is on this screen (role, familiarity, device, state of mind), what they must
understand before they can act, and the constraints (permissions, latency, legal,
accessibility needs). Every guess is written as `assumed — confirm: <guess>`. Nothing
here is invented research.

## Entry points and prior state
Where they come from, what they already know, what is pre-filled, what is not.

## Flow
Numbered steps, including the back path and the cancel path. Name the one decision
that cannot be deferred.

## Hierarchy
The single primary action. The supporting actions, ranked. What is secondary and
must be visually quieter. What is not on this screen at all.

## Wireframe
A textual wireframe a developer can build from. Regions in reading order, nesting by
indentation, the primary action marked ★, and the narrow-screen behaviour in brackets.
Adapt the shape to the screen; do not copy this one.

```
Page
├── Header                         [sticky ≥768px; static below]
│   ├── Title (h1)
│   └── ★ Primary action           [full-width bar at 320px]
├── Summary                        [wraps to a 2×2 grid at 320px]
├── Filters                        [collapses into a "Filters (n)" sheet at 320px]
├── Results (table)                [becomes a stacked card list at 320px]
│   └── Row actions                [menu; never hover-only]
└── Pagination                     [page lives in the URL]
```

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

## Component specification
| Component | Responsibility | Inputs | Events | States | Keyboard | Reuses |
| --- | --- | --- | --- | --- | --- | --- |
One row per component. "Reuses" names the existing component it extends, or says why
none fits.

## Responsive behaviour
What each region becomes at 320px, 768px and 1280px+: stack, collapse, scroll,
rearrange, simplify or replace (a table is not shrunk; it becomes something else).
Name the content that forces each change, not just a breakpoint number. Include text
at 200% zoom and the touch target sizes.

## Tokens and components
Which existing components are reused, which are extended, which are new. Named
tokens only — no raw values. If a token is missing, say which one and what its role
is; do not invent a hex value.

## Acceptance criteria
Five to ten testable statements, each one a test someone could write:
`Given <state>, when <action>, then <observable result>`. Cover every row of the
states table, the keyboard path, and the narrow-screen behaviour.

## Patterns applied
The pattern ids (`P50`, `X05`, …) that shaped this spec, each with the reason it
applies here and the decision it produced. If two patterns pull in different
directions, name the trade-off and the choice.

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
