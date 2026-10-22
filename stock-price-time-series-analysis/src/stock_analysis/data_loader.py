"""Configurable yfinance retrieval, explicit local loading, and optional caching."""

from __future__ import annotations

import json
import re
from collections.abc import Callable, Iterable, Mapping
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
import yfinance as yf

from .data_validation import validate_stock_data
from .exceptions import ConfigurationError, DataDownloadError, DataValidationError
from .preprocessing import normalize_stock_data

TickerDownloader = Callable[..., pd.DataFrame]
TICKER_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9.^=_-]{0,14}$")


@dataclass(frozen=True)
class DataProvenance:
    ticker: str
    source: str
    requested_start: str
    requested_end: str
    actual_start: str
    actual_end: str
    retrieved_at_utc: str
    interval: str
    auto_adjust: bool
    observations: int
    pandas_version: str
    yfinance_version: str
    cache_path: str | None = None


@dataclass(frozen=True)
class DownloadResult:
    data: dict[str, pd.DataFrame]
    metadata: dict[str, DataProvenance]
    failures: dict[str, str]

    @property
    def successful_tickers(self) -> tuple[str, ...]:
        return tuple(self.data)

    def metadata_frame(self) -> pd.DataFrame:
        if not self.metadata:
            return pd.DataFrame()
        return pd.DataFrame([asdict(item) for item in self.metadata.values()]).set_index("ticker")


def validate_tickers(tickers: str | Iterable[str]) -> tuple[str, ...]:
    """Normalize and validate symbols without assuming a fixed pair."""
    if isinstance(tickers, str):
        candidates = [tickers]
    else:
        try:
            candidates = list(tickers)
        except TypeError as error:
            raise ConfigurationError("tickers must be a symbol or iterable of symbols") from error
    normalized: list[str] = []
    for value in candidates:
        if not isinstance(value, str) or not value.strip():
            raise ConfigurationError("Every ticker must be a non-empty string.")
        ticker = value.strip().upper()
        if not TICKER_PATTERN.fullmatch(ticker):
            raise ConfigurationError(f"Invalid ticker format: {value!r}.")
        if ticker not in normalized:
            normalized.append(ticker)
    if not normalized:
        raise ConfigurationError("At least one ticker is required.")
    return tuple(normalized)


def validate_date_range(start_date: str, end_date: str) -> tuple[pd.Timestamp, pd.Timestamp]:
    try:
        start = pd.Timestamp(start_date)
        end = pd.Timestamp(end_date)
    except (TypeError, ValueError) as error:
        raise ConfigurationError("start_date and end_date must be valid dates.") from error
    if pd.isna(start) or pd.isna(end):
        raise ConfigurationError("start_date and end_date must be valid dates.")
    if start.tzinfo is not None:
        start = start.tz_convert(None)
    if end.tzinfo is not None:
        end = end.tz_convert(None)
    start, end = start.normalize(), end.normalize()
    if end <= start:
        raise ConfigurationError("end_date must be later than start_date.")
    return start, end


def _extract_ticker_frame(raw: pd.DataFrame, ticker: str) -> pd.DataFrame:
    """Handle regular and both common yfinance MultiIndex orientations."""
    if raw is None or not isinstance(raw, pd.DataFrame) or raw.empty:
        raise DataDownloadError(f"{ticker}: provider returned no observations.")
    frame = raw.copy()
    if not isinstance(frame.columns, pd.MultiIndex):
        return frame

    matches: list[tuple[int, Any]] = []
    for level in range(frame.columns.nlevels):
        values = {str(value).upper(): value for value in frame.columns.get_level_values(level)}
        if ticker.upper() in values:
            matches.append((level, values[ticker.upper()]))
    if len(matches) != 1:
        raise DataDownloadError(
            f"{ticker}: could not map unexpected MultiIndex columns to the requested ticker."
        )
    level, label = matches[0]
    extracted = frame.xs(label, axis=1, level=level, drop_level=True)
    if isinstance(extracted, pd.Series):
        extracted = extracted.to_frame()
    if isinstance(extracted.columns, pd.MultiIndex):
        if extracted.columns.nlevels == 1:
            extracted.columns = extracted.columns.get_level_values(0)
        else:
            raise DataDownloadError(f"{ticker}: unsupported nested provider columns.")
    return extracted


