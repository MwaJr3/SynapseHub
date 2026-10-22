"""Reusable resampling, rolling-window, return, and volatility operations."""

from __future__ import annotations

from collections.abc import Iterable

import pandas as pd

from .data_validation import validate_stock_data
from .exceptions import DataValidationError, InsufficientDataError

BASE_AGGREGATION = {
    "Open": "first",
    "High": "max",
    "Low": "min",
    "Close": "last",
    "Volume": "sum",
}


def resample_ohlcv(
    frame: pd.DataFrame,
    rule: str,
    *,
    include_partial_periods: bool = True,
) -> pd.DataFrame:
    """Aggregate daily data with financially meaningful OHLCV rules.

    Weekly closes are the final observed close, never an average. By default,
    partial boundary periods are retained and documented by the caller. They
    can be removed explicitly for like-for-like complete-period comparisons.
    """
    validate_stock_data(frame, minimum_observations=1, raise_on_error=True)
    if not rule:
        raise ValueError("A Pandas resampling rule is required.")
    aggregation = dict(BASE_AGGREGATION)
    for optional in ("Adj Close", "Dividends", "Stock Splits", "Capital Gains"):
        if optional in frame:
            aggregation[optional] = "last" if optional == "Adj Close" else "sum"

    try:
        result = frame.resample(rule).agg(aggregation).dropna(subset=["Open", "Close"])
    except (TypeError, ValueError) as error:
        raise ValueError(f"Invalid or incompatible resampling rule {rule!r}.") from error

    if not include_partial_periods and not result.empty:
        first_source, last_source = frame.index.min(), frame.index.max()
        period_counts = frame["Close"].resample(rule).count().reindex(result.index)
        typical_count = period_counts.mode().iloc[0] if not period_counts.mode().empty else 0
        boundary_mask = pd.Series(True, index=result.index)
        if len(result) >= 1 and period_counts.iloc[0] < typical_count:
            boundary_mask.iloc[0] = False
        if len(result) >= 2 and period_counts.iloc[-1] < typical_count:
            boundary_mask.iloc[-1] = False
        result = result.loc[boundary_mask]
        result.attrs["source_boundaries"] = (first_source, last_source)

    result.index.name = "Date"
    result.attrs.update(
        {
            "resample_rule": rule,
            "aggregation": aggregation,
            "partial_periods_retained": include_partial_periods,
        }
    )
    return result


def calculate_moving_averages(
    frame: pd.DataFrame,
    *,
    price_column: str = "Close",
    windows: Iterable[int] = (20, 200),
) -> pd.DataFrame:
    """Add trailing simple moving averages using current and prior rows only."""
    if price_column not in frame:
        raise DataValidationError(f"Missing price column {price_column!r}.")
    result = frame.copy()
    normalized_windows = tuple(dict.fromkeys(int(window) for window in windows))
    if not normalized_windows or any(window < 2 for window in normalized_windows):
        raise ValueError("Moving-average windows must contain integers of at least 2.")
    for window in normalized_windows:
        result[f"SMA_{window}"] = (
            result[price_column]
            .rolling(
                window=window,
                min_periods=window,
            )
            .mean()
        )
    return result


def calculate_daily_returns(
    prices: pd.Series,
    *,
    drop_missing: bool = False,
) -> pd.Series:
    """Calculate one-observation percentage changes without filling gaps."""
    if prices.empty:
        raise InsufficientDataError("Cannot calculate returns from an empty series.")
    numeric = pd.to_numeric(prices, errors="coerce")
    if numeric.dropna().shape[0] < 2:
        raise InsufficientDataError("At least two valid prices are required for returns.")
    returns = numeric.pct_change(fill_method=None)
    returns.name = f"{prices.name or 'Price'} Return"
    return returns.dropna() if drop_missing else returns


def calculate_rolling_volatility(
    returns: pd.Series,
    *,
    window: int = 20,
    annualization_factor: int = 252,
) -> pd.Series:
    """Annualize trailing daily-return standard deviation by sqrt(252)."""
    if window < 2:
        raise ValueError("Volatility window must be at least 2.")
    if annualization_factor <= 0:
        raise ValueError("annualization_factor must be positive.")
    volatility = returns.rolling(window=window, min_periods=window).std(ddof=1)
    volatility = volatility * annualization_factor**0.5
    volatility.name = f"{window}-session annualized volatility"
    return volatility
