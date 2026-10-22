from __future__ import annotations

import pandas as pd
import pytest

from stock_analysis.data_validation import validate_stock_data
from stock_analysis.exceptions import DataValidationError


def test_valid_frame_passes(daily_ohlcv: pd.DataFrame) -> None:
    report = validate_stock_data(daily_ohlcv, ticker="TEST", minimum_observations=200)
    assert report.valid
    assert report.observations == 260
    assert report.duplicate_timestamps == 0


def test_empty_frame_is_detected() -> None:
    report = validate_stock_data(pd.DataFrame(), ticker="EMPTY")
    assert not report.valid
    assert "dataset is empty" in report.errors


def test_required_columns_are_validated(daily_ohlcv: pd.DataFrame) -> None:
    report = validate_stock_data(daily_ohlcv.drop(columns="Volume"), ticker="TEST")
    assert not report.valid
    assert any("missing required columns" in error for error in report.errors)


def test_datetime_index_is_required(daily_ohlcv: pd.DataFrame) -> None:
    report = validate_stock_data(daily_ohlcv.reset_index(drop=True), ticker="TEST")
    assert any("DatetimeIndex" in error for error in report.errors)


def test_unsorted_and_duplicate_dates_are_detected(daily_ohlcv: pd.DataFrame) -> None:
    duplicated = pd.concat([daily_ohlcv.iloc[[1]], daily_ohlcv.iloc[:4]])
    report = validate_stock_data(duplicated, ticker="TEST")
    assert any("not sorted" in error for error in report.errors)
    assert any("duplicate" in error for error in report.errors)


def test_invalid_price_volume_and_missing_value_are_detected(daily_ohlcv: pd.DataFrame) -> None:
    invalid = daily_ohlcv.copy()
    invalid.iloc[0, invalid.columns.get_loc("Close")] = -1
    invalid.iloc[1, invalid.columns.get_loc("Volume")] = -5
    invalid.iloc[2, invalid.columns.get_loc("Open")] = float("nan")
    report = validate_stock_data(invalid, ticker="TEST")
    assert any("non-positive" in error for error in report.errors)
    assert any("negative" in error for error in report.errors)
    assert any("missing" in error for error in report.errors)


def test_insufficient_observations_can_raise(daily_ohlcv: pd.DataFrame) -> None:
    with pytest.raises(DataValidationError, match="at least 300"):
        validate_stock_data(
            daily_ohlcv,
            ticker="TEST",
            minimum_observations=300,
            raise_on_error=True,
        )


def test_weekends_are_not_reported_as_missing(daily_ohlcv: pd.DataFrame) -> None:
    report = validate_stock_data(daily_ohlcv.iloc[:10], ticker="TEST")
    assert report.valid
    assert not any("weekend" in message.lower() for message in report.errors + report.warnings)
