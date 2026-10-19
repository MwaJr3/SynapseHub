# Personal Operating System

The `/system` route is a **local-first 90-day personal operating system**. It is intentionally a small execution workspace rather than a general-purpose life tracker: every part should clarify a decision, reduce friction, support recovery, or produce a visible next action.

## What is implemented

### System health dashboard

The dashboard converts current data into five simple signals:

- **Energy** — an average from the latest seven check-ins, with emotional load treated as an inverse constraint.
- **Direction** — whether active goals remain visible.
- **Project** — whether one CORE project has been selected.
- **Decisions** — overdue decisions without a recorded choice.
- **Review** — whether the current cycle week has a reflection.

Signals are deliberately descriptive, not a score to optimise.

### Direction workspace

- Vision and identity statements
- Core values and an identity focus
- Minimum / standard / exceptional definitions of done
- Concrete 90-day goals, each with a domain, priority tier, measurable outcome, and proof
- A project portfolio with CORE, SUPPORT, EXPERIMENT, and PARKED states
- MVP, audience, milestone, stop-condition, and shipped status for every project

### Decision engine

A decision is classified as:

- **A — reversible:** decide quickly.
- **B — important but reversible:** timebox research and choose a testable direction.
- **C — high-cost / difficult to reverse:** pre-mortem, outside perspective, and an explicit deadline.

The register records options, upside, risk, opportunity cost, chosen option, confidence, and review date.

### Review and adaptation workspace

- A daily 1–5 energy check-in for sleep, physical energy, cognitive energy, and emotional load
- A 3-minute activation timer for interrupting analysis paralysis
- Trigger → warning signs → intervention blocker patterns
- A guided weekly review: progress, friction, adjustment, meaning anchor, relationship action, and calibration question
- Failure post-mortems that turn an outcome into a system change

## Data and privacy

No personal-system data is sent to a service. The workspace persists in the browser's `localStorage` under `synapsehub.personal-operating-system.v1`.

Use **Export JSON** before clearing browser data, changing devices, or starting a major new cycle. **Import / restore** accepts an export created by this workspace and does not modify current data if the file is not valid.

## Operating rhythm

1. **Daily:** rate capacity and choose one priority that fits it.
2. **Weekly:** complete the guided review; change the rule, environment, scope, or schedule when a pattern repeats.
3. **Per cycle:** protect Tier 1 foundations, ship a defined CORE project, and start a fresh 90-day clock only after extracting lessons from the last one.

The design principle is:

> The system should not only report activity. It should connect action to meaning, make trade-offs explicit, surface recurring friction, and create the next useful adjustment.
