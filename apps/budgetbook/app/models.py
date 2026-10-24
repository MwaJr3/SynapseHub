"""Transactions are modelled explicitly: type, not sign, expresses direction."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

VALID_TYPES = ("income", "expense", "refund")


@dataclass
class Transaction:
    id: int
    kind: str                  # income | expense | refund
    category: str
    description: str
    amount: Decimal            # always > 0; `kind` gives the direction
    date: date
    notes: list[str] = field(default_factory=list)   # correction audit trail

    def signed_effect(self) -> Decimal:
        """Effect on balance. A refund reduces expenditure (it is NOT income)."""
        if self.kind == "income":
            return self.amount
        return -self.amount    # expense and refund both leave the pocket differently:
                               # refunds are subtracted from expenditure totals instead.


@dataclass
class Correction:
    transaction_id: int
    field: str
    old: str
    new: str
    reason: str
