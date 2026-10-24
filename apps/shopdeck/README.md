# ShopDeck — e-commerce operations admin (FastAPI + SQLite)

Engineering catalogue **Project 18** (intermediate).

## Overview
An operations dashboard with **explicit state machines** for orders
(placed → paid → packed → shipped → delivered, plus cancelled/refunded) and
inventory (in_stock/low/out_of_stock/discontinued), **discount rules with an
audit trail**, and a sales report that **flags data-quality issues** instead of
hiding them.

## State discipline (tested)
- Illegal transitions are rejected with an explanatory **409** and the allowed
  set from the current state (e.g. paid → delivered is refused).
- `discontinued` is terminal — reactivation needs an explicit policy decision.
- Every order transition appends an audit entry (from → to → timestamp).

## Pricing
Rules carry guardrails (max 80% off, non-negative amounts, min-subtotal
skips are recorded with reasons). Each order stores a full pricing audit
payload: inputs, rules, applied discounts, skipped rules. Rounding is
documented (2 decimals at each step).

## DSA/performance note
State checks are `O(1)` map lookups; report aggregation is a single
`JOIN … GROUP BY` over orders/lines.

## Run
```bash
uvicorn app.main:app --port 8019
```

## Testing
`python3 -m pytest tests/ -q` — order/inventory transition matrices, pricing
guardrails + audit payload, low-stock alerts, report data-quality flags.

## Limitations
Demo catalog; no payment/tax/shipping integrations; single currency.

## Future improvements
Refund workflows with partial amounts, inventory reservations for open orders,
CSV export for accounting.
