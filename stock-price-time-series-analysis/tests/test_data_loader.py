from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from stock_analysis.data_loader import download_stock_data, validate_date_range, validate_tickers
from stock_analysis.exceptions import ConfigurationError, DataDownloadError


def test_ticker_and_date_validation() -> None:
    assert validate_tickers([" aapl ", "MSFT", "AAPL"]) == ("AAPL", "MSFT")
    with pytest.raises(ConfigurationError, match="Invalid ticker"):
        validate_tickers(["bad ticker!"])
    with pytest.raises(ConfigurationError, match="later"):
        validate_date_range("2024-02-01", "2024-01-01")


def test_successful_regular_response(daily_ohlcv: pd.DataFrame) -> None:
    def fake_download(ticker: str, **_: object) -> pd.DataFrame:
        assert ticker == "AAPL"
        return daily_ohlcv

    result = download_stock_data(
        ["AAPL"],
        "2024-01-01",
        "2025-01-01",
        use_cache=False,
        minimum_observations=200,
        downloader=fake_download,
    )
    assert result.successful_tickers == ("AAPL",)
    assert result.metadata["AAPL"].source == "Yahoo Finance via yfinance"
    assert isinstance(result.data["AAPL"].index, pd.DatetimeIndex)


def test_multiindex_field_ticker_response(daily_ohlcv: pd.DataFrame) -> None:
    raw = daily_ohlcv.copy()
    raw.columns = pd.MultiIndex.from_product([raw.columns, ["AAPL"]])

    result = download_stock_data(
        "AAPL",
        "2024-01-01",
        "2025-01-01",
        use_cache=False,
        downloader=lambda *_args, **_kwargs: raw,
    )
    assert list(result.data["AAPL"].columns[:5]) == ["Open", "High", "Low", "Close", "Adj Close"]


def test_multiindex_ticker_field_response(daily_ohlcv: pd.DataFrame) -> None:
    raw = daily_ohlcv.copy()
    raw.columns = pd.MultiIndex.from_product([["AAPL"], raw.columns])
    result = download_stock_data(
        "AAPL",
        "2024-01-01",
        "2025-01-01",
        use_cache=False,
        downloader=lambda *_args, **_kwargs: raw,
    )
    assert len(result.data["AAPL"]) == len(daily_ohlcv)


def test_unexpected_multiindex_mapping_is_rejected(daily_ohlcv: pd.DataFrame) -> None:
    raw = daily_ohlcv.copy()
    raw.columns = pd.MultiIndex.from_product([raw.columns, ["WRONG"]])
    with pytest.raises(DataDownloadError, match="could not map"):
        download_stock_data(
            "AAPL",
            "2024-01-01",
            "2025-01-01",
            use_cache=False,
            downloader=lambda *_args, **_kwargs: raw,
        )


def test_empty_and_network_failures_are_actionable() -> None:
    with pytest.raises(DataDownloadError, match="no observations"):
        download_stock_data(
            "AAPL",
            "2024-01-01",
            "2025-01-01",
            use_cache=False,
            downloader=lambda *_args, **_kwargs: pd.DataFrame(),
        )

    def network_failure(*_args: object, **_kwargs: object) -> pd.DataFrame:
        raise TimeoutError("provider timed out")

    with pytest.raises(DataDownloadError, match="connectivity"):
        download_stock_data(
            "AAPL",
            "2024-01-01",
            "2025-01-01",
            use_cache=False,
            downloader=network_failure,
        )


def test_partial_failures_require_explicit_opt_in(daily_ohlcv: pd.DataFrame) -> None:
    def partial(ticker: str, **_: object) -> pd.DataFrame:
        return daily_ohlcv if ticker == "AAPL" else pd.DataFrame()

    with pytest.raises(DataDownloadError, match="allow_partial=True"):
        download_stock_data(
            ["AAPL", "INVALID"],
            "2024-01-01",
            "2025-01-01",
            use_cache=False,
            downloader=partial,
        )
    result = download_stock_data(
        ["AAPL", "INVALID"],
        "2024-01-01",
        "2025-01-01",
        use_cache=False,
        allow_partial=True,
        downloader=partial,
    )
    assert result.successful_tickers == ("AAPL",)
    assert "INVALID" in result.failures


def test_cache_avoids_second_request(daily_ohlcv: pd.DataFrame, tmp_path: Path) -> None:
    calls = 0

    def fake_download(*_args: object, **_kwargs: object) -> pd.DataFrame:
        nonlocal calls
        calls += 1
        return daily_ohlcv

    kwargs = {
        "tickers": "AAPL",
        "start_date": "2024-01-01",
        "end_date": "2025-01-01",
        "cache_dir": tmp_path,
        "downloader": fake_download,
    }
    download_stock_data(**kwargs)
    second = download_stock_data(**kwargs)
    assert calls == 1
    assert second.metadata["AAPL"].source == "local cache"


def test_refresh_cache_requests_again(daily_ohlcv: pd.DataFrame, tmp_path: Path) -> None:
    calls = 0

    def fake_download(*_args: object, **_kwargs: object) -> pd.DataFrame:
        nonlocal calls
        calls += 1
        return daily_ohlcv

    download_stock_data(
        "AAPL", "2024-01-01", "2025-01-01", cache_dir=tmp_path, downloader=fake_download
    )
    download_stock_data(
        "AAPL",
        "2024-01-01",
        "2025-01-01",
        cache_dir=tmp_path,
        refresh_cache=True,
        downloader=fake_download,
    )
    assert calls == 2
