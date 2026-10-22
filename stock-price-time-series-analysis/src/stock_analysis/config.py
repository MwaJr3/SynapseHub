"""Central, validated configuration for downloads, analysis, and exports."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import date
from pathlib import Path

import pandas as pd

from .exceptions import ConfigurationError

PROJECT_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class AnalysisConfig:
    """Settings shared by the notebook and reusable analysis functions.

    ``start_date`` and ``end_date`` describe the requested download period.
    The provider treats the end date as exclusive. ``display_start`` can hide
    warm-up rows while retaining enough earlier data for a 200-session average.
    """

    tickers: tuple[str, ...] = ("AAPL", "MSFT")
    start_date: str = "2019-01-01"
    end_date: str = "2026-09-01"
    display_start: str | None = None
    interval: str = "1d"
    auto_adjust: bool = False
    price_field: str = "Close"
    weekly_rule: str = "W-FRI"
    monthly_rule: str = "ME"
    moving_average_windows: tuple[int, ...] = (20, 200)
    volatility_window: int = 20
    annualization_factor: int = 252
    minimum_observations: int = 200
    cache_enabled: bool = True
    refresh_cache: bool = False
    cache_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "data" / "cache")
    processed_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "data" / "processed")
    output_dir: Path = field(default_factory=lambda: PROJECT_ROOT / "outputs")
    figure_dpi: int = 160

    def __post_init__(self) -> None:
        tickers = tuple(ticker.strip().upper() for ticker in self.tickers if ticker.strip())
        if not tickers:
            raise ConfigurationError("Configure at least one ticker symbol.")
        if len(tickers) != len(set(tickers)):
            raise ConfigurationError("Ticker symbols must be unique.")
        object.__setattr__(self, "tickers", tickers)

        start = pd.Timestamp(self.start_date)
        end = pd.Timestamp(self.end_date)
        if pd.isna(start) or pd.isna(end):
            raise ConfigurationError("Start and end dates must be valid dates.")
        if end <= start:
            raise ConfigurationError("end_date must be later than start_date.")
        if self.display_start and pd.Timestamp(self.display_start) < start:
            raise ConfigurationError("display_start cannot be earlier than start_date.")
        if self.display_start and pd.Timestamp(self.display_start) >= end:
            raise ConfigurationError("display_start must be earlier than end_date.")
        if not self.interval:
            raise ConfigurationError("interval cannot be empty.")
        if self.price_field not in {"Close", "Adj Close"}:
            raise ConfigurationError("price_field must be 'Close' or 'Adj Close'.")
        if self.auto_adjust and self.price_field == "Adj Close":
            raise ConfigurationError(
                "Adj Close is not a separate field when auto_adjust=True; use price_field='Close'."
            )
        if any(window < 2 for window in self.moving_average_windows):
            raise ConfigurationError("Moving-average windows must be at least 2 observations.")
        if self.volatility_window < 2:
            raise ConfigurationError("volatility_window must be at least 2.")
        if self.annualization_factor <= 0 or self.minimum_observations <= 0:
            raise ConfigurationError("Annualization and observation counts must be positive.")
        if self.figure_dpi < 72:
            raise ConfigurationError("figure_dpi must be at least 72.")

    @property
    def price_basis(self) -> str:
        if self.auto_adjust:
            return "provider-adjusted OHLC prices (auto_adjust=True)"
        if self.price_field == "Adj Close":
            return "adjusted closing price"
        return "unadjusted closing price"

    @property
    def run_label(self) -> str:
        ticker_label = "-".join(self.tickers).lower()
        start = pd.Timestamp(self.start_date).strftime("%Y%m%d")
        end = pd.Timestamp(self.end_date).strftime("%Y%m%d")
        return f"{ticker_label}_{start}_{end}"

    @classmethod
    def trailing_years(
        cls,
        years: int,
        *,
        end_date: str | date,
        tickers: tuple[str, ...] = ("AAPL", "MSFT"),
        **kwargs: object,
    ) -> AnalysisConfig:
        """Construct a one-, three-, five-, or custom-year configuration."""
        if years <= 0:
            raise ConfigurationError("years must be positive.")
        end = pd.Timestamp(end_date)
        start = end - pd.DateOffset(years=years)
        return cls(
            tickers=tickers,
            start_date=start.strftime("%Y-%m-%d"),
            end_date=end.strftime("%Y-%m-%d"),
            **kwargs,
        )

    def with_updates(self, **changes: object) -> AnalysisConfig:
        """Return a validated copy, useful for notebook experimentation."""
        return replace(self, **changes)
