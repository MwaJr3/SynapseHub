---
name: intent-discovery
description: Use when starting a new screen, flow or component, or when a request describes a solution ("add a modal", "make a dashboard") without the problem it solves. Establishes the job, the user's state, the failure modes and the smallest thing that finishes the job — before any design or code exists.
---

# Intent discovery

The most expensive UX defect is the one built into the brief. A modal that should
have been a page, a wizard that should have been one form, a dashboard that answers a
question nobody asked — none of them are visible in a code review, because the code
is correct. This skill is the check that happens before there is code.

## The four questions

Ask these in order and do not skip ahead. Each answer narrows the design space, and
three of the four can usually be answered from the repository rather than the user.

### 1. Who arrives, and in what state?

Not a persona. A situation: *"A teacher with forty submissions open in another tab,
who wants the average mark and is interrupted every ninety seconds."* That sentence
already rules out a three-step flow, a full-page spinner and any animation longer
than the interruption.

If the answer is "everyone", the screen is doing two jobs. Name both and split them.

### 2. What does "finished" mean?

The observable end state. "The learner sees which three concepts are weakest and
clicks into one" is finishable. "They understand their progress" is not, and a screen
built for it will never feel complete to anyone.

### 3. What will go wrong?

List the failure modes before listing the features, because the states exist to serve
them. For every screen there are at least four:

- the data did not load;
- the data loaded and is empty;
- the person is not allowed to do this;
- the action failed halfway.

A design that has not decided what happens in those four cases is not finished, no
matter how the happy path looks.

### 4. What is the smallest thing that finishes the job?

Strip until removing one more element breaks question 2. Everything removed becomes
an explicit "out of scope" line, not a silent omission — the next person needs to
know the difference between deliberately absent and forgotten.

## Working with the request as given

Users describe solutions because solutions are easier to picture. Do not refuse the
solution; **hold it as a hypothesis** and test it against the job:

| The user asked for | Ask instead | Often the answer |
| --- | --- | --- |
| A modal | Does this interrupt a task or continue one? | A side panel or an inline expansion |
| A wizard | Which steps depend on earlier answers? | One page, sections revealed in order |
| A dashboard | What decision does it support? | One screen for that decision, not twelve charts |
| A toast | Does the user need to act on it? | Inline status for the thing it affects |
| A confirmation dialog | Is it reversible? | Undo, with a time window |
| A loading spinner | What is being loaded, and what shape is it? | A skeleton of the content |
| "Make it pop" | What should be noticed first? | One thing, made unmistakable |

State the hypothesis back in one line before proceeding: *"You asked for a modal; I
think this is an inline save because the teacher edits four fields in a row and a
dialog would interrupt each one. If it is really a separate task, say so and the
modal is right."*

## Where intent lives in the repository

Check these before asking a question the code already answers:

- `README.md` — who the product is for; the honesty/limitations section usually names
  the cases the product does not handle.
- `docs/` and `DESIGN.md` — decisions already made, and the reasons.
- `portfolio.json` / project metadata — the product's own one-line description.
- The nearest existing screen — it encodes the house style of interaction.
- The API client (`api.ts`) — the real set of outcomes the UI must handle, including
  the errors the design forgot.

If the repository contradicts the request, say so with the file: "The README says
demo data is simulated and labelled; this screen would present it unlabelled."

## Output

A short brief, not a document:

```
Job:       <who> arrives to <finish what>, and is done when <observable end state>.
Fails at:  <the four failure modes, one line each>
Smallest:  <the elements that survive the strip>
Not now:   <what was cut, and where it goes>
Risk:      <the one assumption that, if wrong, changes the design>
```

The brief goes at the top of the design spec (`/ux-design`) and stays in the file.
When someone asks in six months why the screen has no bulk actions, the answer is
there.

## Anti-patterns

- **Personas with adjectives.** "Busy professionals who value simplicity" changes no
  decision. A situation changes several.
- **Jobs that are really features.** "The job is to click Export" is not a job.
- **Skipping the failure list** because the product "is a demo". Demo data still
  fails to load, and the reviewer who cannot tell whether the empty table means
  "loading" or "empty" will file it as a bug.
- **Designing for the reviewer.** The screen is not a place to demonstrate range.
