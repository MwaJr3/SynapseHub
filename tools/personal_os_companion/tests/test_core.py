from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import backup_summary, normalize_statement_rows, review_export  # noqa: E402


def test_normalizes_signed_user_supplied_statement_rows():
    rows = normalize_statement_rows(
        "date,amount,description,category\n2026-10-23,1500.50,Invoice,work\n2026-10-24,-42.00,Bus,transport\n",
        currency="zmw",
    )

    assert [(row.kind, row.amount, row.currency) for row in rows] == [
        ("income", "1500.50", "ZMW"),
        ("expense", "42.00", "ZMW"),
    ]
    assert "review only" in review_export(rows).lower()


def test_rejects_missing_or_non_iso_statement_fields():
    with pytest.raises(ValueError, match="missing required"):
        normalize_statement_rows("day,value,description\n2026-10-23,4,test\n")
    with pytest.raises(ValueError, match="invalid ISO date"):
        normalize_statement_rows("date,amount,description\n23/10/2026,4,test\n")


def test_summarizes_only_recognizable_backup_shapes():
    assert backup_summary('{"version": 3, "cycleName": "Ship", "goals": [{}], "actionItems": []}') == {
        "version": 3, "cycle_name": "Ship", "goals": 1, "actions": 0, "schedule_blocks": 0,
    }
    with pytest.raises(ValueError):
        backup_summary('{"version": 99}')


try:
    from hypothesis import given, strategies as st  # type: ignore[import-not-found]
except ImportError:
    HYPOTHESIS_AVAILABLE = False
else:
    HYPOTHESIS_AVAILABLE = True


@pytest.mark.skipif(not HYPOTHESIS_AVAILABLE, reason="Install the optional Hypothesis test dependency")
@pytest.mark.parametrize("_", [None])
def test_hypothesis_dependency_is_available(_):
    # The property lives in the conditional definition below so pytest still
    # runs the deterministic tests when Hypothesis is intentionally absent.
    assert HYPOTHESIS_AVAILABLE


if HYPOTHESIS_AVAILABLE:
    @given(st.dates().map(str), st.decimals(min_value="0.01", max_value="999999", places=2))
    def test_positive_signed_amounts_remain_income(day, amount):
        rows = normalize_statement_rows(f"date,amount,description\n{day},{amount},Example\n")
        assert rows[0].kind == "income"
        assert rows[0].amount == format(amount, "f")