def normalize_download_response(raw: pd.DataFrame, ticker: str) -> pd.DataFrame:
    """Map one provider response into the project's canonical OHLCV structure."""
    frame = _extract_ticker_frame(raw, ticker)
    try:
        return normalize_stock_data(frame, duplicate_policy="raise", missing_policy="raise")
    except DataValidationError as error:
        raise DataDownloadError(
            f"{ticker}: provider data could not be normalized: {error}"
        ) from error


def _cache_stem(
    ticker: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
    auto_adjust: bool,
) -> str:
    safe_interval = re.sub(r"[^A-Za-z0-9_-]", "-", interval)
    return f"{ticker}_{start:%Y%m%d}_{end:%Y%m%d}_{safe_interval}_adjusted-{int(auto_adjust)}"


def _provenance(
    ticker: str,
    frame: pd.DataFrame,
    *,
    source: str,
    start: pd.Timestamp,
    end: pd.Timestamp,
    interval: str,
    auto_adjust: bool,
    retrieved_at: datetime,
    cache_path: Path | None = None,
) -> DataProvenance:
    return DataProvenance(
        ticker=ticker,
        source=source,
        requested_start=start.date().isoformat(),
        requested_end=end.date().isoformat(),
        actual_start=frame.index.min().date().isoformat(),
        actual_end=frame.index.max().date().isoformat(),
        retrieved_at_utc=retrieved_at.astimezone(timezone.utc).isoformat(),
        interval=interval,
        auto_adjust=auto_adjust,
        observations=len(frame),
        pandas_version=pd.__version__,
        yfinance_version=yf.__version__,
        cache_path=str(cache_path) if cache_path else None,
    )


def _atomic_cache_write(
    frame: pd.DataFrame,
    metadata: DataProvenance,
    csv_path: Path,
) -> None:
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path = csv_path.with_suffix(".metadata.json")
    temp_csv = csv_path.with_suffix(".csv.tmp")
    temp_metadata = metadata_path.with_suffix(".json.tmp")
    frame.to_csv(temp_csv, index_label="Date")
    temp_metadata.write_text(json.dumps(asdict(metadata), indent=2) + "\n", encoding="utf-8")
    temp_csv.replace(csv_path)
    temp_metadata.replace(metadata_path)


