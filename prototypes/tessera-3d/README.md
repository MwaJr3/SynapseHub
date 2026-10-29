# Tessera · knowledge graph in depth — isolated 3D prototype

Milestone D's *prerequisite*, not milestone D. The cross-product 3D pass is gated on
stage-4 readiness (`docs/design/stage-4-readiness.md`); this prototype exists to test
one question while that gate is closed:

> Does depth help a learner understand the prerequisite structure, or is it decoration?

It is deliberately separated from production screens: no imports from `companies/tamuzi/tessera`,
no build step, no bundle, no route. Changing a stage-4 screen cannot invalidate it, and
integrating it later is a copy of what proved useful rather than a refactor of what
did not.

## Run it

```bash
python3 -m http.server 4173 --directory prototypes/tessera-3d
# open http://localhost:4173/
```

No network requests after load. No dependencies. One file, ~14 KB.

## What it does

* 16 concepts in four bands placed along **z** by prerequisite depth, on a shallow
  spiral; 15 edges drawn before the nodes so a prerequisite reads as *behind* what
  depends on it.
* A real perspective divide (`scale = 1 / (distance − z)`), not a CSS tilt: nearer
  concepts are larger, brighter and labelled; distant ones recede without vanishing.
* Depth also drives the label threshold, so text density falls off with distance
  instead of stacking.

## Controls and fallbacks

| Control | Behaviour |
| --- | --- |
| Pause / Resume motion | Stops the animation loop; the last frame stays on screen. |
| Show frame budget | Live fps and average frame time, plus the backing-store size and DPR. |
| Reset view | Returns the camera to its opening angle. |
| `prefers-reduced-motion: reduce` | Opens paused, renders one static frame, never starts the loop. The setting is watched, so changing it mid-session is honoured both ways. |
| No canvas / no 2D context | The stage is replaced by a static list of the same four bands with the same counts. |
| Tab hidden, or stage scrolled off-screen | The loop stops; it resumes when visible again. |

## Performance requirements (for a later integration)

These are the budgets the prototype is written against. They have **not** been
measured on your hardware — open the frame-budget readout to measure them where it
will actually run.

| Budget | Value | Why |
| --- | --- | --- |
| Frame time | ≤ 4 ms average, 60 fps | Leaves room for the rest of the page in a 16.7 ms frame. |
| Shipped JS | ≤ 20 KB uncompressed, no dependency | The scene must not be the reason a screen is slow. |
| Network after load | 0 requests | No textures, no model files, no font fetches. |
| Backing store | DPR capped at 2 | A 3× phone renders 2.25× the pixels for no visible gain. |
| Work when hidden | 0 rAF callbacks | Battery, not benchmarks. |

## What this does not decide

* Whether the graph belongs on **Today**, **Map** or a new surface — a stage-4
  question, and the reason the gate exists.
* Palette and type: it borrows the Tessera dark tokens (`#0b1220`, `#67e8f9`,
  `#a5b4fc`) so a later pass starts from the real system rather than a mock.
* Accessibility of the *integrated* experience. Labels are canvas-drawn and therefore
  invisible to assistive technology; any real use needs a DOM-based accessible
  alternative (the fallback list here is the shape of it).
