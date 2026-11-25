# Commands

| Command | Use it to | Writes code? |
| --- | --- | --- |
| `/ux-review` | Review a screen against the patterns and the nine skills | No |
| `/ux-design` | Specify a new screen before it is built; delegates to the `ux-designer` agent; stops at an approval gate | No (one spec under `docs/ux/`) |
| `/ux-audit` | Audit source, a URL/HTML file, or screenshots; ranked report | No by default |
| `/restyle` | Re-skin an existing UI to a new visual character via `DESIGN.md` | Yes |

## `/ux-design` spec sections

Job · Users and assumptions · Entry points · Flow · Hierarchy · Wireframe · States ·
Copy · Interaction detail · Accessibility contract · Component specification ·
Responsive behaviour · Tokens and components · Acceptance criteria · Patterns applied ·
Out of scope · Open questions. It ends: **Approve to implement, or tell me what to change.**

## `/ux-audit` inputs

| Input | Evidence |
| --- | --- |
| Path | source |
| URL or HTML file (`northstar page`) | measured |
| Screenshot(s) | visual |

## Engine API operations versus installed slash commands

The plugin currently exposes four callable slash commands: /ux-review, /ux-design, /ux-audit and /restyle. The TypeScript engine additionally exports four programmatic operations — ux-pattern, ux-states, ux-system and ux-test. Those four API operations are not separate installed slash-command files in this plugin snapshot. This distinction is intentional and should be preserved in feature counts.
