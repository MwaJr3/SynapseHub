"""Price-performance, risk, drawdown, and cross-ticker comparison metrics."""

from __future__ import annotations

from collections.abc import Mapping

import numpy as np
import pandas as pd

from .exceptions import DataValidationError, InsufficientDataError
from .preprocessing import align_common_dates
from .time_series import calculate_daily_returns


def calculate_cumulative_performance(aligned_prices: pd.DataFrame) -> pd.DataFrame:
    """Rebase common-date price series to 100 on their shared first date."""
    clean = aligned_prices.dropna(how="any")
    if clean.empty:
        raise InsufficientDataError("No common prices are available for rebasing.")
    if (clean.iloc[0] <= 0).any():
        raise DataValidationError("Baseline prices must be positive.")
    result = clean.divide(clean.iloc[0]).multiply(100)
    result.index.name = "Date"
    return result


def calculate_drawdown(prices: pd.Series) -> pd.Series:
    """Return each observation's decline from the running historical peak."""
    clean = pd.to_numeric(prices, errors="coerce")
    if clean.dropna().empty:
        raise InsufficientDataError("At least one price is required for drawdown.")
    drawdown = clean.divide(clean.cummax()).subtract(1)
    drawdown.name = "Drawdown"
    return drawdown


def calculate_performance_metrics(
    frame: pd.DataFrame,
    *,
    price_column: str = "Close",
    annualization_factor: int = 252,
) -> pd.Series:
    """Calculate descriptive price-only statistics for one ticker."""
    if price_column not in frame or "Volume" not in frame:
        raise DataValidationError(f"Required columns {price_column!r} and 'Volume' are needed.")
    prices = pd.to_numeric(frame[price_column], errors="coerce").dropna()
    volume = pd.to_numeric(frame["Volume"], errors="coerce").dropna()
    if len(prices) < 2:
        raise InsufficientDataError("At least two prices are required for performance metrics.")

    returns = calculate_daily_returns(prices, drop_missing=True)
    elapsed_years = (prices.index[-1] - prices.index[0]).days / 365.25
    cagr = np.nan
    if elapsed_years > 0 and prices.iloc[0] > 0:
        cagr = (prices.iloc[-1] / prices.iloc[0]) ** (1 / elapsed_years) - 1
    drawdown = calculate_drawdown(prices)

    return pd.Series(
        {
            "Start date": prices.index[0],
            "End date": prices.index[-1],
            "Observations": len(prices),
            "First close": prices.iloc[0],
            "Last close": prices.iloc[-1],
            "Absolute price change": prices.iloc[-1] - prices.iloc[0],
            "Percentage price change": prices.iloc[-1] / prices.iloc[0] - 1,
            "CAGR": cagr,
            "Mean daily return": returns.mean(),
            "Median daily return": returns.median(),
            "Daily return std": returns.std(ddof=1),
            "Annualized volatility": returns.std(ddof=1) * annualization_factor**0.5,
            "Maximum drawdown": drawdown.min(),
            "Minimum close": prices.min(),
            "Maximum close": prices.max(),
            "Mean daily volume": volume.mean(),
            "Median daily volume": volume.median(),
            "Total observed volume": volume.sum(),
            "Approx. mean daily turnover": (prices.reindex(volume.index) * volume).mean(),
        }
    )


def create_summary_table(
    data: Mapping[str, pd.DataFrame],
    *,
    price_column: str = "Close",
    annualization_factor: int = 252,
) -> pd.DataFrame:
    """Build a computed ticker-by-metric comparison table."""
    if not data:
        raise DataValidationError("At least one ticker dataset is required.")
    rows = {
        ticker: calculate_performance_metrics(
            frame,
            price_column=price_column,
            annualization_factor=annualization_factor,
        )
        for ticker, frame in data.items()
    }
    result = pd.DataFrame.from_dict(rows, orient="index")
    result.index.name = "Ticker"
    return result


def calculate_return_correlation(
    data: Mapping[str, pd.DataFrame],
    *,
    price_column: str = "Close",
) -> pd.DataFrame:
    """Correlate daily returns only after inner-aligning common dates."""
    aligned = align_common_dates(data, column=price_column)
    returns = aligned.pct_change(fill_method=None).dropna(how="any")
    if len(returns) < 2:
        raise InsufficientDataError("At least two aligned returns are required for correlation.")
    return returns.corr()
