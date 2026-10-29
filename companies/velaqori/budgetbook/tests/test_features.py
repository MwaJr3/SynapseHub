"""Phase-B feature tests: CSV import validation + recurring templates."""
from __future__ import annotations

from app.features import FeatureError, RecurringTemplate, import_csv

CSV_OK = "date,kind,amount,category,description\n2026-01-01,expense,12.50,food,lunch\n2026-01-02,income,100,salary,pay\n"
CSV_BAD = "date,kind,amount,category,description\n2026-01-01,expense,abc,food,lunch\n,expense,5,food,x\n2026-01-03,transfer,5,food,x\n"


def test_csv_import_ok():
    result = import_csv(CSV_OK)
    assert len(result["imported"]) == 2 and not result["rejected"]


def test_csv_import_rejections_have_reasons():
    result = import_csv(CSV_BAD)
    assert len(result["imported"]) == 0 and len(result["rejected"]) == 3
    assert any("not a number" in r for rej in result["rejected"] for r in rej["reasons"])
    assert any("missing column" in r for rej in result["rejected"] for r in rej["reasons"])
    assert any("income|expense|refund" in r for rej in result["rejected"] for r in rej["reasons"])


def test_csv_duplicate_warnings():
    first = import_csv(CSV_OK)
    second = import_csv(CSV_OK, existing_rows=first["imported"])
    assert len(second["duplicates"]) == 2 and second["imported"] == []
    assert "Nothing is dropped silently" in second["note"]


def test_recurring_template_materialization():
    tpl = RecurringTemplate("rent", "expense", 500, "weekly", "2026-01-01")
    rows = tpl.materialize("2026-01-15")
    assert len(rows) == 3                                    # Jan 1, 8, 15
    assert all(r["status"] == "needs-review" for r in rows)  # user confirms before counting
    import pytest
    with pytest.raises(FeatureError):
        RecurringTemplate("x", "expense", 10, "yearly", "2026-01-01")
