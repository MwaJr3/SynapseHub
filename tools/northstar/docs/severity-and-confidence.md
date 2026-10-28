# Severity, confidence and the evidence bar

This is the reference behind the `ux-auditor` skill. It is short on purpose: a scale
nobody can remember is a scale nobody applies consistently.

## Severity

| | Meaning | Ask this |
| --- | --- | --- |
| **P0** | The task cannot be completed, or the product exposes something it should not. | Can a competent user finish this flow by any route? If not, P0. |
| **P1** | WCAG 2.2 AA failure, lost user work, or a whole group excluded. | Would someone on a keyboard, a screen reader, or 200% zoom be blocked? |
| **P2** | Costs time, confidence or a retry. Possible, but ambiguous or annoying. | Does the person have to guess, or try twice? |
| **P3** | Craft, consistency, polish. | Would a user notice without being shown? |

Anything that is not clearly one of these is not a finding. Put it in Questions.

## Confidence

| | Evidence | May be written as |
| --- | --- | --- |
| **high** | A measured value or unambiguous markup. | A finding with a number. |
| **medium** | A pattern plus a stated assumption. | A finding with the assumption in the sentence. |
| **low** | A suspicion needing the rendered page. | A question, with no severity. |

The engine's rules carry a static confidence. The auditor's job is to keep theirs
honest: a rule marked `medium` is not a licence to write a confident claim.

## The evidence bar

Admissible:

- `file:line`
- the quoted snippet at that line
- a computed value with its inputs (`#ffffff on #0891b2 = 3.68:1`)
- a command the reader can re-run, and its real output

Not admissible:

- "This feels cluttered."
- "Best practice is…"
- "Users generally prefer…"
- A screenshot you did not take.
- A performance number you did not measure.
- "Fixed" without the second measurement.

## What "not checked" means

Every report ends with the checks that were not performed. In this engine, source
analysis cannot establish:

- how anything actually renders (no browser);
- real contrast when text sits over an image, a gradient, or an unknown theme colour;
- whether a focus order is sensible, only whether focus is visible in the CSS;
- screen-reader announcement in practice;
- touch behaviour on a device;
- performance;
- whether the copy is good — only whether the pattern is followed.

Writing that list is not a hedge. It is the boundary of the claim, and it tells the
reader exactly where their own eyes are still needed.
