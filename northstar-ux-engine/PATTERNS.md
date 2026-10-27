# Pattern library

Seventy-six patterns. **28** are machine-checked from source; the other **48** need a person or a browser, and are listed here so nobody claims coverage they do not have.

Each pattern names the skill that owns the judgement and, where it exists, the engine check that can prove a violation. The numbering is Northstar's own index and is stable: findings quote it, so a rule can change without renumbering a report someone is already reading.

Run `node bin/northstar.mjs patterns` for the same list as machine-readable text.

## Checked patterns

| Pattern | Name | Check | The standard it is held to |
| --- | --- | --- | --- |
| P02 | Password field | `unlabelled-input` | A password field states its rules before submission, offers a reveal toggle, and never blocks paste. |
| P03 | File upload | `disabled-without-reason` | Uploads show the chosen file, its size, progress and a way to remove it before it is sent. |
| P05 | Disabled buttons | `disabled-without-reason`, `disabled-contrast` | A blocked control says what is blocking it, in the place the user is looking. |
| P06 | Hover trap | `hover-only-action` | Nothing needed to finish the task exists only on hover. |
| P11 | Validation timing | `native-alert` | Errors appear when the field is left, not on the first keystroke, and never as a modal. |
| P13 | Optimistic UI | `swallowed-error` | An optimistic update has a rollback and a message for the case where the server refuses. |
| P15 | Images, icons and alt text | `image-without-alt` | Every image declares its role: described, or explicitly decorative. |
| P17 | Links and destinations | `placeholder-link`, `target-blank-noopener` | A link goes somewhere real; an unconfigured destination is not rendered as `#`. |
| P21 | Animation timing and reduced motion | `no-reduced-motion`, `animate-height-auto` | Motion is short, purposeful, and absent when the user asked for it to be absent. |
| P22 | Skeletons | `bare-loading` | A skeleton has the shape of the content it becomes, so the layout does not jump. |
| P23 | Error states | `native-alert`, `swallowed-error` | An error says what failed, whether it is recoverable, and what to do next. |
| P24 | Field states | `placeholder-contrast` | Default, hover, focus, filled, invalid, disabled and read-only are each visibly distinct. |
| P29 | Navigation patterns | `nav-missing-current` | The current location is marked, in the nav and in the document title. |
| P42 | Touch targets and swipe | `small-target` | Every target reaches 24×24 CSS px, and a swipe has a visible alternative. |
| P44 | Z-index and depth layers | `zindex-arms-race` | Layers come from a short documented scale and a stacking context per surface. |
| P46 | Focus states | `focus-ring-removed`, `no-focus-style` | Focus is always visible, at 3:1 against what is behind it, and follows the reading order. |
| P48 | Destructive actions and undo | `native-confirm` | Destruction is named, confirmed in place, and reversible for a few seconds. |
| P51 | Form labels and field anatomy | `unlabelled-input`, `accidental-submit` | Every field has a persistent label, a hint where needed, and an error slot that does not shift the layout. |
| P54 | Loading states | `bare-loading` | Loading is announced, shaped, and finished — never an indefinite spinner with no name. |
| P59 | Dark mode | `text-contrast` | Dark mode is a token set, not an inverted filter: surfaces stay layered and accents stay legible. |
| P61 | Pagination | `pagination-not-in-url` | The page you are on survives a refresh, a share and the back button. |
| P62 | Accordions and disclosure | `animate-height-auto` | A disclosure announces its state and animates something the browser can actually animate. |
| P63 | Data tables | `table-semantics`, `numeric-cells` | Columns are scoped, numbers line up, and the header stays visible while scrolling. |
| P66 | Overflow and long content | `fixed-width-container` | Long words, long emails and translated strings wrap without breaking the layout, and no container is wider than the viewport. |
| P67 | Contrast of non-text UI | `text-contrast` | Borders, icons and focus rings used to convey state reach 3:1 against their neighbour. |
| P69 | Design tokens | `raw-colour-in-class` | One token layer feeds every surface, and `DESIGN.md` records what it contains. |
| P70 | Contrast and colour legibility | `text-contrast`, `disabled-contrast` | Text clears 4.5:1 and large text 3:1 against the colour actually behind it. |
| P72 | Radii and inner corners | `radius-off-scale` | Radii come from one scale, and an inner corner is the outer radius minus the padding. |

## Forms and input — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P01 | Verification codes and OTP entry | `form-ux` | A code entry is one field that advances, pastes cleanly, and reports a wrong code without clearing it. |
| P04 | Input masking and formatting | `form-ux` | Formatting is applied while typing only where it helps, and never silently rewrites a value the user pasted. |
| P07 | Date and time pickers | `form-ux` | A date field accepts typing, names its format, and never demands a calendar for a year the user already knows. |
| P08 | Colour picker | `form-ux` | Colour is chosen with a value you can type, and the choice is confirmed beside the sample. |
| P09 | Sliders and ranges | `form-ux` | A slider shows its value, its bounds and its step, and accepts keyboard increments. |
| P10 | Steppers and multi-step flows | `information-hierarchy` | A multi-step flow shows where you are, what is next, and whether you can go back without losing input. |
| P20 | Toggles and switches | `feedback-and-affordance` | A switch changes a setting immediately, announces the new state, and can be undone. |
| P32 | Dropdowns and selects | `form-ux` | A custom select keeps the native keyboard model, including type-ahead and Escape. |

