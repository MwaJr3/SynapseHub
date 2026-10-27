# DESIGN.md — <product>

> Copy this file to the root of the product it describes (or to `docs/DESIGN.md`) and
> keep it current. If a token is not in here, it is not part of the system yet.

## Character

One sentence, falsifiable, that every visual decision answers to.

> *Example: a quiet, paper-like reading surface with one warm accent and no
> decoration above the fold, so the numbers are the only thing with weight.*

## Non-goals

What this product deliberately does not look like, and why. This section prevents the
same argument every quarter.

- Not a consumer marketing site: no illustrations above the fold.
- Not a terminal: monospace is for machine output only.

## Tokens

### Colour

| Token | Role | Light | Dark |
| --- | --- | --- | --- |
| `--surface` | page background | | |
| `--surface-raised` | cards, panels | | |
| `--border` | hairlines, dividers | | |
| `--text` | body copy | | |
| `--text-muted` | secondary copy — must still clear 4.5:1 | | |
| `--accent` | primary action and current selection, nothing else | | |
| `--accent-ink` | text on `--accent`, checked against it | | |
| `--danger` | destructive actions and errors | | |

Contrast pairs verified: `--text` on `--surface` = __:1 · `--text-muted` on `--surface`
= __:1 · `--accent-ink` on `--accent` = __:1.

### Space

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (px). Nothing outside the scale.

### Type

| Role | Family | Size | Weight | Line height |
| --- | --- | --- | --- | --- |
| Body | | | | |
| Secondary | | | | |
| Heading | | | | |
| Data | | | | |

### Radii

`4 · 8 · 12 · 16 · 24 · 999`. Nested corner = outer radius − padding.

### Elevation

| Level | Use | Value |
| --- | --- | --- |
| flat | default surface | border only |
| raised | card | |
| floating | popover, dialog | |

Light direction: from above. No exceptions.

### Layers

| Token | Value | Use |
| --- | --- | --- |
| `--layer-sticky` | 10 | sticky headers |
| `--layer-dropdown` | 20 | menus, popovers |
| `--layer-overlay` | 30 | scrims |
| `--layer-modal` | 40 | dialogs |
| `--layer-toast` | 50 | notifications |

### Motion

| Token | Value | Use |
| --- | --- | --- |
| `--duration-state` | 120ms | hover, focus, toggle |
| `--duration-enter` | 240ms | panels, dialogs |
| `--ease-enter` | `cubic-bezier(0.22, 1, 0.36, 1)` | entrances |
| `--ease-exit` | `ease-in` | exits |

`prefers-reduced-motion: reduce` stops all of the above except state changes.

## Components

| Component | Path | Variants | Owns |
| --- | --- | --- | --- |
| Button | | primary, secondary, ghost, danger | hover, focus, disabled + reason, loading |
| Field | | | label, hint, error slot |

## Do / don't

| Do | Don't |
| --- | --- |
| One accent per view | Colour three things to mean "important" |
| Group with space | Group with dividers |
| One primary action | Two buttons at the same weight |

## Not styled on purpose

Things that look plain because that is the decision.
