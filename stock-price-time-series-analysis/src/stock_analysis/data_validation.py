"""Financial-data quality checks that never invent missing market observations."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from .exceptions import DataValidationError

REQUIRED_OHLCV_COLUMNS = ("Open", "High", "Low", "Close", "Volume")
OPTIONAL_MARKET_COLUMNS = ("Adj Close", "Dividends", "Stock Splits", "Capital Gains")


@dataclass(frozen=True)
class ValidationReport:
    ticker: str
    valid: bool
    errors: tuple[str, ...]
    warnings: tuple[str, ...]
    observations: int
    start_date: pd.Timestamp | None
    end_date: pd.Timestamp | None
    missing_values: dict[str, int]
    duplicate_timestamps: int

    def raise_for_errors(self) -> None:
        if self.errors:
            details = "; ".join(self.errors)
            raise DataValidationError(f"{self.ticker}: {details}")


def validate_stock_data(
    frame: pd.DataFrame,
    *,
    ticker: str = "UNKNOWN",
    minimum_observations: int = 1,
    raise_on_error: bool = False,
) -> ValidationReport:
    """Inspect one ticker's data and return all detected quality problems.

    Weekends and exchange holidays are not errors: the validator does not
    reindex to a calendar and never fills absent sessions with invented prices.
    """
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(frame, pd.DataFrame):
        raise DataValidationError(f"{ticker}: expected a pandas DataFrame.")
    if frame.empty:
        report = ValidationReport(
            ticker=ticker,
            valid=False,
            errors=("dataset is empty",),
            warnings=(),
            observations=0,
            start_date=None,
            end_date=None,
            missing_values={},
            duplicate_timestamps=0,
        )
        if raise_on_error:
            report.raise_for_errors()
        return report

    if not isinstance(frame.index, pd.DatetimeIndex):
        errors.append("index must be a pandas DatetimeIndex")
    elif frame.index.hasnans:
        errors.append("date index contains missing timestamps")

    missing_columns = [column for column in REQUIRED_OHLCV_COLUMNS if column not in frame]
    if missing_columns:
        errors.append(f"missing required columns: {missing_columns}")

    unexpected = [
        str(column)
        for column in frame.columns
        if column not in REQUIRED_OHLCV_COLUMNS + OPTIONAL_MARKET_COLUMNS
    ]
    if unexpected:
        warnings.append(f"additional provider columns retained: {unexpected}")

    if isinstance(frame.index, pd.DatetimeIndex):
        if not frame.index.is_monotonic_increasing:
            errors.append("timestamps are not sorted chronologically")
        duplicates = int(frame.index.duplicated(keep=False).sum())
        if duplicates:
            errors.append(f"found {duplicates} rows with duplicate timestamps")
        start_date = frame.index.min()
        end_date = frame.index.max()
        if len(frame.index) > 1:
            largest_gap = frame.index.to_series().diff().max()
            if pd.notna(largest_gap) and largest_gap > pd.Timedelta(days=10):
                warnings.append(
                    f"largest calendar gap is {largest_gap.days} days; investigate suspensions or missing data"
                )
    else:
        duplicates = int(frame.index.duplicated(keep=False).sum())
        start_date = None
        end_date = None

    missing_values = {str(column): int(count) for column, count in frame.isna().sum().items()}
    required_missing = {
        column: missing_values.get(column, 0)
        for column in REQUIRED_OHLCV_COLUMNS
        if missing_values.get(column, 0)
    }
    if required_missing:
        errors.append(f"required fields contain missing values: {required_missing}")

    for column in REQUIRED_OHLCV_COLUMNS:
        if column not in frame:
            continue
        if not pd.api.types.is_numeric_dtype(frame[column]):
            errors.append(f"{column} must be numeric")
        elif np.isinf(frame[column].dropna()).any():
            errors.append(f"{column} contains infinite values")

    price_columns = [column for column in ("Open", "High", "Low", "Close") if column in frame]
    for column in price_columns:
        numeric = pd.to_numeric(frame[column], errors="coerce")
        if (numeric.dropna() <= 0).any():
            errors.append(f"{column} contains non-positive prices")

    if "Adj Close" in frame:
        adjusted = pd.to_numeric(frame["Adj Close"], errors="coerce")
        if adjusted.isna().any():
            warnings.append("Adj Close contains missing values")
        if (adjusted.dropna() <= 0).any():
            errors.append("Adj Close contains non-positive prices")

    if "Volume" in frame:
        volume = pd.to_numeric(frame["Volume"], errors="coerce")
        if (volume.dropna() < 0).any():
            errors.append("Volume contains negative values")

    if set(("Open", "High", "Low", "Close")).issubset(frame.columns):
        prices = frame[["Open", "High", "Low", "Close"]]
        invalid_high = prices["High"] < prices[["Open", "Low", "Close"]].max(axis=1)
        invalid_low = prices["Low"] > prices[["Open", "High", "Close"]].min(axis=1)
        if invalid_high.any():
            errors.append(f"High is below another OHLC value in {int(invalid_high.sum())} rows")
        if invalid_low.any():
            errors.append(f"Low is above another OHLC value in {int(invalid_low.sum())} rows")

    if len(frame) < minimum_observations:
        errors.append(
            f"only {len(frame)} observations; at least {minimum_observations} are required"
        )

    report = ValidationReport(
        ticker=ticker,
        valid=not errors,
        errors=tuple(errors),
        warnings=tuple(warnings),
        observations=len(frame),
        start_date=start_date,
        end_date=end_date,
        missing_values=missing_values,
        duplicate_timestamps=duplicates,
    )
    if raise_on_error:
        report.raise_for_errors()
    return report
