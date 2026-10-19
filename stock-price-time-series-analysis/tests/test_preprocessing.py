from __future__ import annotations

import pandas as pd
import pytest

from stock_analysis.exceptions import DataValidationError
from stock_analysis.preprocessing import align_common_dates, normalize_stock_data, select_date_range


def test_normalize_date_column_and_sort(one_week: pd.DataFrame) -> None:
    raw = one_week.reset_index().sort_values("Date", ascending=False)
    result = normalize_stock_data(raw)
    assert isinstance(result.index, pd.DatetimeIndex)
    assert result.index.is_monotonic_increasing
    assert result.index.name == "Date"


def test_duplicate_policy_is_explicit(one_week: pd.DataFrame) -> None:
    duplicate = pd.concat([one_week, one_week.iloc[[-1]]])
    with pytest.raises(DataValidationError, match="duplicate"):
        normalize_stock_data(duplicate)
    result = normalize_stock_data(duplicate, duplicate_policy="last")
    assert len(result) == len(one_week)


def test_missing_policy_never_interpolates(one_week: pd.DataFrame) -> None:
    missing = one_week.copy()
    missing.iloc[2, missing.columns.get_loc("Close")] = None
    with pytest.raises(DataValidationError, match="missing"):
        normalize_stock_data(missing)
    dropped = normalize_stock_data(missing, missing_policy="drop")
    assert len(dropped) == len(one_week) - 1
    assert pd.Timestamp("2024-01-03") not in dropped.index


def test_date_range_selection_is_inclusive(daily_ohlcv: pd.DataFrame) -> None:
    selected = select_date_range(daily_ohlcv, "2024-01-10", "2024-01-31")
    assert selected.index.min() == pd.Timestamp("2024-01-10")
    assert selected.index.max() == pd.Timestamp("2024-01-31")


def test_align_common_dates_uses_inner_join(one_week: pd.DataFrame) -> None:
    data = {"AAA": one_week, "BBB": one_week.iloc[2:] * 2}
    result = align_common_dates(data)
    assert result.index.equals(one_week.index[2:])
    assert list(result) == ["AAA", "BBB"]


def test_align_common_dates_rejects_no_overlap(one_week: pd.DataFrame) -> None:
    later = one_week.copy()
    later.index = later.index + pd.DateOffset(years=2)
    with pytest.raises(DataValidationError, match="no common"):
        align_common_dates({"AAA": one_week, "BBB": later})
