from __future__ import annotations

import pandas as pd

from stock_analysis.time_series import resample_ohlcv


def test_weekly_aggregation_uses_financial_rules(one_week: pd.DataFrame) -> None:
    weekly = resample_ohlcv(one_week, "W-FRI")
    row = weekly.iloc[0]
    assert row["Open"] == 10
    assert row["High"] == 18
    assert row["Low"] == 8
    assert row["Close"] == 17
    assert row["Adj Close"] == 17
    assert row["Volume"] == 1_500
    assert weekly.index[0] == pd.Timestamp("2024-01-05")


def test_monthly_aggregation_uses_month_end(one_week: pd.DataFrame) -> None:
    monthly = resample_ohlcv(one_week, "ME")
    assert monthly.index[0] == pd.Timestamp("2024-01-31")
    assert monthly.iloc[0]["Open"] == 10
    assert monthly.iloc[0]["Close"] == 17
    assert monthly.iloc[0]["Volume"] == 1_500


def test_resampling_does_not_average_close(one_week: pd.DataFrame) -> None:
    weekly = resample_ohlcv(one_week, "W-FRI")
    assert weekly.iloc[0]["Close"] == one_week.iloc[-1]["Close"]
    assert weekly.iloc[0]["Close"] != one_week["Close"].mean()


def test_two_week_boundaries() -> None:
    index = pd.bdate_range("2024-01-01", periods=10, name="Date")
    close = pd.Series(range(10, 20), index=index)
    frame = pd.DataFrame(
        {
            "Open": close,
            "High": close + 1,
            "Low": close - 1,
            "Close": close,
            "Volume": 100,
        }
    )
    weekly = resample_ohlcv(frame, "W-FRI")
    assert weekly.index.tolist() == [pd.Timestamp("2024-01-05"), pd.Timestamp("2024-01-12")]
    assert weekly["Close"].tolist() == [14, 19]
    assert weekly["Volume"].tolist() == [500, 500]
