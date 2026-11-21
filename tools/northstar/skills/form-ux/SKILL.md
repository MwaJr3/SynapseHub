---
name: form-ux
description: Use when building or reviewing any form or input — labels, validation timing, error copy, field states, selects, date and file inputs, codes, passwords, sliders, steppers. Focuses on the cost of a wrong entry and the cost of a rejected submission.
---

# Form UX

A form is a conversation about someone's data. Every avoidable rejection is a small
insult, and every unexplained field is a question the user has to guess the answer to.

## Anatomy of one field

```
Label                 ← always visible; names the field
  Hint (optional)     ← the rule, before they type
[ input ]             ← 44px tall, visible border, focus ring at 3:1
Error (when invalid)  ← in the same place the hint was; never shifts the layout
```

Rules:

- **The label persists.** A placeholder is an example, not a name. When the field is
  filled, the placeholder is gone and so is any indication of what the field was.
  (WCAG 3.3.2 and 4.1.2 — the engine flags `unlabelled-input`.)
- **The hint says the rule before it can be broken**: "At least 8 characters", not
  "Password too short" after the fact.
- **Reserve the error line.** A form that jumps when an error appears moves the submit
  button out from under the pointer.
- **Placeholder contrast.** `placeholder-slate-500` on a dark field is 3.75:1 and
  fails. It is a real instruction to the user; hold it to 4.5:1.
- **Disabled fields** are unreadable and unfocusable. Show the value read-only with a
  note instead ("Set by your administrator").

## Validation timing (P50)

| Moment | Correct behaviour |
| --- | --- |
| While typing the first time | Nothing. No error, no green tick. |
| On blur | Validate this field. Show its error. |
| On submit | Validate everything, focus the first invalid field, and scroll it into view. |
| After a field has errored | Re-validate as they type, so the error clears as soon as it is fixed. |

Errors on the first keystroke punish the user for not having finished yet. Errors
only on submit make a ten-field form a guessing game. The table above is the whole
rule; there is no reason to deviate.

## Error copy (X07, P51)

Name the field, the rule and the fix:

- ✗ "Invalid input."
- ✗ "Error: email"
- ✓ "Enter an email address, like name@example.com."

One error per field, in the same slot every time, associated with the input via
`aria-describedby`, and announced with `role="alert"` on the summary when the form is
submitted.

Server-side errors are attached to the field they belong to. A 422 that returns
`{"email": "already registered"}` renders next to the email field — not as a banner
at the top where the user has to work out which field it refers to.

Never clear the form on failure. Never use `alert()` (the engine flags
`native-alert`). Never `window.confirm` for a destructive submit (flagged as
`native-confirm`).

## Specific controls

### Password (P57)

- Reveal toggle that does not move the layout and is keyboard reachable.
- Never block paste. Password managers are the correct behaviour, not an attack.
- State the minimum before typing; do not enforce "one uppercase, one symbol" without
  saying so up front.
- Confirm-password fields only when a reveal toggle does not already solve it.

### Verification codes / OTP (P60)

- One visible group, but a single logical field: paste the whole code and it lands.
- `inputmode="numeric"`, `autocomplete="one-time-code"`.
- On a wrong code, keep the entry, select it, and say how many tries remain.
- Do not auto-submit on the last digit unless the code length is fixed and known.

### File upload (P56)

- Show the chosen file name and size *before* uploading.
- Progress, with a cancel that actually aborts.
- Remove/replace before submission. After submission, say what was stored.
- Accept-list in the `accept` attribute **and** in the hint text — the attribute is a
  filter, not an explanation.

### Dates (P07)

- Accept typed input. A calendar is a helper, not a gate: someone entering a date of
  birth does not want to page through 40 years.
- Name the format: "DD/MM/YYYY" beside the field.
- `min`/`max` where they are real, and an error message that names the range.
- Native `<input type="date">` is usually the right answer; a bespoke picker has to
  earn its complexity.

### Selects (P20)

- A native `<select>` inherits the platform's keyboard model for free. A custom one
  must reimplement type-ahead, Home/End, Escape and arrow navigation — and usually
  gets two of the four.
- Include a disabled placeholder option ("Choose a section") rather than
  defaulting to the first real option, which submits a choice the user did not make.

### Sliders (P33)

- Show the current value, the min and max, and the step.
- Arrow keys change by one step; Page Up/Down by ten.
- Pair with a number input when precision matters.

### Steppers (P38)

- Show total steps, current step and what remains.
- Back never loses validated input.
- The final action says what it will do: "Create course", not "Finish".

### Switches (P41)

- Apply immediately and say so; do not require a separate Save for a toggle that looks
  like it already applied.
- Announce the new state (`role="switch"` + `aria-checked`).

## Layout

- One column. Two-column forms exist to fit a page, not to help the user, and they
  break the tab order.
- Group with a `<fieldset>` and a `<legend>` when fields share a decision.
- The submit button sits at the end of the reading order, aligned with the fields'
  left edge, and its label names the action.
- Optional fields are marked; required fields are marked when most are optional.

## Checklist

- [ ] Every field has a persistent label and, where needed, a hint.
- [ ] Errors appear on blur, clear as they are fixed, and sit in a reserved slot.
- [ ] Error copy names the field, the rule and the fix.
- [ ] The form survives a failed submit with all input intact.
- [ ] No `alert()`, no `confirm()`, no placeholder-only labels.
- [ ] Every control is reachable and operable by keyboard.
- [ ] Paste works everywhere.
