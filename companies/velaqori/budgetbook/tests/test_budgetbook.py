"""Tests: decimal money math, refunds, corrections, period summaries."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest

from app.core import BudgetError, Ledger, parse_amount


@pytest.fixture()
def ledger():
    lg = Ledger()
    lg.add("income", "Salary", "October pay", "5000.00", "2026-10-01")
    lg.add("expense", "Groceries", "Shop", "320.50", "2026-10-03")
    lg.add("expense", "Transport", "Bus", "45.00", "2026-10-05")
    lg.add("refund", "Groceries", "Returned item", "20.50", "2026-10-06")
    lg.add("expense", "Rent", "October", "1500.00", "2026-11-02")
    return lg


def test_decimal_precision_is_exact():
    # float arithmetic would give 0.30000000000000004; Decimal does not.
    total = parse_amount("0.10") + parse_amount("0.20")
    assert total == Decimal("0.30")


def test_amount_validation():
    for bad in ("0", "-5", "abc", "1.234"):
        with pytest.raises(BudgetError):
            parse_amount(bad)


def test_refunds_reduce_expenditure_not_income(ledger):
    s = ledger.summary(date(2026, 10, 1), date(2026, 10, 31))
    assert s["income"] == Decimal("5000.00")
    assert s["gross_expenses"] == Decimal("365.50")
    assert s["refunds"] == Decimal("20.50")
    assert s["expenditure"] == Decimal("345.00")
    assert s["balance"] == Decimal("4655.00")


def test_period_boundaries_inclusive(ledger):
    s = ledger.summary(date(2026, 10, 3), date(2026, 10, 5))
    assert s["gross_expenses"] == Decimal("365.50") - Decimal("1500.00") + Decimal("1500.00") - Decimal("0")
    assert s["expenditure"] == Decimal("365.50")  # groceries+transport only (no refund in window? 10-06 outside)
    assert s["refunds"] == Decimal("0")


def test_top_categories_account_for_refunds(ledger):
    tops = ledger.top_categories(date(2026, 10, 1), date(2026, 10, 31))
    assert tops[0][0] == "Groceries" and tops[0][1] == Decimal("300.00")


def test_monthly_breakdown(ledger):
    months = ledger.monthly_breakdown()
    assert months["2026-10"]["income"] == Decimal("5000.00")
    assert months["2026-10"]["expenditure"] == Decimal("345.00")
    assert months["2026-11"]["expenditure"] == Decimal("1500.00")


def test_validation_errors(ledger):
    with pytest.raises(BudgetError):
        ledger.add("saving", "x", "y", "1", "2026-10-01")
    with pytest.raises(BudgetError):
        ledger.add("income", "  ", "y", "1", "2026-10-01")
    with pytest.raises(BudgetError):
        ledger.add("income", "x", "  ", "1", "2026-10-01")
    with pytest.raises(BudgetError):
        ledger.add("income", "x", "y", "1", "10/01/2026")


def test_corrections_require_reason_and_leave_audit_trail(ledger):
    with pytest.raises(BudgetError):
        ledger.edit(2, amount="300.00")
    with pytest.raises(BudgetError):
        ledger.edit(2, amount="300.00", reason="  ")
    txn = ledger.edit(2, amount="300.00", reason="typo at entry")
    assert txn.amount == Decimal("300.00")
    assert any("typo at entry" in n for n in txn.notes)


def test_unknown_transaction(ledger):
    with pytest.raises(BudgetError):
        ledger.edit(999, amount="1.00", reason="x")


def test_storage_roundtrip(tmp_path, ledger):
    from app.storage import load, save
    save(ledger, tmp_path / "b.json")
    restored = load(tmp_path / "b.json")
    assert restored.summary(date(2026, 10, 1), date(2026, 10, 31)) == ledger.summary(date(2026, 10, 1), date(2026, 10, 31))
