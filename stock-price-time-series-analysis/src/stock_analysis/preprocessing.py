"""Predictable normalization, filtering, and common-date alignment."""

from __future__ import annotations

from collections.abc import Mapping

import pandas as pd

from .data_validation import REQUIRED_OHLCV_COLUMNS
from .exceptions import DataValidationError

CANONICAL_COLUMNS = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]


def normalize_stock_data(
    raw: pd.DataFrame,
    *,
    duplicate_policy: str = "raise",
    missing_policy: str = "raise",
) -> pd.DataFrame:
    """Normalize one ticker to canonical columns and a sorted DatetimeIndex.

    The only supported missing-data cleanup is dropping an explicitly affected
    row. No interpolation or forward fill is performed because that would
    invent a market price for an unobserved session.
    """
    if not isinstance(raw, pd.DataFrame):
        raise DataValidationError("Expected a pandas DataFrame.")
    if raw.empty:
        raise DataValidationError("Cannot normalize an empty dataset.")
    if duplicate_policy not in {"raise", "first", "last"}:
        raise ValueError("duplicate_policy must be 'raise', 'first', or 'last'.")
    if missing_policy not in {"raise", "drop"}:
        raise ValueError("missing_policy must be 'raise' or 'drop'.")

    frame = raw.copy()
    if isinstance(frame.columns, pd.MultiIndex):
        raise DataValidationError(
            "MultiIndex columns require ticker-aware normalization in data_loader."
        )

    # Accept an explicit Date column or a provider-created date index.
    if "Date" in frame.columns:
        parsed_dates = pd.to_datetime(frame.pop("Date"), errors="coerce", utc=True)
        frame.index = parsed_dates.dt.tz_convert(None).dt.normalize()
    else:
        parsed_index = pd.to_datetime(frame.index, errors="coerce", utc=True)
        frame.index = parsed_index.tz_convert(None).normalize()
    frame.index.name = "Date"

    if frame.index.hasnans:
        raise DataValidationError("One or more dates could not be parsed.")

    missing_columns = set(REQUIRED_OHLCV_COLUMNS).difference(frame.columns)
    if missing_columns:
        raise DataValidationError(f"Missing required columns: {sorted(missing_columns)}")

    ordered = [column for column in CANONICAL_COLUMNS if column in frame]
    extras = [column for column in frame.columns if column not in ordered]
    frame = frame[ordered + extras]

    for column in frame.columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")

    required_missing = frame[list(REQUIRED_OHLCV_COLUMNS)].isna().any(axis=1)
    if required_missing.any():
        count = int(required_missing.sum())
        if missing_policy == "raise":
            raise DataValidationError(f"{count} rows contain missing required OHLCV values.")
        frame = frame.loc[~required_missing].copy()

    duplicates = frame.index.duplicated(keep=False)
    if duplicates.any():
        count = int(duplicates.sum())
        if duplicate_policy == "raise":
            raise DataValidationError(f"Found {count} rows with duplicate timestamps.")
        frame = frame.loc[~frame.index.duplicated(keep=duplicate_policy)].copy()

    return frame.sort_index()


def select_date_range(
    frame: pd.DataFrame,
    start: str | None = None,
    end: str | None = None,
) -> pd.DataFrame:
    """Select inclusive labels from a DatetimeIndex without changing observations."""
    if not isinstance(frame.index, pd.DatetimeIndex):
        raise DataValidationError("Date filtering requires a DatetimeIndex.")
    result = frame
    if start is not None:
        result = result.loc[pd.Timestamp(start) :]
    if end is not None:
        result = result.loc[: pd.Timestamp(end)]
    return result.copy()


def align_common_dates(
    data: Mapping[str, pd.DataFrame],
    *,
    column: str = "Close",
) -> pd.DataFrame:
    """Inner-align one series per ticker over genuinely shared observations."""
    if not data:
        raise DataValidationError("At least one ticker dataset is required.")
    series: dict[str, pd.Series] = {}
    for ticker, frame in data.items():
        if column not in frame:
            raise DataValidationError(f"{ticker}: missing comparison column {column!r}.")
        series[ticker] = frame[column].rename(ticker)
    aligned = pd.concat(series, axis=1, join="inner").dropna(how="any")
    if aligned.empty:
        raise DataValidationError("Tickers have no common observations for comparison.")
    aligned.index.name = "Date"
    return aligned.sort_index()