## Interaction — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P14 | Inline editing | `feedback-and-affordance` | Editable content looks editable, saves on blur or on Enter, and says whether it saved. |
| P16 | Bulk actions | `feedback-and-affordance` | A bulk action names how many items it will affect before it runs. |
| P18 | Search | `state-completeness` | Search distinguishes "nothing matched" from "not searched yet", and keeps the query in the URL. |
| P19 | Filter chips | `feedback-and-affordance` | Applied filters are visible, individually removable, and reflected in the result count. |
| P28 | Command palette | `feedback-and-affordance` | A palette is reachable from the keyboard, lists the actions the page owns, and closes on Escape. |
| P31 | Context menus | `feedback-and-affordance` | A context menu has a keyboard equivalent; right-click is never the only route to an action. |
| P35 | Drag and drop | `feedback-and-affordance` | Every drag has a keyboard path, a drop indicator, and an undo. |
| P49 | Autosave and settings | `state-completeness` | A saved-nothing-lost state is visible, and settings changes say whether they applied. |

## Feedback — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P26 | Toasts and notifications | `feedback-and-affordance` | A toast reports a completed action, does not steal focus, and can be dismissed. |
| P27 | Tooltips | `feedback-and-affordance` | A tooltip adds a hint, never the only copy of the label, and opens on focus as well as hover. |
| P36 | Live cursors and presence | `visual-character` | Presence is decoration; it never moves the content the user is reading. |
| P37 | Star rating | `feedback-and-affordance` | A rating is a set of radio buttons with a label per value, not five clickable spans. |
| P56 | Notifications and the peak-end rule | `feedback-and-affordance` | The last thing a flow says is the thing the user remembers; end on confirmation, not on a spinner. |

## States — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P25 | Empty states | `state-completeness` | An empty state explains why it is empty and offers the one action that fills it. |
| P50 | Behind-the-button loading | `state-completeness` | The control that started the work shows it is working, and cannot be pressed twice. |
| P68 | Reduced data and slow networks | `state-completeness` | The interface is still usable while images and fonts are missing. |

## Structure and navigation — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P30 | Tabs | `information-hierarchy` | Tabs use the tab role pattern, keep their selection in the URL, and do not nest scroll areas. |
| P33 | Modal hierarchy | `information-hierarchy` | One modal at a time, focus trapped and returned, and a title that says what it is for. |
| P34 | Bottom sheets | `responsive-design` | A sheet is dismissible by drag, by Escape and by a visible button, and does not cover its own submit. |
| P45 | Hierarchy and the serial-position effect | `information-hierarchy` | The first and last items in a list get the attention; the middle is where items go to be missed. |
| P47 | Modal, toast and popover stacking | `design-system` | Overlays layer in the order they were opened, and Escape closes the top one only. |
| P55 | Tabs, segments and views | `information-hierarchy` | A view switch keeps the scroll position and the selection when the user comes back. |
| P58 | Zeigarnik and progress | `information-hierarchy` | Unfinished work is visible and resumable; completed work leaves the working set. |

## Visual craft — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P38 | Charts | `visual-character` | A chart has a title, units, a zero baseline where it means something, and a text alternative. |
| P39 | Card hover and the perfect card | `visual-character` | A card hover lifts or shifts without moving the hit area, and the card has one clear action. |
| P43 | Gestalt grouping and proximity | `information-hierarchy` | Space groups related things; a rule between two items is an admission that the space did not. |
| P52 | Von Restorff and the one accent | `visual-character` | One element per view is allowed to be different; if everything is emphasised, nothing is. |
| P53 | Golden ratio, grid and density | `design-system` | Spacing comes from one scale, and density is chosen for the task rather than inherited by accident. |
| P71 | Iconography | `visual-character` | Icons share a stroke, a size and an optical weight, and none of them stands alone without a label. |
| P73 | Shadows and elevation | `design-system` | Elevation is a small ordered set, and shadow direction agrees with light direction everywhere. |
| P74 | Gradients | `visual-character` | A gradient is a decision about light, not a default background. |
| P75 | Modern CSS affordances (`:has`, container queries) | `design-system` | New CSS is used where it removes JavaScript, with a stated fallback for the browsers the product supports. |

## Motion — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P41 | Scroll animations | `design-system` | Scroll reveals are one-way, cheap, and off under reduced motion. |
| P57 | Doherty threshold | `feedback-and-affordance` | Every interaction acknowledges itself inside 400ms, even when the work takes longer. |
| P60 | Easing and spring | `design-system` | One easing family for entrances, one for exits, no bounce on anything the user is reading. |

## Accessibility — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P65 | Selection and focus management | `responsive-design` | Closing a dialog returns focus to what opened it; removing a row moves focus somewhere sensible. |
| P76 | Skip links and landmark structure | `responsive-design` | The page has one `main`, a heading order that makes sense, and a skip link if the nav is long. |

## Content — judged, not checked

| Pattern | Name | Owned by | The standard it is held to |
| --- | --- | --- | --- |
| P12 | Microcopy | `visual-character` | Labels name the thing; buttons name the action; errors name the fix. |
| P40 | Landing skeleton and the de-AI hero | `visual-character` | The hero says what the product does for whom, in the user’s words, with one action. |
| P64 | Field validation copy | `form-ux` | An error message names the field, the rule and the fix — not "invalid input". |

## Every pattern without a check

P01 · P04 · P07 · P08 · P09 · P10 · P12 · P14 · P16 · P18 · P19 · P20 · P25 · P26 · P27 · P28 · P30 · P31 · P32 · P33 · P34 · P35 · P36 · P37 · P38 · P39 · P40 · P41 · P43 · P45 · P47 · P49 · P50 · P52 · P53 · P55 · P56 · P57 · P58 · P60 · P64 · P65 · P68 · P71 · P73 · P74 · P75 · P76

These are not gaps in the engine; they are the part of UX that cannot be decided from a file. `/ux-audit` reads the source for them and reports what it finds as an observation, never as a measurement.
