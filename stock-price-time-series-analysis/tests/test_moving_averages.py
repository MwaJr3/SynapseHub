from __future__ import annotations

import pandas as pd
import pytest

from stock_analysis.time_series import calculate_moving_averages


def test_twenty_observation_average_and_warmup(daily_ohlcv: pd.DataFrame) -> None:
    result = calculate_moving_averages(daily_ohlcv, windows=(20,))
    assert result["SMA_20"].iloc[:19].isna().all()
    assert result["SMA_20"].iloc[19] == pytest.approx(daily_ohlcv["Close"].iloc[:20].mean())


def test_two_hundred_observation_average(daily_ohlcv: pd.DataFrame) -> None:
    result = calculate_moving_averages(daily_ohlcv, windows=(20, 200))
    assert result["SMA_200"].iloc[:199].isna().all()
    assert result["SMA_200"].iloc[199] == pytest.approx(daily_ohlcv["Close"].iloc[:200].mean())


def test_moving_average_uses_no_future_observations(daily_ohlcv: pd.DataFrame) -> None:
    baseline = calculate_moving_averages(daily_ohlcv, windows=(20,))
    changed = daily_ohlcv.copy()
    changed.iloc[100:, changed.columns.get_loc("Close")] *= 100
    recalculated = calculate_moving_averages(changed, windows=(20,))
    pd.testing.assert_series_equal(baseline["SMA_20"].iloc[:100], recalculated["SMA_20"].iloc[:100])


def test_invalid_window_rejected(daily_ohlcv: pd.DataFrame) -> None:
    with pytest.raises(ValueError, match="at least 2"):
        calculate_moving_averages(daily_ohlcv, windows=(1,))