def download_stock_data(
    tickers: str | Iterable[str],
    start_date: str,
    end_date: str,
    *,
    interval: str = "1d",
    auto_adjust: bool = False,
    cache_dir: str | Path | None = None,
    use_cache: bool = True,
    refresh_cache: bool = False,
    minimum_observations: int = 1,
    allow_partial: bool = False,
    downloader: TickerDownloader = yf.download,
) -> DownloadResult:
    """Download and validate one or more tickers without silent substitution.

    Each symbol is requested separately so partial failures can be identified.
    With ``allow_partial=False`` (default), any failed ticker raises an error.
    Set it to true only when the caller explicitly accepts excluding failures.
    """
    symbols = validate_tickers(tickers)
    start, end = validate_date_range(start_date, end_date)
    if minimum_observations < 1:
        raise ConfigurationError("minimum_observations must be positive.")
    if not interval:
        raise ConfigurationError("interval cannot be empty.")

    cache_root = Path(cache_dir) if cache_dir is not None else None
    data: dict[str, pd.DataFrame] = {}
    metadata: dict[str, DataProvenance] = {}
    failures: dict[str, str] = {}

    for ticker in symbols:
        cache_path = None
        if cache_root is not None:
            cache_path = (
                cache_root / f"{_cache_stem(ticker, start, end, interval, auto_adjust)}.csv"
            )

        try:
            if use_cache and not refresh_cache and cache_path and cache_path.exists():
                frame = normalize_stock_data(
                    pd.read_csv(cache_path), duplicate_policy="raise", missing_policy="raise"
                )
                retrieved_at = datetime.fromtimestamp(cache_path.stat().st_mtime, tz=timezone.utc)
                source = "local cache"
            else:
                retrieved_at = datetime.now(timezone.utc)
                try:
                    raw = downloader(
                        ticker,
                        start=start.date().isoformat(),
                        end=end.date().isoformat(),
                        interval=interval,
                        auto_adjust=auto_adjust,
                        actions=False,
                        progress=False,
                        threads=False,
                        multi_level_index=False,
                        timeout=20,
                    )
                except Exception as error:
                    raise DataDownloadError(
                        f"{ticker}: market-data request failed ({type(error).__name__}: {error}). "
                        "Check connectivity, provider availability, rate limits, and the ticker."
                    ) from error
                frame = normalize_download_response(raw, ticker)
                source = "Yahoo Finance via yfinance"

            validate_stock_data(
                frame,
                ticker=ticker,
                minimum_observations=minimum_observations,
                raise_on_error=True,
            )
            item_metadata = _provenance(
                ticker,
                frame,
                source=source,
                start=start,
                end=end,
                interval=interval,
                auto_adjust=auto_adjust,
                retrieved_at=retrieved_at,
                cache_path=cache_path,
            )
            if source != "local cache" and use_cache and cache_path:
                _atomic_cache_write(frame, item_metadata, cache_path)
            data[ticker] = frame
            metadata[ticker] = item_metadata
        except (DataDownloadError, DataValidationError, OSError, ValueError) as error:
            failures[ticker] = str(error)

    if failures and (not allow_partial or not data):
        details = " | ".join(f"{ticker}: {message}" for ticker, message in failures.items())
        action = (
            "Retry later, correct the symbols/dates, clear the relevant cache, or explicitly "
            "set allow_partial=True to analyze only successful tickers."
        )
        raise DataDownloadError(f"One or more downloads failed. {details}. {action}")

    return DownloadResult(data=data, metadata=metadata, failures=failures)


def load_local_stock_data(
    paths: Mapping[str, str | Path],
    *,
    start_date: str,
    end_date: str,
    interval: str = "1d",
    auto_adjust: bool = False,
    minimum_observations: int = 1,
    source_label: str = "explicit local snapshot",
) -> DownloadResult:
    """Load explicitly selected snapshots; this is never an automatic fallback."""
    symbols = validate_tickers(paths.keys())
    start, end = validate_date_range(start_date, end_date)
    data: dict[str, pd.DataFrame] = {}
    metadata: dict[str, DataProvenance] = {}
    failures: dict[str, str] = {}

    for ticker in symbols:
        path = Path(paths[ticker])
        try:
            if not path.exists():
                raise DataDownloadError(f"{ticker}: local file does not exist: {path}")
            frame = normalize_stock_data(
                pd.read_csv(path), duplicate_policy="raise", missing_policy="raise"
            )
            # Respect the configured interval without inventing boundary observations.
            frame = frame.loc[(frame.index >= start) & (frame.index < end)].copy()
            validate_stock_data(
                frame,
                ticker=ticker,
                minimum_observations=minimum_observations,
                raise_on_error=True,
            )
            retrieved_at = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
            data[ticker] = frame
            metadata[ticker] = _provenance(
                ticker,
                frame,
                source=source_label,
                start=start,
                end=end,
                interval=interval,
                auto_adjust=auto_adjust,
                retrieved_at=retrieved_at,
                cache_path=path,
            )
        except (DataDownloadError, DataValidationError, OSError, ValueError) as error:
            failures[ticker] = str(error)

    if failures:
        details = " | ".join(f"{ticker}: {message}" for ticker, message in failures.items())
        raise DataDownloadError(f"Could not load the requested local snapshots. {details}")
    return DownloadResult(data=data, metadata=metadata, failures={})
