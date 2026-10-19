from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from stock_analysis.metrics import (
    calculate_cumulative_performance,
    calculate_drawdown,
    calculate_performance_metrics,
    calculate_return_correlation,
    create_summary_table,
)
from stock_analysis.time_series import calculate_daily_returns, calculate_rolling_volatility


def test_daily_returns_known_prices() -> None:
    prices = pd.Series([100.0, 110.0, 99.0], index=pd.bdate_range("2024-01-01", periods=3))
    returns = calculate_daily_returns(prices)
    assert pd.isna(returns.iloc[0])
    assert returns.iloc[1] == pytest.approx(0.10)
    assert returns.iloc[2] == pytest.approx(-0.10)


def test_cumulative_performance_rebases_to_100() -> None:
    prices = pd.DataFrame({"AAA": [10.0, 12.0], "BBB": [50.0, 45.0]})
    result = calculate_cumulative_performance(prices)
    assert result.iloc[0].tolist() == [100.0, 100.0]
    assert result.iloc[1]["AAA"] == pytest.approx(120)
    assert result.iloc[1]["BBB"] == pytest.approx(90)


def test_drawdown_uses_running_peak() -> None:
    prices = pd.Series([100.0, 120.0, 90.0, 108.0])
    result = calculate_drawdown(prices)
    assert result.tolist() == pytest.approx([0.0, 0.0, -0.25, -0.10])


def test_performance_metrics_known_values(one_week: pd.DataFrame) -> None:
    metrics = calculate_performance_metrics(one_week)
    assert metrics["First close"] == 12
    assert metrics["Last close"] == 17
    assert metrics["Absolute price change"] == 5
    assert metrics["Percentage price change"] == pytest.approx(17 / 12 - 1)
    assert metrics["Total observed volume"] == 1_500
    assert metrics["Maximum drawdown"] == pytest.approx(11 / 12 - 1)


def test_summary_and_correlation_align_common_dates(one_week: pd.DataFrame) -> None:
    second = one_week.iloc[1:].copy()
    second["Close"] = [20, 22, 21, 24]
    summary = create_summary_table({"AAA": one_week, "BBB": second})
    correlation = calculate_return_correlation({"AAA": one_week, "BBB": second})
    assert summary.index.tolist() == ["AAA", "BBB"]
    assert correlation.shape == (2, 2)
    assert np.diag(correlation).tolist() == pytest.approx([1.0, 1.0])


def test_rolling_volatility_has_full_window_warmup() -> None:
    returns = pd.Series([np.nan, 0.01, -0.01, 0.02, -0.02])
    result = calculate_rolling_volatility(returns, window=3)
    assert result.iloc[:3].isna().all()
    assert result.iloc[3] == pytest.approx(pd.Series([0.01, -0.01, 0.02]).std() * 252**0.5)
