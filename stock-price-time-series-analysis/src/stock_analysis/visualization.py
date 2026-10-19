"""Consistent, publication-quality Matplotlib figures for the analysis."""

from __future__ import annotations

from collections.abc import Mapping
from pathlib import Path

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.figure import Figure
from matplotlib.ticker import FuncFormatter, PercentFormatter

from .metrics import calculate_cumulative_performance
from .preprocessing import align_common_dates

DEFAULT_COLORS = (
    "#2563EB",
    "#D97706",
    "#059669",
    "#7C3AED",
    "#DC2626",
    "#0891B2",
)


def configure_matplotlib() -> None:
    plt.style.use("seaborn-v0_8-whitegrid")
    plt.rcParams.update(
        {
            "figure.figsize": (12, 6),
            "figure.dpi": 110,
            "axes.titleweight": "bold",
            "axes.titlesize": 13,
            "axes.labelsize": 10,
            "axes.spines.top": False,
            "axes.spines.right": False,
            "legend.frameon": False,
            "font.size": 10,
        }
    )


def ticker_colors(tickers: list[str] | tuple[str, ...]) -> dict[str, str]:
    return {
        ticker: DEFAULT_COLORS[index % len(DEFAULT_COLORS)] for index, ticker in enumerate(tickers)
    }


def _format_date_axis(ax: plt.Axes) -> None:
    locator = mdates.AutoDateLocator(minticks=4, maxticks=9)
    ax.xaxis.set_major_locator(locator)
    ax.xaxis.set_major_formatter(mdates.ConciseDateFormatter(locator))


def _price_formatter(value: float, _: int) -> str:
    return f"${value:,.0f}"


def plot_individual_prices(
    data: Mapping[str, pd.DataFrame],
    *,
    price_column: str = "Close",
    price_basis: str = "closing price",
) -> dict[str, Figure]:
    colors = ticker_colors(tuple(data))
    figures: dict[str, Figure] = {}
    for ticker, frame in data.items():
        fig, ax = plt.subplots()
        ax.plot(frame.index, frame[price_column], color=colors[ticker], linewidth=1.6, label=ticker)
        ax.set(
            title=f"{ticker} daily {price_basis}",
            xlabel="Date",
            ylabel="Price (USD per share)",
        )
        ax.yaxis.set_major_formatter(FuncFormatter(_price_formatter))
        _format_date_axis(ax)
        ax.legend()
        fig.text(
            0.01, 0.01, "Source: configured market-data input; daily observations.", fontsize=8
        )
        fig.tight_layout(rect=(0, 0.03, 1, 1))
        figures[ticker] = fig
    return figures


