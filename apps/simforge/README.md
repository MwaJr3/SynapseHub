# SimForge — engineering simulation toolkit (CLI)

Engineering catalogue **Project 22** (Expert, delivered at scope).

## Overview
Physical models (RC discharge, spring-mass oscillator, resistor networks) are
separated from numerical utilities and reporting. Units are explicit in every
parameter; results are validated against independently computed reference
cases in the test suite.

## Engineering requirements (enforced + tested)
- **Models vs solvers vs reports are separate modules.**
- Assumptions, units, supported ranges and boundary conditions are documented
  (and exported with every report).
- Inputs are validated before computation (positivity, bounded network size).
- Computation is **bounded**: sweeps ≤ 1000 points; resistor networks ≤ 64.
- Convergence checks report non-convergence explicitly rather than silently
  returning last values.
- Exports preserve parameters + assumptions + software versions (reproducible).

## DSA/performance note
Sweeps are `O(points × model-eval)`; sensitivity uses central differences
(3 evaluations); networks use `O(n)` sums. No symbolic solver is invoked for
direct formulas — the simple path is preferred (measured trivial cost).

## Usage
```bash
python3 -m app.cli rc 10 2 3 --at 6 --report rc.json
python3 -m app.cli spring 4 16 1 --sweep-mass 1 3 3
python3 -m app.cli resistors 10 10 10
```

## Testing
`python3 -m pytest tests/ -q` — reference cases (v(τ)=V₀/e; ω=√(k/m)), validation
errors, sweep bounds, sensitivity note, export contents.

## Limitations
Idealised linear models; no PDE/mesh support; long computations are synchronous
with bounded inputs (background execution is a roadmap item).

## Future improvements
Nodal/mesh analysis, waveform plotting, plugin model registry.
