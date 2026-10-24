# CircuitLab Calc — Electronics Calculator

Full-stack electronics calculator with **transparent working**: every result
shows its formulas and solution steps, and approximations are labelled as
approximations. Saved calculations persist per account. Part of the portfolio
product **CircuitLab Calc** (Velaqori Systems).

## Calculators (working)

- **Ohm's law** — solve for V, I or R (explicit short/open-circuit errors).
- **Power** — P = V·I, P = I²·R, P = V²/R.
- **Series / parallel** networks (2–12 resistors).
- **Voltage divider** — result labelled as an *unloaded* divider approximation.
- **Two-mesh Kirchhoff solver** — linear system with determinant check.
- **Unit conversion** — V/mV/kV, A/mA/uA, ohm/kohm/Mohm, W/mW/kW, Hz/kHz/MHz.

The calculation core is the tested Python module
`projects/mysul/mwangala/python-reference/circuit_math.py`, vendored verbatim
into `backend/app/circuit_math.py` (provenance noted at the top of the file).

## Stack

FastAPI, SQLAlchemy (SQLite default, PostgreSQL-ready), React 19, TypeScript
(strict), Tailwind CSS 4, Vite. Tests: pytest (12) + Vitest (3).

## Run it

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python3 -m app.seed
python3 -m uvicorn app.main:app --port 8004

cd ../frontend
npm install && npm run dev               # http://localhost:5177 → :8004
```

### Demo account (fictional)

| Email | Password |
| --- | --- |
| `demo.eng@circuits.example` | `demo-password-123` |

## Tests

```bash
cd backend && python3 -m pytest tests/ -q    # 12 tests
cd ../frontend && npm test                   # 3 tests
```

Covered: formula correctness (Ohm, power, networks, divider, two-mesh known
values, unit conversion), validation errors (short circuit, open circuit,
negative input, singular system), API/core parity, saved-calculation ownership.

## Honest presentation rules

- Approximations are never presented as exact (in-app assumption notes).
- Unsolvable inputs return explicit error messages, not silent wrong answers.
- Screenshots pending capture in a browser environment (not fabricated).

## Modern features & performance notes (feature-candidate pass)
- **Tolerance sensitivity** (`POST /api/calc/tolerance`): divider output range
  under resistor tolerances — **worst-case bounds are exact** for independent
  tolerances; the RSS figure is a **STATISTICAL ESTIMATE** (independence +
  normality assumed), labelled in every result.
- **Sensitivity table** (`sensitivity_table`): ±1% one-at-a-time input
  perturbations, `O(k)` evaluations.
- Deferred candidates (with reasons): Monte-Carlo tolerance runs (worst-case
  bounds are exact and sufficient here); tolerance-panel UI (API-complete in
  this pass; frontend enhancement listed for follow-up).