def plot_comparative_prices(
    data: Mapping[str, pd.DataFrame],
    *,
    price_column: str = "Close",
) -> Figure:
    aligned = align_common_dates(data, column=price_column)
    colors = ticker_colors(tuple(aligned.columns))
    fig, ax = plt.subplots()
    for ticker in aligned:
        ax.plot(aligned.index, aligned[ticker], label=ticker, color=colors[ticker], linewidth=1.6)
    ax.set(
        title="Nominal closing prices on common observation dates",
        xlabel="Date",
        ylabel="Price (USD per share)",
    )
    ax.yaxis.set_major_formatter(FuncFormatter(_price_formatter))
    _format_date_axis(ax)
    ax.legend(ncols=min(4, len(aligned.columns)))
    fig.text(
        0.01,
        0.01,
        "Nominal share prices are not directly comparable measures of return.",
        fontsize=8,
    )
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_normalized_performance(
    data: Mapping[str, pd.DataFrame],
    *,
    price_column: str = "Close",
) -> Figure:
    aligned = align_common_dates(data, column=price_column)
    normalized = calculate_cumulative_performance(aligned)
    colors = ticker_colors(tuple(normalized.columns))
    fig, ax = plt.subplots()
    for ticker in normalized:
        ax.plot(
            normalized.index, normalized[ticker], label=ticker, color=colors[ticker], linewidth=1.9
        )
    ax.axhline(100, color="#64748B", linestyle="--", linewidth=1)
    ax.set(
        title="Common-date price performance (first shared close = 100)",
        xlabel="Date",
        ylabel="Price index",
    )
    _format_date_axis(ax)
    ax.legend(ncols=min(4, len(normalized.columns)))
    fig.text(
        0.01,
        0.01,
        "Price-only comparison; this is not a complete portfolio or total-return measure.",
        fontsize=8,
    )
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_frequency_comparison(
    ticker: str,
    daily: pd.DataFrame,
    weekly: pd.DataFrame,
    monthly: pd.DataFrame,
    *,
    price_column: str = "Close",
) -> Figure:
    fig, axes = plt.subplots(3, 1, figsize=(12, 10), sharex=True)
    layers = (
        ("Daily", daily),
        ("Weekly (Friday-ending)", weekly),
        ("Monthly (month-end)", monthly),
    )
    colors = ("#94A3B8", "#2563EB", "#D97706")
    for ax, (label, frame), color in zip(axes, layers, colors, strict=True):
        ax.plot(frame.index, frame[price_column], color=color, linewidth=1.4, label=label)
        ax.set_ylabel("USD/share")
        ax.yaxis.set_major_formatter(FuncFormatter(_price_formatter))
        ax.legend(loc="upper left")
    axes[0].set_title(f"{ticker}: daily, weekly, and monthly closing observations", loc="left")
    axes[-1].set_xlabel("Date")
    _format_date_axis(axes[-1])
    fig.text(
        0.01, 0.01, "Weekly/monthly close is the last observed close in each period.", fontsize=8
    )
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_moving_averages(
    ticker: str,
    frame: pd.DataFrame,
    *,
    price_column: str = "Close",
    windows: tuple[int, ...] = (20, 200),
) -> Figure:
    fig, ax = plt.subplots()
    ax.plot(
        frame.index,
        frame[price_column],
        color="#64748B",
        alpha=0.65,
        linewidth=1,
        label=price_column,
    )
    average_colors = ("#2563EB", "#DC2626", "#059669")
    for index, window in enumerate(windows):
        column = f"SMA_{window}"
        if column not in frame:
            raise KeyError(f"Missing moving-average column {column}.")
        ax.plot(
            frame.index,
            frame[column],
            color=average_colors[index % len(average_colors)],
            linewidth=1.8,
            label=f"{window}-session SMA",
        )
    ax.set(
        title=f"{ticker} closing price with trailing moving averages",
        xlabel="Date",
        ylabel="Price (USD per share)",
    )
    ax.yaxis.set_major_formatter(FuncFormatter(_price_formatter))
    _format_date_axis(ax)
    ax.legend(ncols=min(3, len(windows) + 1))
    fig.text(
        0.01,
        0.01,
        "Moving averages are lagging descriptions, not forecasts or trading advice.",
        fontsize=8,
    )
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_volume_comparison(
    data: Mapping[str, pd.DataFrame],
    weekly: Mapping[str, pd.DataFrame],
    *,
    rolling_window: int = 20,
) -> Figure:
    aligned = pd.concat(
        {ticker: frame["Volume"] for ticker, frame in data.items()}, axis=1, join="inner"
    ).dropna()
    normalized = aligned.divide(aligned.mean())
    colors = ticker_colors(tuple(aligned.columns))
    fig, axes = plt.subplots(3, 1, figsize=(12, 11), sharex=False)

    for ticker in aligned:
        axes[0].plot(
            aligned.index,
            aligned[ticker] / 1_000_000,
            color=colors[ticker],
            alpha=0.22,
            linewidth=0.7,
        )
        axes[0].plot(
            aligned.index,
            aligned[ticker].rolling(rolling_window, min_periods=rolling_window).mean() / 1_000_000,
            color=colors[ticker],
            linewidth=1.5,
            label=f"{ticker} {rolling_window}-session mean",
        )
        axes[1].plot(
            normalized.index,
            normalized[ticker],
            color=colors[ticker],
            linewidth=1.2,
            label=ticker,
        )
        axes[2].plot(
            weekly[ticker].index,
            weekly[ticker]["Volume"] / 1_000_000,
            color=colors[ticker],
            linewidth=1.2,
            label=ticker,
        )

    axes[0].set(title="Daily share volume and rolling mean", ylabel="Shares (millions)")
    axes[1].axhline(1, color="#64748B", linestyle="--", linewidth=1)
    axes[1].set(
        title="Daily volume relative to each ticker's own sample mean",
        ylabel="Multiple of own mean",
    )
    axes[2].set(
        title="Friday-ending weekly total share volume", xlabel="Date", ylabel="Shares (millions)"
    )
    for ax in axes:
        _format_date_axis(ax)
        ax.legend(ncols=min(4, len(aligned.columns)))
    fig.text(
        0.01,
        0.01,
        "Share volume is not company size or investor intent; approximate turnover requires price × volume.",
        fontsize=8,
    )
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_rolling_volatility(
    volatility: Mapping[str, pd.Series],
    *,
    window: int,
) -> Figure:
    colors = ticker_colors(tuple(volatility))
    fig, ax = plt.subplots()
    for ticker, series in volatility.items():
        ax.plot(series.index, series, color=colors[ticker], linewidth=1.4, label=ticker)
    ax.set(
        title=f"{window}-session rolling annualized historical volatility",
        xlabel="Date",
        ylabel="Annualized standard deviation",
    )
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    _format_date_axis(ax)
    ax.legend()
    fig.text(
        0.01,
        0.01,
        "Annualized with √252; historical variability does not predict future risk.",
        fontsize=8,
    )
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_drawdowns(drawdowns: Mapping[str, pd.Series]) -> Figure:
    """Plot declines from each ticker's running peak on common date axes."""
    colors = ticker_colors(tuple(drawdowns))
    fig, ax = plt.subplots()
    for ticker, series in drawdowns.items():
        ax.plot(series.index, series, color=colors[ticker], linewidth=1.4, label=ticker)
        ax.fill_between(series.index, series, 0, color=colors[ticker], alpha=0.08)
    ax.axhline(0, color="#64748B", linewidth=1)
    ax.set(
        title="Historical drawdown from each running price peak",
        xlabel="Date",
        ylabel="Drawdown",
    )
    ax.yaxis.set_major_formatter(PercentFormatter(1.0))
    _format_date_axis(ax)
    ax.legend()
    fig.text(0.01, 0.01, "Maximum drawdown depends on the selected sample window.", fontsize=8)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def plot_return_correlation(correlation: pd.DataFrame) -> Figure:
    fig, ax = plt.subplots(figsize=(6.5, 5.5))
    image = ax.imshow(correlation, vmin=-1, vmax=1, cmap="RdBu_r")
    labels = correlation.columns.tolist()
    ax.set_xticks(range(len(labels)), labels=labels)
    ax.set_yticks(range(len(labels)), labels=labels)
    for row in range(len(labels)):
        for column in range(len(labels)):
            ax.text(column, row, f"{correlation.iloc[row, column]:.2f}", ha="center", va="center")
    ax.set_title("Daily return correlation on common dates")
    fig.colorbar(image, ax=ax, label="Pearson correlation")
    fig.text(0.01, 0.01, "Historical association is not causation and may not persist.", fontsize=8)
    fig.tight_layout(rect=(0, 0.03, 1, 1))
    return fig


def save_figure(figure: Figure, path: str | Path, *, dpi: int = 160) -> Path:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(target, dpi=dpi, bbox_inches="tight", facecolor="white")
    return target
