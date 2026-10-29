"""Phase-B feature tests: hold queues, overdue reports, extensions."""
from __future__ import annotations

import pytest

from app.features import FeatureError, HoldQueue, extend_loan, overdue_report


def test_hold_queue_fifo_and_positions():
    q = HoldQueue()
    q.place_hold("T1", "ada")
    q.place_hold("T1", "bob")
    assert q.position("T1", "ada") == 1 and q.position("T1", "bob") == 2
    assert q.next_up("T1") == "ada"
    assert q.fulfil("T1") == "ada" and q.next_up("T1") == "bob"
    with pytest.raises(FeatureError):
        q.place_hold("T1", "bob")                    # duplicate hold refused


def test_overdue_report_uses_provided_date():
    loans = [{"copy": "C1", "member": "ada", "loaned": "2026-10-01", "due": "2026-10-15"},
             {"copy": "C2", "member": "bob", "loaned": "2026-10-20", "due": "2026-11-03"}]
    report = overdue_report(loans, "2026-10-24")
    assert len(report["overdue"]) == 1 and report["overdue"][0]["days_overdue"] == 9
    assert "no hidden clock" in report["note"]
    assert overdue_report(loans, "2026-10-10")["overdue"] == []


def test_overdue_uses_default_loan_window():
    loans = [{"copy": "C3", "member": "cy", "loaned": "2026-10-01"}]   # no due date
    report = overdue_report(loans, "2026-10-24")                       # due 2026-10-15
    assert report["overdue"][0]["days_overdue"] == 9


def test_extensions_bounded():
    loan = {"copy": "C1", "due": "2026-11-01", "extensions": 0}
    r1 = extend_loan(loan, "2026-10-24")
    assert r1["due"] == "2026-11-08" and r1["extensions"] == 1
    with pytest.raises(FeatureError):
        extend_loan({**loan, "extensions": 2}, "2026-10-24")   # max 2 extensions
    with pytest.raises(FeatureError):
        extend_loan(loan, "2026-10-24", extra_days=99)
