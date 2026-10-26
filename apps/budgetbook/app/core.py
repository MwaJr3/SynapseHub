"""Ledger rules: validation, totals, summaries, corrections."""
from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation

from .config import QUANT
from .models import VALID_TYPES, Correction, Transaction


class BudgetError(ValueError):
    pass


def parse_amount(raw: object) -> Decimal:
    try:
        amount = Decimal(str(raw))
    except (InvalidOperation, ValueError) as exc:
        raise BudgetError(f"Amount {raw!r} is not a valid number.") from exc
    if amount <= 0:
        raise BudgetError("Amount must be greater than zero (use the type to express direction).")
    if amount != amount.quantize(QUANT):
        raise BudgetError("Amount must not have more than 2 decimal places.")
    return amount.quantize(QUANT)


def parse_date(raw: str) -> date:
    try:
        return date.fromisoformat(raw)
    except ValueError as exc:
        raise BudgetError(f"Date {raw!r} must be ISO format YYYY-MM-DD.") from exc


class Ledger:
    def __init__(self) -> None:
        self._items: dict[int, Transaction] = {}
        self._corrections: list[Correction] = []
        self._next_id = 1

    def add(self, kind: str, category: str, description: str, amount: object, on: str | date) -> Transaction:
        if kind not in VALID_TYPES:
            raise BudgetError(f"Type must be one of {VALID_TYPES}.")
        if not (category or "").strip():
            raise BudgetError("Category must not be empty.")
        if not (description or "").strip():
            raise BudgetError("Description must not be empty.")
        value = parse_amount(amount)
        when = parse_date(on) if isinstance(on, str) else on
        txn = Transaction(self._next_id, kind, category.strip(), description.strip(), value, when)
        self._items[self._next_id] = txn
        self._next_id += 1
        return txn

    def edit(self, txn_id: int, *, amount: object | None = None, description: str | None = None,
             category: str | None = None, reason: str = "") -> Transaction:
        """Corrections replace values and leave an audit note (never silent)."""
        if txn_id not in self._items:
            raise BudgetError(f"No transaction {txn_id}.")
        if not (reason or "").strip():
            raise BudgetError("A correction requires a reason.")
        txn = self._items[txn_id]
        if amount is not None:
            old = str(txn.amount)
            txn.amount = parse_amount(amount)
            self._corrections.append(Correction(txn_id, "amount", old, str(txn.amount), reason))
            txn.notes.append(f"amount corrected: {old} -> {txn.amount} ({reason})")
        if description is not None:
            if not description.strip():
                raise BudgetError("Description must not be empty.")
            old = txn.description
            txn.description = description.strip()
            self._corrections.append(Correction(txn_id, "description", old, txn.description, reason))
            txn.notes.append(f"description corrected ({reason})")
        if category is not None:
            if not category.strip():
                raise BudgetError("Category must not be empty.")
            old = txn.category
            txn.category = category.strip()
            self._corrections.append(Correction(txn_id, "category", old, txn.category, reason))
            txn.notes.append(f"category corrected ({reason})")
        return txn

    def transactions(self) -> list[Transaction]:
        return sorted(self._items.values(), key=lambda t: (t.date, t.id))

    def summary(self, start: date, end: date) -> dict:
        """Income, expenditure and balance for a period.

        Expenditure = expenses - refunds. Balance = income - expenditure.
        Transaction totals and the account balance are reported separately on
        purpose — they answer different questions.
        """
        income = Decimal("0"); expenses = Decimal("0"); refunds = Decimal("0")
        for t in self._items.values():
            if start <= t.date <= end:
                if t.kind == "income":
                    income += t.amount
                elif t.kind == "expense":
                    expenses += t.amount
                else:
                    refunds += t.amount
        expenditure = expenses - refunds
        return {
            "period": {"from": start.isoformat(), "to": end.isoformat()},
            "income": income, "gross_expenses": expenses, "refunds": refunds,
            "expenditure": expenditure, "balance": income - expenditure,
        }

    def top_categories(self, start: date, end: date, limit: int = 5) -> list[tuple[str, Decimal]]:
        totals: dict[str, Decimal] = {}
        for t in self._items.values():
            if t.kind == "expense" and start <= t.date <= end:
                totals[t.category] = totals.get(t.category, Decimal("0")) + t.amount
            elif t.kind == "refund" and start <= t.date <= end:
                totals[t.category] = totals.get(t.category, Decimal("0")) - t.amount
        return sorted(((c, v.quantize(QUANT)) for c, v in totals.items() if v > 0),
                      key=lambda kv: -kv[1])[:limit]

    def monthly_breakdown(self) -> dict[str, dict]:
        months: dict[str, dict] = {}
        for t in self.transactions():
            key = t.date.strftime("%Y-%m")
            row = months.setdefault(key, {"income": Decimal("0"), "expenditure": Decimal("0")})
            if t.kind == "income":
                row["income"] += t.amount
            elif t.kind == "expense":
                row["expenditure"] += t.amount
            else:
                row["expenditure"] -= t.amount
        return months

    def export_data(self) -> dict:
        return {
            "transactions": [
                {"id": t.id, "kind": t.kind, "category": t.category, "description": t.description,
                 "amount": str(t.amount), "date": t.date.isoformat(), "notes": t.notes}
                for t in self._items.values()
            ]
        }

    def import_data(self, data: dict) -> None:
        for t in data.get("transactions", []):
            txn = self.add(t["kind"], t["category"], t["description"], t["amount"], t["date"])
            txn.notes = list(t.get("notes", []))
            self._items[txn.id] = txn
        self._next_id = max(self._items, default=0) + 1
