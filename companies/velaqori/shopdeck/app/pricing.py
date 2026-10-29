"""Pricing rules with an audit trail — every computed price records its inputs."""
from __future__ import annotations

from dataclasses import dataclass, asdict


class PricingError(ValueError):
    pass


@dataclass(frozen=True)
class PriceRule:
    code: str
    percent_off: float = 0.0
    amount_off: float = 0.0
    min_subtotal: float = 0.0

    def __post_init__(self):
        if self.percent_off < 0 or self.percent_off > 80:
            raise PricingError("percent_off must be within 0..80 (guardrail)")
        if self.amount_off < 0:
            raise PricingError("amount_off must be non-negative")


def compute_total(unit_price: float, quantity: int, rules: list[PriceRule]) -> dict:
    if unit_price < 0 or quantity < 0:
        raise PricingError("price and quantity must be non-negative")
    subtotal = round(unit_price * quantity, 2)
    applied, skipped = [], []
    total = subtotal
    for rule in rules:
        if subtotal < rule.min_subtotal:
            skipped.append({"rule": rule.code, "reason": f"subtotal below minimum {rule.min_subtotal:.2f}"})
            continue
        discount = round(subtotal * rule.percent_off / 100 + rule.amount_off, 2)
        discount = min(discount, total)               # never below zero
        total = round(total - discount, 2)
        applied.append({"rule": rule.code, "discount": discount})
    return {"subtotal": subtotal, "total": total, "applied": applied, "skipped": skipped,
            "audit": {"inputs": {"unit_price": unit_price, "quantity": quantity},
                      "rules": [asdict(r) for r in rules],
                      "note": "Deterministic computation; rounding to 2 decimals at each step."}}
