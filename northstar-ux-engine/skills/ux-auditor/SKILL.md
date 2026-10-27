---
name: ux-auditor
description: Use when judging UX findings rather than finding them — assigning severity and confidence, deciding what to report, writing an audit report, or checking whether a claimed fix is real. Defines the evidence bar, the P0–P3 scale, the top-three rule, and what counts as proof.
---

# UX auditor

Finding is easy; judging is the work. This skill is the method that keeps an audit
honest: what severity means, what confidence means, what evidence is admissible, and
what a report must refuse to say.

## Severity is about the user, not the code

| | Definition | Test |
| --- | --- | --- |
| **P0** | A user cannot complete the task at all, or the product exposes data/safety. | Can a competent user finish the flow by any route? If no, P0. |
| **P1** | WCAG 2.2 AA failure, or a loss of the user's work, or a whole group excluded. | Would someone using a keyboard, a screen reader, or 200% zoom be blocked? |
| **P2** | Costs time, confidence or a retry. The task is possible but the product is annoying or ambiguous. | Does the person have to guess, or try twice? |
| **P3** | Craft, consistency, or polish. Nothing is harder; the product just looks less considered. | Would a user notice without being shown? |

Rules of the scale:

- **P0 requires a concrete blocked task**, not "this could confuse some users". Name
  the task and the group.
- **WCAG failures are P1 by default** — a removed focus ring, an unlabelled input, a
  4.5:1 body text failure. Non-text contrast failures (3:1) are also P1; a marginal
  4.44:1 body pair may be P2 if it is a single secondary label, and P1 if it is body
  copy.
- **Never inflate to get attention.** A list where everything is P1 gets triaged as
  noise. One real P0 outranks twenty P1s, and saying "no P0 found" is a stronger
  report than inventing one.
- **A defect repeated 40 times is one finding** with a count, not forty rows. The fix
  is one decision.

## Confidence is about the evidence

| | Meaning | What you may write |
| --- | --- | --- |
| **High** | Measured or unambiguous from the source. A ratio computed from two hex values; an input with no label in its markup. | "The pair is 3.68:1, below the 4.5:1 floor." |
| **Medium** | Follows from a pattern, with an assumption stated. A disabled button whose reason is not in the DOM. | "This blocks on a condition the user cannot see; unless it is explained elsewhere, it is P2." |
| **Low** | A suspicion that needs the rendered page. | Put it under **Questions**, not **Findings**. |

Low-confidence items do not get a severity. They get a question.

## The evidence bar

Admissible:

- A file path and line number.
- A quoted snippet from that line.
- A computed value (contrast ratio, target size, count of occurrences) with the inputs
  shown.
- A test or command the reader can re-run, with its real output.

Not admissible:

- "This looks cluttered."
- "Modern dashboards usually…"
- "Users generally prefer…"
- A description of a screenshot you did not take.
- A performance number you did not measure.
- A claim that a fix works, without the second measurement.

If a finding cannot meet the bar, it goes in **Questions** with the reason. That is a
useful section, not a failure.

## The top-three rule

A report leads with at most three items. They are the three most consequential, not
the three easiest or the three first found. A reader who stops after the top three
should still have done the most valuable work available.

If a P0 exists it is first. Ties break by how many users are affected, then by how
many screens, then by how cheap the fix is.

## Audit vs fix

The audit's output is a decision-ready list. The fix is a separate act with separate
authorisation:

- Never fix during an audit. The user asked what is wrong, not for changes.
- When fixing is authorised, state the list first, then change exactly it.
- Every fix ends with the same measurement that produced the finding. A contrast fix
  ends with the new ratio; a label fix ends with the label in the markup.
- Report the before and after counts from the engine, not an impression of improvement.

## Writing the report

```
# UX audit — <target>
<defects> defects across <occurrences> occurrences · P0 n · P1 n · P2 n · P3 n

## Top three
1. <title> — <where> · <one sentence: consequence> · <one sentence: fix>

## Findings
<table: severity | project | where | defect | pattern | evidence | fix>

## Questions
<what could not be settled from source, phrased as questions>

## Not checked
<rendering, devices, screen readers, performance, localisation — named explicitly>
```

The "Not checked" section is not a disclaimer; it is the boundary of the claim. A
report without one implies universal coverage it does not have.

## Reviewing an audit (including your own)

Before publishing, check:

1. **Every row has a file and a line.** If not, move it to Questions.
2. **Every severity can be defended in one sentence.** Write that sentence; if it
   takes two, the severity is probably wrong.
3. **No duplicate roots.** Five rows for one missing token is one row.
4. **Counts are computed, not estimated.** Re-run the engine after editing anything.
5. **Nothing is described as "observed" unless it was.** Source reading is
   "found in the source"; browser checks are "observed in <browser, at this width>".
6. **The report does not recommend a redesign** in a defect row. Scope creep inside a
   finding is how audits become architecture reviews.
